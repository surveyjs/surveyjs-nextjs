// Both relays, attached to a plain http.Server as server.ts attaches them to the custom server: init fields, saving
// once, late joiners, presence, refused connections, and frames that would stop a process that didn't guard its
// handlers. Demo mode's sandbox room keys are in demo-mode.test.ts.
import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { socket, startApp, startRelays, type Message } from "./helpers.ts";

const app = await startApp();
const relays = await startRelays();
after(async () => { await relays.stop(); app.stop(); });

const open = async (path: string, cookie = "demo_user=alice") => {
  const s = socket(relays.url + path, cookie);
  await s.opened;
  return s;
};
const refused = async (path: string, cookie: string) => {
  const s = socket(relays.url + path, cookie);
  const event = await s.closed;
  return s.messages.length === 0 && event.code !== 1000;
};
const sheets = () => app.db().prepare("SELECT id, data FROM responses WHERE form_id = 'job-sheet' ORDER BY id").all() as { id: number; data: string }[];
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

test("fill: init carries every field, seeded from the saved job sheet", async () => {
  const [sheet] = sheets();
  const a = await open(`/ws/rooms/${sheet.id}?name=${encodeURIComponent("  Dispatcher (Alice Martin) with a very long name  ")}`);
  const init = await a.next("init");
  assert.deepEqual(Object.keys(init).sort(), ["clientId", "colorIndex", "name", "peers", "responseId", "seed", "sessionId", "type", "values"]);
  assert.equal(init.name, "Dispatcher (Alice Martin) with a");
  assert.match(String(init.sessionId), /^[0-9a-f]{32}$/);
  assert.equal(init.responseId, null);
  assert.deepEqual(init.values, JSON.parse(sheet.data));
  const seed = init.seed as { pages?: unknown; elements?: unknown };
  assert.ok(Array.isArray(seed.pages ?? seed.elements));
  await a.close();
});

test("fill: two clients completing at once save one row; both get the same id; a late joiner gets the responseId", async () => {
  const before = sheets().length;
  const a = await open("/ws/rooms/new-room?name=Ann");
  const b = await open("/ws/rooms/new-room?name=Ben");
  const initA = await a.next("init");
  await b.next("init");
  a.send({ type: "value", key: "q1", value: "draft" });
  assert.deepEqual(await b.next("value"), { type: "value", from: initA.clientId, key: "q1", value: "draft" });
  a.send({ type: "complete", data: { q1: "done" } });
  b.send({ type: "complete", data: { q1: "done" } });
  const [ca, cb] = await Promise.all([a.next("completed"), b.next("completed")]);
  assert.equal(ca.id, cb.id);
  assert.equal(sheets().length, before + 1);
  a.send({ type: "value", key: "q1", value: "after completing" });
  await wait(150);
  assert.ok(!b.messages.some((m) => m.type === "value"), "values after completing are ignored");
  const c = await open("/ws/rooms/new-room?name=Cat");
  const init = await c.next("init");
  assert.equal(init.responseId, ca.id);
  assert.deepEqual(init.values, { q1: "done" });
  for (const s of [a, b, c]) await s.close();
});

test("fill: a save that fails sends save-error to the sender only, and the room can try again", async (t) => {
  const quiet = mock.method(console, "error", () => {});
  t.after(() => quiet.mock.restore());
  const a = await open("/ws/rooms/fail-room?name=Ann");
  const b = await open("/ws/rooms/fail-room?name=Ben");
  await a.next("init");
  await b.next("init");
  app.db().exec("ALTER TABLE responses RENAME TO responses_away");
  try {
    a.send({ type: "complete", data: { q1: "done" } });
    assert.deepEqual(await a.next("save-error"), { type: "save-error", error: "Couldn't save the job sheet. Please try again." });
  } finally {
    app.db().exec("ALTER TABLE responses_away RENAME TO responses");
  }
  await wait(100);
  assert.ok(!b.messages.some((m) => m.type === "save-error" || m.type === "completed"));
  a.send({ type: "complete", data: { q1: "done" } });
  assert.equal(typeof (await b.next("completed")).id, "number");
  for (const s of [a, b]) await s.close();
});

test("fill: leaving sends peer-left; presence is forwarded as peer with the sender's name", async () => {
  const a = await open("/ws/rooms/presence-room?name=Ann");
  const b = await open("/ws/rooms/presence-room?name=Ben");
  const initA = await a.next("init");
  await b.next("init");
  a.send({ type: "presence", state: { question: "q1" } });
  const peer = await b.next("peer");
  assert.deepEqual((peer.peer as Message).name, "Ann");
  assert.equal(peer.retain, true);
  await a.close();
  assert.equal((await b.next("peer-left")).clientId, initA.clientId);
  await b.close();
});

test("edit: init then presence-sync, records in order, presence-leave; Bob and signed-out connections are refused", async () => {
  const a = await open("/ws/forms/support-team?name=Ann");
  const initA = await a.next("init");
  assert.deepEqual(Object.keys(initA).sort(), ["clientId", "color", "colorIndex", "log", "seed", "type"]);
  assert.equal((initA.seed as { title?: unknown }).title !== undefined, true);
  a.send({ type: "presence", state: { tab: "designer" } });
  await wait(100);
  const b = await open("/ws/forms/support-team?name=Ben");
  assert.equal((await b.next(() => true)).type, "init");
  const sync = await b.next(() => true);
  assert.equal(sync.type, "presence-sync");
  assert.equal((sync.peers as Message[])[0].clientId, initA.clientId);
  const records = [{ seq: 1, payload: {} }, { seq: 2, payload: { name: "title" } }];
  for (const record of records) a.send({ type: "append", payload: record });
  for (const record of records) assert.deepEqual((await b.next("record")).payload, record);
  await a.close();
  assert.equal((await b.next("presence-leave")).clientId, initA.clientId);
  await b.close();

  assert.ok(await refused("/ws/forms/support-team", "demo_user=bob"), "Bob (a viewer) is refused");
  assert.ok(await refused("/ws/forms/support-team", ""), "signed out is refused");
  assert.ok(await refused("/ws/rooms/1", "demo_user=none"), "signed out is refused on the fill relay too");
  assert.ok(await refused("/ws/other/1", "demo_user=alice"), "an unknown path under /ws/ is refused");
  assert.ok(await refused("/ws/forms/bad%20id", "demo_user=alice"), "an invalid id is refused");
});

test("upgrades outside /ws/ are left to Next.js (its hot reload), not answered by the relays", async () => {
  const { request } = await import("node:http");
  const port = new URL(relays.url.replace("ws:", "http:")).port;
  const outcome = await new Promise<string>((resolve) => {
    const req = request({ host: "127.0.0.1", port, path: "/_next/hmr", headers: { Connection: "Upgrade", Upgrade: "websocket", "Sec-WebSocket-Version": "13", "Sec-WebSocket-Key": "dGhlIHNhbXBsZSBub25jZQ==" } });
    req.on("upgrade", () => resolve("upgraded"));
    req.on("response", (res) => resolve(`answered ${res.statusCode}`));
    req.on("error", () => resolve("error"));
    setTimeout(() => { req.destroy(); resolve("left alone"); }, 300);
    req.end();
  });
  assert.equal(outcome, "left alone");
});

test("malformed frames are ignored and the room keeps working", async () => {
  const a = await open("/ws/rooms/malformed?name=Ann");
  const b = await open("/ws/rooms/malformed?name=Ben");
  await a.next("init");
  await b.next("init");
  for (const frame of ["not json", "[]", "null", '"text"', '{"type":"value"}', '{"type":"complete","data":[1]}', '{"type":"presence"}', '{"type":"nonsense"}']) a.send(frame);
  a.ws.send(new Uint8Array([1, 2, 3]));
  a.send({ type: "value", key: "__proto__", value: { polluted: true } });
  a.send({ type: "value", key: "q1", value: "still here" });
  assert.equal((await b.next((m) => m.type === "value" && m.key === "q1")).value, "still here");
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
  const c = await open("/ws/rooms/malformed?name=Cat");
  const init = await c.next("init");
  const values = init.values as Record<string, unknown>;
  assert.equal(values.q1, "still here");
  assert.deepEqual(Object.getOwnPropertyDescriptor(values, "__proto__")?.value, { polluted: true });
  for (const s of [a, b, c]) await s.close();
});
