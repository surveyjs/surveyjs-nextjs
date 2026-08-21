import { test, expect } from "@playwright/test";

test("homepage has correct title", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/SurveyJS/i);
});

test("survey page loads successfully", async ({ page }) => {
  await page.goto("/survey");
  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
});

test("creator page loads successfully", async ({ page }) => {
  await page.goto("/creator");
  await expect(page.locator(".svc-creator").first()).toBeVisible();
});

test("dashboard page loads successfully", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page.locator("#surveyDashboard").first()).toBeVisible();
});

test("pdf-export page loads successfully", async ({ page }) => {
  await page.goto("/pdf-export");
  await expect(page.getByText("SurveyJS PDF Generator").first()).toBeVisible();
});

test("home page loads successfully", async ({ page }) => {
  await page.goto("/home");
  await expect(page.getByText("Home").first()).toBeVisible();
});

const routes = [
  "/",
  "/home",
  "/survey",
  "/creator",
  "/dashboard",
  "/pdf-export",
];

for (const route of routes) {
  test(`no JS errors on ${route}`, async ({ page }) => {
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
