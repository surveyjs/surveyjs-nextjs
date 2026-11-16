// JSON is stored exactly as it arrives: the round-trip document (and a "__proto__" key) through every storing
// handler, read back from SQLite itself, not through the app.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { ROUNDTRIP, socket, startApp, startRelays } from "./helpers.ts";

const app = await startApp();
const relays = await startRelays();
after(async () => { await relays.stop(); app.stop(); });

type Row = Record<string, string | number | null>;
const row = (sql: string, ...params: (string | number)[]): Row => ({ ...(app.db().prepare(sql).get(...params) as Row) });   // node:sqlite rows have no prototype
const id = (data: unknown) => (data as { id: number }).id;

test("save-response stores the round-trip document as it arrived, with an ISO 8601 UTC time without milliseconds", async () => {
  const r = await app.request("POST", "/api/responses", { json: { formId: "contact", data: ROUNDTRIP } });
  assert.equal(r.status, 201);
  const stored = row("SELECT data, created_at FROM responses WHERE id = ?", id(r.data));
  assert.deepEqual(JSON.parse(String(stored.data)), ROUNDTRIP);
  assert.match(String(stored.created_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  assert.match(String(row("SELECT created_at FROM responses WHERE form_id = 'feedback'").created_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
});

test('a "__proto__" key is stored as a key, not lost as a prototype', async () => {
  const body = '{"formId":"contact","data":{"__proto__":{"polluted":true},"constructor":{"prototype":1},"a":1}}';
  const r = await app.request("POST", "/api/responses", { json: body, raw: true });
  assert.equal(r.status, 201);
  assert.equal(row("SELECT data FROM responses WHERE id = ?", id(r.data)).data, '{"__proto__":{"polluted":true},"constructor":{"prototype":1},"a":1}');
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("1.0 becomes 1: JavaScript has one number type (README: Storing JSON exactly as it arrives)", async () => {
  const r = await app.request("POST", "/api/responses", { json: '{"formId":"contact","data":{"n":1.0,"m":1.5}}', raw: true });
  assert.equal(row("SELECT data FROM responses WHERE id = ?", id(r.data)).data, '{"n":1,"m":1.5}');
});

test("an empty JSON body is {}, as Express's parser reads it", async () => {
  assert.equal((await app.request("PUT", "/api/forms/empty-body", { json: "", raw: true })).status, 204);
  assert.equal(row("SELECT json FROM forms WHERE key = 'empty-body'").json, "{}");
});

test("resume-progress, relational-storage, creator-load-save and variable-presets keep the document", async () => {
  const progress = { data: ROUNDTRIP, uiState: { currentPageName: "page2" } };
  assert.equal((await app.request("PUT", "/api/progress/onboarding", { json: progress })).status, 204);
  assert.deepEqual(JSON.parse(String(row("SELECT json FROM progress WHERE key = '1:onboarding'").json)), progress);

  const claim = { ...ROUNDTRIP, customer_email: "x@example.com", amount: 10 };
  const c = await app.request("POST", "/api/claims", { json: { data: claim, definitionVersion: "v1" } });
  assert.equal(c.status, 201);
  assert.deepEqual(JSON.parse(String(row("SELECT data FROM responses WHERE id = ?", id(c.data)).data)), claim);
  assert.deepEqual(row("SELECT customer_email, amount FROM claims WHERE response_id = ?", id(c.data)), { customer_email: "x@example.com", amount: 10 });

  assert.equal((await app.request("PUT", "/api/forms/roundtrip", { json: ROUNDTRIP })).status, 204);
  assert.deepEqual(JSON.parse(String(row("SELECT json FROM forms WHERE key = 'roundtrip'").json)), ROUNDTRIP);

  assert.equal((await app.request("PUT", "/api/variable-presets/roundtrip", { json: [ROUNDTRIP] })).status, 204);
  assert.deepEqual(JSON.parse(String(row("SELECT json FROM variable_presets WHERE key = 'roundtrip'").json)), [ROUNDTRIP]);
});

test("the dashboard returns stored documents as stored, and a definition comes back as .definition", async () => {
  await app.request("POST", "/api/responses", { json: { formId: "roundtrip-dashboard", data: ROUNDTRIP } });
  const r = await app.request("GET", "/api/responses?formId=roundtrip-dashboard");
  assert.equal(r.text, JSON.stringify([ROUNDTRIP]));
  await app.request("PUT", "/api/forms/roundtrip-definition", { json: ROUNDTRIP });
  assert.deepEqual((await app.request("GET", "/api/forms/roundtrip-definition")).data, { definition: ROUNDTRIP, variables: { user: { name: "Alice Martin", plan: "premium" } }, data: {} });
});

test("fill-together's complete stores the job sheet as it arrived", async () => {
  const room = socket(`${relays.url}/ws/rooms/roundtrip?name=Ann`, "demo_user=alice");
  await room.opened;
  await room.next("init");
  room.send({ type: "complete", data: ROUNDTRIP });
  const completed = await room.next("completed");
  assert.deepEqual(JSON.parse(String(row("SELECT data FROM responses WHERE id = ?", completed.id as number).data)), ROUNDTRIP);
  assert.equal(row("SELECT form_id FROM responses WHERE id = ?", completed.id as number).form_id, "job-sheet");
  await room.close();
});
