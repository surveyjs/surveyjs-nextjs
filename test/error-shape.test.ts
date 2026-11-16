// Every error under /api is JSON { error }, also where Next.js would answer itself: unknown paths (its HTML 404),
// other methods (its empty 405), bodies that aren't JSON or are too big (route handlers have no body parser), and
// exceptions (its empty 500). Repeated query keys never crash a handler.
import assert from "node:assert/strict";
import { after, mock, test } from "node:test";
import { startApp, type TestResponse } from "./helpers.ts";

const app = await startApp({ AI_API_KEY: "test-key" });
const { aiTranslation } = await import("../src/server/integration/ai-translation.ts");
after(() => app.stop());

function assertError(r: TestResponse, status: number, message?: string) {
  assert.equal(r.status, status, r.text);
  assert.match(r.headers.get("content-type") ?? "", /^application\/json/);
  assert.equal(typeof (r.data as { error?: unknown })?.error, "string", r.text);
  if (message) assert.equal((r.data as { error: string }).error, message);
}

test("400: invalid JSON, a text/plain body, a top-level null or string", async () => {
  assertError(await app.request("POST", "/api/responses", { json: "{not json", raw: true }), 400, "The request body is not valid JSON");
  assertError(await app.request("POST", "/api/responses", { body: "formId=contact", headers: { "Content-Type": "text/plain" } }), 400, "Expected { formId, data }");
  assertError(await app.request("POST", "/api/responses", { json: "null", raw: true }), 400, "Expected { formId, data }");
  assertError(await app.request("POST", "/api/responses", { json: '"text"', raw: true }), 400, "Expected { formId, data }");
  assertError(await app.request("POST", "/api/responses", { body: "formId=contact&data=x", headers: { "Content-Type": "application/x-www-form-urlencoded" } }), 400);
});

test("401, 403 and 422 from the examples", async () => {
  assertError(await app.request("GET", "/api/progress/onboarding", { user: null }), 401, "Sign in to load progress");
  assertError(await app.request("PUT", "/api/forms/support", { json: {}, user: "bob" }), 403, "You don't have editor rights: only editors can change forms");
  assertError(await app.request("POST", "/api/files", { body: new FormData() }), 422);
});

test("404 for an unknown /api path, 405 with Allow for a known path and another method", async () => {
  assertError(await app.request("GET", "/api/nothing-here"), 404, "Not found");
  assertError(await app.request("POST", "/api/forms/support/deeper/still"), 404, "Not found");
  const r = await app.request("DELETE", "/api/responses");
  assertError(r, 405, "Method not allowed");
  assert.equal(r.headers.get("allow"), "GET, HEAD, POST");
  assertError(await app.request("PATCH", "/api/forms/support"), 405);
  assert.equal((await app.request("OPTIONS", "/api/translate")).headers.get("allow"), "POST");
});

test("413 for a body over 12 MB, from Content-Length; 415 for a charset other than UTF-8", async () => {
  const big = JSON.stringify({ formId: "contact", data: { a: "x".repeat(12 * 1024 * 1024) } });
  assertError(await app.request("POST", "/api/responses", { json: big, raw: true }), 413, "The request body is too large");
  assertError(await app.request("POST", "/api/responses", { json: "{}", raw: true, headers: { "Content-Type": "application/json; charset=koi8-r" } }), 415);
});

test("413 while reading a body that has no Content-Length", async () => {
  const { route } = await import("../src/server/integration/http.ts");
  const { saveResponse } = await import("../src/server/routes/save-response.ts");
  const chunk = new TextEncoder().encode("x".repeat(1024 * 1024));
  let sent = 0;
  const body = new ReadableStream({ pull(controller) { if (sent++ < 13) controller.enqueue(chunk); else controller.close(); } });
  const req = new Request("http://127.0.0.1/api/responses", { method: "POST", headers: { "Content-Type": "application/json" }, body, duplex: "half" } as RequestInit);
  const r = await route(saveResponse)(req);
  assert.equal(r.status, 413);
  assert.deepEqual(await r.json(), { error: "The request body is too large" });
});

test("multipart without Content-Length answers 411, a batch over 10 files of 5 MB 413-or-422 before it is read", async () => {
  const { route } = await import("../src/server/integration/http.ts");
  const { storeFiles } = await import("../src/server/routes/store-files.ts");
  const form = new FormData();
  form.append("files[]", new Blob(["x"]), "a.png");
  const unsized = new Request("http://127.0.0.1/api/files", { method: "POST", body: form });
  assert.equal(unsized.headers.get("content-length"), null);
  const r = await route(storeFiles)(unsized);
  assert.equal(r.status, 411);
  const huge = new Request("http://127.0.0.1/api/files", { method: "POST", headers: { "Content-Type": "multipart/form-data; boundary=x", "Content-Length": String(60 * 1024 * 1024) }, body: "--x--" });
  assertError({ ...(await (async () => { const res = await route(storeFiles)(huge); return { status: res.status, headers: res.headers, bytes: Buffer.alloc(0), text: "", data: await res.json() }; })()) }, 422, "Upload at most 10 files at a time");
});

test("500 for an exception: logged with its stack, answered without it", async (t) => {
  const error = mock.method(console, "error", () => {});
  t.after(() => error.mock.restore());
  const translate = mock.method(aiTranslation, "translate", async () => {
    throw new TypeError("a bug with a secret in it");
  });
  t.after(() => translate.mock.restore());
  const r = await app.request("POST", "/api/translate", { json: { strings: ["Hi"], from: "en", to: "de" } });
  assertError(r, 500, "Internal server error");
  assert.doesNotMatch(r.text, /secret|stack|at /);
  assert.equal(error.mock.callCount(), 1);
  assert.match(String((error.mock.calls[0].arguments[1] as Error).stack), /a bug with a secret/);
});

test("repeated query keys: the first value counts (URLSearchParams.get), never a 500", async () => {
  for (const path of ["/api/offices?region=europe&region=asia", "/api/customers/exists?email=a&email=b", "/api/shipping?postcode=10115&postcode=1",
    "/api/responses?formId=feedback&formId=x&limit=1&limit=2", "/api/forms/claim?record=1&record=2", "/demo/stored/save-response?id=1&id=2"]) {
    const r = await app.request("GET", path);
    assert.equal(r.status, 200, `${path}: ${r.text}`);
  }
  assert.deepEqual((await app.request("GET", "/api/offices?region=europe&region=asia")).data,
    (await app.request("GET", "/api/offices?region=europe")).data);
  assert.deepEqual((await app.request("GET", "/api/shipping?postcode=10115&postcode=1")).data, { price: 4.9 });
  assert.equal(((await app.request("GET", "/api/responses?formId=feedback&limit=1&limit=2")).data as unknown[]).length, 1);
});

test("/up answers without a database; /shared answers 404 outside its four folders", async () => {
  assert.deepEqual((await app.request("GET", "/up")).data, { status: "ok" });
  for (const path of ["/shared/seed/forms.json", "/shared/contract-tests/run.mjs", "/shared/CONTRACT", "/shared/client/.hidden", "/shared/ui/"]) {
    assert.equal((await app.request("GET", path)).status, 404, path);
  }
  const { sharedFile } = await import("../src/server/demo/shared-files.ts");
  for (const segments of [["..", "package.json"], ["client", "..", "..", "package.json"], ["client", "..", "seed", "forms.json"]]) {
    assert.equal(sharedFile(segments).status, 404, segments.join("/"));
  }
  for (const [path, type] of [["/shared/ui/page-tabs.js", /^text\/javascript/], ["/shared/samples/support-help.svg", /^image\/svg\+xml/],
    ["/shared/ui/fonts/lato/LatoLatin-Bold.woff2", /^font\/woff2/], ["/shared/definitions/dashboard.json", /^application\/json/], ["/shared/ui/theme.css", /^text\/css/]] as const) {
    const r = await app.request("GET", path);
    assert.equal(r.status, 200, path);
    assert.match(r.headers.get("content-type") ?? "", type, path);
  }
});
