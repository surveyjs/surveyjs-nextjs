// No console error, React warning (hydration mismatch, missing key, a script tag React would not run) or failed
// request on any page. Run in development mode (e2e:dev) this sees React's warnings, which a production build strips.
// It replaces the old app's console-errors.mjs. API answers are mocked only where a page would otherwise call out
// (nothing here needs the network).
import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(readFileSync("surveyjs-integration.json", "utf8")) as { steps: { slug: string; page: string }[] };
const PAGES = ["/", "/claim", "/examples/server-pdf/loading", "/examples/creator-load-save?form", ...manifest.steps.map((step) => step.page)];

/** Messages that are not this app's: the licence banner's notice when no key is set. */
const IGNORED = [/license key/i, /surveyjs\.io\/licensing/i];

for (const path of PAGES) {
  test(`${path}: no console error or React warning, no failed request`, async ({ page }) => {
    const problems: string[] = [];
    page.on("console", (message) => {
      const text = message.text();
      if (IGNORED.some((pattern) => pattern.test(text))) return;
      if (message.type() === "error" || (message.type() === "warning" && /react|hydrat|key|script tag/i.test(text))) problems.push(`${message.type()}: ${text}`);
    });
    page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
    page.on("response", (response) => {
      if (response.status() >= 400 && new URL(response.url()).origin === new URL(page.url() || response.url()).origin) problems.push(`${response.status()} ${response.url()}`);
    });
    page.on("requestfailed", (request) => {
      // A page that leaves aborts what it was still loading; anything else is a failure
      if (!/ERR_ABORTED/.test(request.failure()?.errorText ?? "")) problems.push(`failed ${request.url()}: ${request.failure()?.errorText}`);
    });
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);   // effects, the Data panel's refresh, the relays' first frames
    expect(problems, problems.join("\n")).toEqual([]);
  });
}
