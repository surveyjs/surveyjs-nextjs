// DEMO_MODE=true: the visitor sandbox through route(), the demo's 5 MB cap and 20 AI calls, relay rooms per sandbox,
// and pruning, which must close the handles the route handlers opened (Windows can't delete an open file).
import assert from "node:assert/strict";
import { existsSync, readFileSync, utimesSync } from "node:fs";
import { join } from "node:path";
import { after, test } from "node:test";
import { files, PNG, socket, startApp, startRelays } from "./helpers.ts";

const app = await startApp({ DEMO_MODE: "true" });
const relays = await startRelays();
after(async () => { await relays.stop(); app.stop(); });

const HTML = Buffer.from("<!DOCTYPE html><script>alert(1)</script>");
const BIG = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);

test("route() issues demo_sid when it is missing or invalid, HttpOnly, and the handler sees the new sandbox at once", async () => {
  const first = await app.request("POST", "/api/responses", { json: { formId: "contact", data: { a: 1 } } });
  assert.equal(first.status, 201);
  const line = first.headers.getSetCookie().find((l) => l.startsWith("demo_sid="))!;
  assert.match(line, /^demo_sid=[0-9a-f]{32}; Max-Age=2592000; Path=\/; SameSite=Lax; HttpOnly$/);
  const stored = app.sandboxDb().prepare("SELECT data FROM responses WHERE id = ?").get((first.data as { id: number }).id) as { data: string };
  assert.equal(stored.data, '{"a":1}', "saved in the new sandbox, not the shared database");
  assert.equal(app.db().prepare("SELECT id FROM responses WHERE data = '{\"a\":1}'").get(), undefined);
  const again = await app.request("GET", "/demo/stored/save-response");
  assert.equal(again.headers.getSetCookie().length, 0, "a valid demo_sid is kept");
  app.jar.sid = "../../etc/passwd";
  const fresh = await app.request("GET", "/demo/stored/save-response");
  assert.match(fresh.headers.getSetCookie()[0], /^demo_sid=[0-9a-f]{32};/);
});

test("a file over 5 MB answers 413 with the demo's message first; other refusals stay 422", async () => {
  await app.request("GET", "/demo/stored/store-files");
  const big = await app.request("POST", "/api/files", { body: files("files[]", [HTML, "image/png", "page.png"], [BIG, "image/png", "big.png"]) });
  assert.deepEqual([big.status, big.data], [413, { error: "Files over 5 MB are not accepted on the demo" }]);
  const html = await app.request("POST", "/api/files", { body: files("files[]", [PNG, "image/png", "ok.png"], [HTML, "image/png", "page.png"]) });
  assert.equal(html.status, 422);
  const scan = await app.request("POST", "/api/work-orders/extract", { body: files("scan", [BIG, "image/png", "big.png"]) });
  assert.deepEqual([scan.status, scan.data], [413, { error: "Files over 5 MB are not accepted on the demo" }]);
  const ok = await app.request("POST", "/api/files", { body: files("files[]", [PNG, "image/png", "ok.png"]) });
  assert.equal(ok.status, 200);
  assert.ok(existsSync(join(app.config.dataDir, "sandbox", app.jar.sid!, (ok.data as string[])[0])), "stored in the visitor's sandbox");
});

test("429 after 20 AI calls a day", async () => {
  await app.request("GET", "/demo/stored/ai-translation");
  // the earlier scan counted as one call
  for (let i = 0; i < 19; i++) assert.equal((await app.request("POST", "/api/translate", { json: { strings: [] } })).status, 501);
  const r = await app.request("POST", "/api/translate", { json: { strings: [] } });
  assert.deepEqual([r.status, r.data], [429, { error: "The demo allows 20 AI calls per visitor per day" }]);
  assert.equal((await app.request("POST", "/api/work-orders/extract", { body: new FormData() })).status, 429);
});

test("relay room keys are <demo_sid>:<id>, rooms are per sandbox, snapshots are named by the key's hash", async () => {
  const { roomKey, snapshotPath } = await import("../src/server/relay/room-key.ts");
  const mine = app.jar.sid!;
  app.jar.sid = null;
  await app.request("GET", "/demo/stored/fill-together");
  const other = app.jar.sid!;
  app.jar.sid = mine;
  const url = `${relays.url}/ws/rooms/shared-id?name=X`;
  const noSid = socket(url, "demo_user=alice");
  await noSid.closed;
  assert.equal(noSid.messages.length, 0, "no demo_sid: refused");
  const a = socket(url, `demo_sid=${mine}; demo_user=alice`);
  await a.opened;
  await a.next("init");
  a.send({ type: "value", key: "q1", value: "mine" });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const b = socket(url, `demo_sid=${other}; demo_user=alice`);
  await b.opened;
  assert.equal(((await b.next("init")).values as Record<string, unknown>).q1, undefined);
  const path = snapshotPath(roomKey(mine, "shared-id"), "fill");
  assert.ok(existsSync(path));
  assert.equal(JSON.parse(readFileSync(path, "utf8")).values.q1, "mine");
  const panel = await app.request("GET", "/demo/stored/fill-together?room=shared-id");
  assert.equal(((panel.data as Record<string, { values: Record<string, unknown> }>)["relay room"]).values.q1, "mine");
  await a.close();
  await b.close();
});

test("process state: one registry for every module graph, and pruning closes the handles the route handlers opened", async () => {
  // A second copy of the module, as the route handlers' bundle is a second copy of src/server: the same registry
  const first = await import("../src/server/process-state.ts");
  const second = (await import(new URL("../src/server/process-state.ts?second-graph", import.meta.url).href)) as typeof first;
  assert.notEqual(first.processState, second.processState);
  assert.equal(first.processState("databases", () => new Map()), second.processState("databases", () => new Map()));

  // A sandbox the route handlers opened, unused for 25 hours
  app.jar.sid = null;
  await app.request("PUT", "/api/progress/onboarding", { json: { data: { q: 1 } } });
  const sid = app.jar.sid!;
  const database = join(app.config.dataDir, "sandbox", `${sid}.sqlite`);
  const handles = first.processState("databases", () => new Map<string, unknown>());
  assert.ok(handles.has(database), "the route handler's handle is in the shared registry");
  const old = new Date(Date.now() - 25 * 3600 * 1000);
  utimesSync(database, old, old);
  const { prune } = await import("../src/server/demo/sandbox.ts");
  assert.ok(prune() >= 1);
  assert.equal(existsSync(database), false, "the file is gone (it was closed first)");
  assert.equal(existsSync(join(app.config.dataDir, "sandbox", sid)), false);
  assert.equal(handles.has(database), false);
});
