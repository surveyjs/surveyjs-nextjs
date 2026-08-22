import { test, expect } from "@playwright/test";

const surveyRoutes = ["/claims", "/checkout"];
const allRoutes = [
  "/",
  ...surveyRoutes,
  "/records",
  "/claims/configure",
  "/checkout/configure",
  "/records/configure",
];

test("root redirects to the first survey", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/claims$/);
  await expect(page).toHaveTitle(/SurveyJS/i);
});

for (const route of surveyRoutes) {
  test(`${route} is rendered on the server`, async ({ page }) => {
    // Read the raw document — the survey markup must be in the HTML the
    // server sent, before any JavaScript runs.
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    expect(await response!.text()).toContain("sd-root-modern");
    await expect(page.locator(".sd-root-modern").first()).toBeVisible();
  });
}

test("/records renders the table and the SurveyJS editor", async ({ page }) => {
  await page.goto("/records");
  await expect(page.getByRole("table")).toBeVisible();
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
});

test("editing the JSON changes what the server renders", async ({ page }) => {
  await page.goto("/claims/configure");

  const editor = page.locator(".monaco-editor").first();
  await expect(editor).toBeVisible();

  // Replace the whole document with a minimal survey, then save.
  await page.evaluate((source) => {
    const monaco = (window as unknown as { monaco: typeof import("monaco-editor") })
      .monaco;
    monaco.editor.getModels()[0].setValue(source);
  }, JSON.stringify({
    title: "Edited by the e2e test",
    elements: [{ type: "text", name: "q1", title: "A brand new question" }],
  }, null, 2));

  await page.getByRole("button", { name: /Save and quit/ }).click();
  await expect(page).toHaveURL(/\/claims$/);

  // Reload so the assertion runs against a fresh server render, not the
  // client-side navigation result.
  const response = await page.reload();
  expect(await response!.text()).toContain("A brand new question");

  await page.goto("/claims/configure");
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByText("Custom JSON")).toHaveCount(0);
});

for (const route of allRoutes) {
  test(`no SSR failure or hydration mismatch on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });
    // Hydration mismatches are reported through console.error, not as an
    // uncaught exception, so pageerror alone never sees them.
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
      }
    });

    // A full document load: this is the request that runs the server render.
    // Without the status check a failed SSR still looks fine, because React
    // recovers on the client and paints the page anyway.
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);

    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
}
