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

test("an edited JSON is kept in the browser and survives a reload", async ({
  page,
}) => {
  // The saved definition is applied after hydration, so this is exactly where a
  // mismatch would show up.
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("/claims/configure");
  // Monaco is a heavy dynamic import; under parallel workers it needs longer
  // than the default expect timeout.
  await expect(page.locator(".monaco-editor").first()).toBeVisible({
    timeout: 30_000,
  });

  // Replace the whole document with a minimal survey, then save.
  await page.evaluate((source) => {
    const monaco = (window as unknown as { monaco: typeof import("monaco-editor") })
      .monaco;
    monaco.editor.getModels()[0].setValue(source);
  }, JSON.stringify({
    title: "Edited by the e2e test",
    elements: [{ type: "text", name: "q1", title: "A brand new question" }],
  }, null, 2));

  // The live preview picking up the edit proves the page is hydrated and the
  // editor state has propagated — without this the Save click can land on a
  // button that has no handler attached yet.
  await expect(page.getByText("A brand new question").first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole("button", { name: /Save and quit/ }).click();
  await expect(page).toHaveURL(/\/claims$/);
  await expect(page.getByText("A brand new question")).toBeVisible();

  // The definition lives in localStorage, so a full reload keeps it — while the
  // HTML the server sent stays canonical (see the SEO assertion below).
  const response = await page.reload();
  const serverHtml = await response!.text();
  expect(serverHtml).not.toContain("A brand new question");
  expect(serverHtml).toContain("Patient Intake");
  await expect(page.getByText("A brand new question")).toBeVisible();

  await page.goto("/claims/configure");
  await page.getByRole("button", { name: "Reset" }).click();
  await page.goto("/claims");
  await expect(page.getByText("A brand new question")).toHaveCount(0);
  await expect(page.getByText("Patient Intake").first()).toBeVisible();

  expect(errors).toHaveLength(0);
});

test("the spinner shows only for a visitor with a saved definition", async ({
  page,
}) => {
  await page.goto("/claims");
  // Nothing saved: the server markup stays put, no loading state at all.
  await expect(page.locator('[role="status"]')).toHaveCount(0);

  await page.evaluate(() => {
    localStorage.setItem(
      "sjs-demo-schema:medical-form",
      JSON.stringify({
        title: "Saved by the e2e test",
        elements: [{ type: "text", name: "q1", title: "A saved question" }],
      }),
    );
  });

  // Swapping in the saved definition is deferred past a paint on purpose, so
  // the spinner is genuinely drawn rather than collapsed into one frame.
  await page.reload();
  await expect(page.locator('[role="status"]')).toBeVisible();
  await expect(page.getByText("A saved question")).toBeVisible();
  await expect(page.locator('[role="status"]')).toHaveCount(0);
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
