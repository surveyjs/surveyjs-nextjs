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
  await expect(page.locator("#surveyVizPanel").first()).toBeVisible();
});

test("tabulator page loads successfully", async ({ page }) => {
  await page.goto("/tabulator");
  await expect(page.locator("#summaryContainer").first()).toBeVisible();
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
  "/tabulator",
  "/pdf-export",
];

for (const route of routes) {
  test(`no JS errors on ${route}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(route);
    await page.waitForLoadState("networkidle");

    expect(errors).toHaveLength(0);
  });
}
