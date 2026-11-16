// The pages, as the server renders them and as the browser runs them: window.SURVEYJS_PAGE on every example, inline
// JSON that can't end its <script>, Start over on exactly the nine pages, the layout's ids, the demo user each page
// signs in as (src/proxy.ts), /shared's types and 404s (sent as raw paths), https and wss behind a TLS proxy, HTML
// errors for pages, and exactly one non-demo request when save-response saves (Next.js's own requests are demo
// requests). Runs in production mode (e2e:ci) and in development mode (e2e:dev).
import { expect, test, type APIRequestContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import { request as httpRequest } from "node:http";

type Step = { slug: string; title: string; anchor: string; licence: string; page: string; regions: string[]; files: Record<string, string> };
const manifest = JSON.parse(readFileSync("surveyjs-integration.json", "utf8")) as { surveyjsVersion: string; steps: Step[] };
const SLUGS = manifest.steps.map((step) => step.slug);
const START_OVER = ["save-response", "load-definition-variables-data", "resume-progress", "store-files", "choices-from-web", "async-functions",
  "relational-storage", "validate-response", "extract-from-paper"];
const DOCS = "https://surveyjs.io/documentation/backend-integration-nextjs";

const html = async (request: APIRequestContext, path: string, headers: Record<string, string> = {}) => (await request.get(path, { headers })).text();
const pageConfig = (text: string) => JSON.parse(/window\.SURVEYJS_PAGE = (.*?);(?:window\.|<\/script>)/.exec(text)![1]) as Record<string, unknown> & { relay: Record<string, { url: string }>; demoUser: string };

test("every example page renders 200 HTML with its title, canonical link and window.SURVEYJS_PAGE", async ({ request }) => {
  for (const step of manifest.steps) {
    const r = await request.get(step.page);
    expect(r.status(), step.slug).toBe(200);
    expect(r.headers()["content-type"]).toMatch(/^text\/html/);
    const text = await r.text();
    const config = pageConfig(text);
    expect(config.slug).toBe(step.slug);
    expect(config.version).toBe(manifest.surveyjsVersion);
    expect(Object.keys(config.relay)).toEqual(["fill", "edit"]);
    for (const role of Object.keys(step.files).filter((role) => role.startsWith("definition"))) expect(config[role], `${step.slug}: ${role}`).toBeTruthy();
    expect(text).toContain(`<title>${step.title} · SurveyJS + Next.js</title>`);
    expect(text).toMatch(new RegExp(`<link rel="canonical" href="http://[^"]+${step.page}"/>`));
  }
});

test('a "</script>" in a stored definition or a query value can\'t end the inline script', async ({ request, page }) => {
  const definition = { title: "</script><script>window.__pwned = 1</script>", elements: [{ type: "text", name: "q1", title: "\u00e9 & <b>" }] };
  // Store it as Alice through the API, then read the page that inlines the stored work-order form
  const put = await request.put("/api/forms/work-order", { data: definition, headers: { Cookie: "demo_user=alice" } });
  expect(put.status()).toBe(204);
  try {
    const text = await html(request, "/examples/extract-from-paper");
    expect(text).not.toContain("</script><script>window.__pwned");
    expect(text).toContain("\\u003c/script\\u003e\\u003cscript\\u003ewindow.__pwned = 1\\u003c/script\\u003e");
    expect(pageConfig(text).definition).toEqual(definition);
    await page.goto("/examples/extract-from-paper");
    expect(await page.evaluate(() => (window as unknown as { __pwned?: number }).__pwned)).toBeUndefined();
    const record = await html(request, `/examples/fill-together?record=${encodeURIComponent("</script><b>")}`);
    expect(record).toContain('window.SURVEYJS_PAGE.record = "\\u003c/script\\u003e\\u003cb\\u003e";');
  } finally {
    await request.put("/api/forms/work-order", { data: JSON.parse(readFileSync("shared/definitions/extract-from-paper.json", "utf8")), headers: { Cookie: "demo_user=alice" } });
  }
});

test("Start over is on exactly the nine pages, between the other actions and the component", async ({ request }) => {
  for (const slug of SLUGS) {
    const text = await html(request, `/examples/${slug}`);
    expect(text.includes('id="start-over"'), slug).toBe(START_OVER.includes(slug));
    if (START_OVER.includes(slug)) expect(text.indexOf('id="start-over"'), slug).toBeLessThan(text.indexOf('id="component"'));
  }
  expect(await html(request, "/claim")).toContain('id="start-over"');
  expect(await html(request, "/examples/resume-progress")).toMatch(/<button id="start-over" type="button" disabled=""/);
});

test("the layout's ids and templates, one docs link, the licence note and one code section per region", async ({ request }) => {
  for (const step of manifest.steps) {
    const text = await html(request, step.page);
    for (const id of ["page-header", "side-panel", "panel-close", "panel-tabs", "panel-tabs-thumb", "hood", "panel-description", "try", "panel-requests",
      "readouts", "notes", "show-demo-requests", "clear-requests", "requests-empty", "requests", "panel-stored", "stored-updated", "stored", "main-tabs",
      "panel-toggle", "panel-dot", "page-tabs", "panel-demo", "component", "panel-code", "request-row", "stored-section", "note", "requests-count", "stored-dot"]) {
      expect(text.includes(`id="${id}"`), `${step.slug}: #${id}`).toBe(true);
    }
    expect((text.match(/>Documentation<\/a>/g) ?? []).length, step.slug).toBe(1);
    expect(text, step.slug).toContain(`href="${DOCS}#${step.anchor}"`);
    expect(text.includes("require a developer license"), `${step.slug}: the licence note`).toBe(step.licence.startsWith("Commercial"));
    expect((text.match(/<details data-code-section="" open=""/g) ?? []).length, `${step.slug}: one code section per region`).toBe(step.regions.length);
  }
});

test("each page signs in as a user it offers; the switch appears only where the user changes the result", async ({ request }) => {
  const signIn = async (path: string, user: string) => {
    const r = await request.get(path, { headers: { Cookie: `demo_user=${user}` } });
    return { config: pageConfig(await r.text()), cookie: r.headersArray().filter((h) => h.name.toLowerCase() === "set-cookie").map((h) => h.value).find((v) => v.startsWith("demo_user=")) };
  };
  const kept = await signIn("/examples/resume-progress", "bob");
  expect(kept.config.demoUser).toBe("bob");
  expect(kept.cookie).toBeUndefined();
  const reset = await signIn("/examples/save-response", "bob");
  expect(reset.config.demoUser).toBe("alice");
  expect(reset.cookie).toMatch(/^demo_user=alice;/);
  expect(reset.cookie).toMatch(/SameSite=Lax/i);
  expect(reset.cookie).not.toMatch(/HttpOnly/i);   // host.ts writes it back on focus
  expect((await signIn("/examples/creator-load-save", "none")).config.demoUser).toBe("alice");
  expect(await html(request, "/claim", { Cookie: "demo_user=bob" })).toContain('"plan":"basic"');

  for (const [slug, labels] of [
    ["load-definition-variables-data", ["Alice (premium)", "Bob (basic)"]],
    ["resume-progress", ["Alice", "Bob"]],
    ["creator-load-save", ["Alice (can save schemas)", "Bob (cannot save schemas)"]],
  ] as const) {
    const text = await html(request, `/examples/${slug}`);
    expect(text, slug).toContain('id="demo-user"');
    for (const label of labels) expect(text, `${slug}: ${label}`).toMatch(new RegExp(`>${label.replace(/[()]/g, "\\$&")}</option>`));
  }
  for (const slug of ["save-response", "store-files", "dashboard", "variable-presets", "fill-together"]) {
    expect(await html(request, `/examples/${slug}`), slug).not.toContain('id="demo-user"');
  }
});

test("the catalog, the PDF loading page and /claim, in Next.js words", async ({ request }) => {
  const catalog = await html(request, "/");
  expect(catalog).toContain("<title>Next.js Backend Integration · SurveyJS</title>");
  expect(catalog).toContain("Step-by-Step Next.js Backend Integration");
  expect(catalog).toContain("Build a Next.js Backend for");
  expect(catalog).toContain("Learn how to connect SurveyJS components to a Next.js backend using route handlers.");
  expect(catalog).toMatch(/>Next\.js integration guide<\/a>/);
  expect((catalog.match(/>Run Example<\/a>/g) ?? []).length).toBe(18);
  expect(catalog).not.toMatch(/PHP|Laravel|Express|SurveyJS service/);
  expect((catalog.match(/rel="preload" as="font"/g) ?? []).length).toBe(4);
  const loading = await html(request, "/examples/server-pdf/loading");
  expect(loading).toContain("Generating the PDF...");
  expect(loading).toContain("<title>Generating PDF · SurveyJS</title>");
  expect(loading).not.toContain('id="side-panel"');
  const claim = await html(request, "/claim");
  expect(claim).toMatch(/window\.FORM_DEFINITION = \{/);
  expect(claim).toContain('window.FORM_VARIABLES = {"user":{"name":"Alice Martin","plan":"premium"}};');
});

test("no page text names PHP, Laravel, Express, artisan or the SurveyJS service", async ({ request }) => {
  for (const slug of SLUGS) {
    const text = (await html(request, `/examples/${slug}`)).replace(/<pre[\s\S]*?<\/pre>/g, "").replace(/<script[\s\S]*?<\/script>/g, "");
    expect(text, slug).not.toMatch(/\bPHP\b|Laravel|\bExpress\b|\bartisan\b|docker compose|SurveyJS service/);
  }
});

test("X-Forwarded-Proto: https gives https absolute URLs, wss relay URLs and Secure cookies", async ({ request }) => {
  const headers = { "X-Forwarded-Proto": "https", "X-Forwarded-Host": "demo.example.com" };
  const r = await request.get("/examples/fill-together", { headers: { ...headers, Cookie: "demo_user=bob" } });
  const text = await r.text();
  expect(text).toContain('<link rel="canonical" href="https://demo.example.com/examples/fill-together"/>');
  expect(pageConfig(text).relay.fill.url).toBe("wss://demo.example.com");
  expect(pageConfig(text).relay.edit.url).toBe("wss://demo.example.com");
  const cookie = r.headersArray().find((h) => h.name.toLowerCase() === "set-cookie" && h.value.startsWith("demo_user="))?.value;
  expect(cookie).toMatch(/; Secure/);
  expect(await html(request, "/", headers)).toContain('<link rel="canonical" href="https://demo.example.com/"/>');
  const plain = pageConfig(await html(request, "/examples/edit-together"));
  expect(plain.relay.edit.url).toMatch(/^ws:\/\/(127\.0\.0\.1|localhost):\d+$/);
});

test("/shared serves its four folders with their types and nothing else, raw paths included", async ({ request, baseURL }) => {
  for (const [path, type] of [["/shared/ui/page-tabs.js", /^text\/javascript/], ["/shared/client/host.js", /^text\/javascript/],
    ["/shared/samples/support-help.svg", /^image\/svg\+xml/], ["/shared/ui/fonts/lato/LatoLatin-Bold.woff2", /^font\/woff2/],
    ["/shared/definitions/dashboard.json", /^application\/json/], ["/shared/ui/theme.css", /^text\/css/]] as const) {
    const r = await request.get(path);
    expect(r.status(), path).toBe(200);
    expect(r.headers()["content-type"], path).toMatch(type);
  }
  const { hostname, port } = new URL(baseURL!);
  const raw = (path: string) => new Promise<number>((resolve, reject) =>
    httpRequest({ host: hostname, port, path }, (res) => { res.resume(); resolve(res.statusCode ?? 0); }).on("error", reject).end());
  for (const path of ["/shared/seed/forms.json", "/shared/contract-tests/run.mjs", "/shared/%2e%2e/package.json", "/shared/client/../../package.json",
    "/shared/client/%2e%2e/%2e%2e/package.json", "/shared/ui", "/shared/CONTRACT", "/shared/client/.hidden"]) {
    expect(await raw(path), path).toBe(404);
  }
  // A trailing slash gets Next.js's own 308 to the path without it, which answers 404
  expect(await raw("/shared/ui/"), "/shared/ui/").toBe(308);
});

test("pages keep HTML errors: an invalid edit-together form is 400, an unknown example 404", async ({ request }) => {
  const bad = await request.get("/examples/edit-together?form=bad%20id");
  expect(bad.status()).toBe(400);
  expect(bad.headers()["content-type"]).toMatch(/^text\/html/);
  expect(await bad.text()).toContain("Invalid form ID");
  const missing = await request.get("/examples/no-such-example");
  expect(missing.status()).toBe(404);
  expect(missing.headers()["content-type"]).toMatch(/^text\/html/);
  const api = await request.get("/api/no-such-endpoint");
  expect([api.status(), await api.json()]).toEqual([404, { error: "Not found" }]);
});

test("save-response: exactly one non-demo request in the log when the form saves; Next.js's own requests are demo requests", async ({ page }) => {
  await page.goto("/examples/save-response");
  await page.getByRole("textbox", { name: /Your email/ }).fill("one@example.com");
  await page.getByRole("textbox", { name: /How can we help/ }).fill("Exactly one request, please.");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(page.getByText(/Response ID: \d+/)).toBeVisible();
  await page.getByRole("tab", { name: /Requests/ }).click();
  const visible = page.locator("#requests > li:not([hidden])");
  await expect(visible).toHaveCount(1);
  await expect(visible.locator('[data-field="method"]')).toHaveText("POST");
  await expect(visible.locator('[data-field="url"]')).toHaveText("/api/responses");
  // Next.js's own (its chunks, RSC requests, the dev server's hot-reload socket) stay behind "Show demo requests"
  const urls = await page.locator('#requests > li[data-demo="true"] [data-field="url"]').allTextContents();
  expect(urls.every((url) => /^\/(demo|shared|_next)\/|_rsc=|^https?:/.test(url)), urls.join("\n")).toBe(true);
  await page.getByLabel("Show demo requests").check();
  await expect(page.locator("#requests > li:not([hidden])")).toHaveCount(await page.locator("#requests > li").count());
});
