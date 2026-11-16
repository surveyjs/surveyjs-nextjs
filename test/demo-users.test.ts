// The demo users on the API: the cookie is read as it is, and the hooks in auth.ts give Bob's 403 and the signed-out
// 401s. Which user each page signs in as (src/proxy.ts) is checked in e2e/pages.spec.ts, against the running app.
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { startApp } from "./helpers.ts";

const app = await startApp();
after(() => app.stop());

test("Bob's saves answer 403 with the edit-forms message; signed out too", async () => {
  const message = "You don't have editor rights: only editors can change forms";
  for (const user of ["bob", null, "none"]) {
    for (const path of ["/api/forms/support", "/api/variable-presets/support"]) {
      const r = await app.request("PUT", path, { json: [], user });
      assert.deepEqual([r.status, r.data], [403, { error: message }], `${path} as ${user}`);
    }
  }
});

test("progress is per user and answers 401 signed out", async () => {
  for (const [method, message] of [["GET", "Sign in to load progress"], ["PUT", "Sign in to save progress"], ["DELETE", "Sign in to clear progress"]]) {
    const r = await app.request(method, "/api/progress/onboarding", { user: null, json: method === "PUT" ? {} : undefined });
    assert.deepEqual([r.status, r.data], [401, { error: message }]);
  }
  await app.request("PUT", "/api/progress/demo-users", { json: { data: { who: "alice" } } });
  assert.equal((await app.request("GET", "/api/progress/demo-users", { user: "bob" })).text, "null");
  assert.equal((await app.request("GET", "/api/progress/demo-users", { user: "bob" })).headers.get("content-type"), "application/json");
  assert.equal((app.db().prepare("SELECT COUNT(*) AS n FROM progress WHERE key = '1:demo-users'").get() as { n: number }).n, 1);
  assert.equal((await app.request("DELETE", "/api/progress/demo-users", { user: "bob" })).status, 204);
  assert.equal((app.db().prepare("SELECT COUNT(*) AS n FROM progress WHERE key = '1:demo-users'").get() as { n: number }).n, 1, "only Bob's own draft");
});

test("an unknown cookie value is signed out on the API", async () => {
  assert.equal((await app.request("GET", "/api/progress/onboarding", { user: "mallory" })).status, 401);
});

test("the claim-request record is looked up among the signed-in customer's claims only", async () => {
  const bobs = app.db().prepare("SELECT id FROM responses WHERE form_id = 'claim' AND data ->> 'customer_email' = 'bob@example.com'").get() as { id: number };
  const asBob = await app.request("GET", `/api/forms/claim-request?record=${bobs.id}`, { user: "bob" });
  assert.equal((asBob.data as { data: { customer_email: string } }).data.customer_email, "bob@example.com");
  const asAlice = await app.request("GET", `/api/forms/claim-request?record=${bobs.id}`);
  assert.equal(asAlice.status, 200);
  assert.deepEqual((asAlice.data as { data: unknown }).data, {});
  assert.deepEqual((asAlice.data as { variables: unknown }).variables, { user: { name: "Alice Martin", plan: "premium" } });
});
