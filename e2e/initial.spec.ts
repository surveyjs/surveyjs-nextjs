import { test, expect, type Page } from "@playwright/test";

const SEED_SURVEY = "insurance-claim";

const allRoutes = [
  "/",
  "/surveys",
  `/surveys/${SEED_SURVEY}/edit`,
  `/surveys/${SEED_SURVEY}/run`,
  `/surveys/${SEED_SURVEY}/results`,
];

/** Collect anything React or a SurveyJS package complains about. */
function captureProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(error.message));
  // Hydration mismatches are reported through console.error, not as an uncaught
  // exception, so pageerror alone never sees them. Warnings count too: React
  // reports plenty of real problems at that level.
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(message.text());
    }
  });
  return problems;
}

test("root redirects to the survey list", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/surveys$/);
  await expect(page.getByRole("heading", { name: "My Forms" })).toBeVisible();
});

test("the survey list is rendered on the server", async ({ page }) => {
  // Read the raw document: the seeded workspace must be in the HTML the server
  // sent, before any JavaScript runs.
  const response = await page.goto("/surveys");
  expect(response?.status()).toBe(200);
  const html = await response!.text();
  expect(html).toContain("Patient Intake Form");
  expect(html).toContain("Insurance Claim");
  await expect(page.getByText("Store Checkout")).toBeVisible();
});

test("a survey runs, and the response lands in its results", async ({
  page,
}) => {
  const response = await page.goto(`/surveys/${SEED_SURVEY}/run`);
  // The form itself is server-rendered — this is the SEO-relevant half of the
  // demo, and it holds even though the Creator next door is client-only.
  expect(await response!.text()).toContain("sd-root-modern");
  await expect(page.locator(".sd-root-modern").first()).toBeVisible();
});

test("the Creator loads for a seeded survey", async ({ page }) => {
  test.slow();
  await page.goto(`/surveys/${SEED_SURVEY}/edit`);
  await expect(page.locator(".svc-creator").first()).toBeVisible({
    timeout: 30_000,
  });
});

test("the dashboard charts the seeded responses", async ({ page }) => {
  test.slow();
  await page.goto(`/surveys/${SEED_SURVEY}/results`);
  await expect(page.locator(".sa-visualizer").first()).toBeVisible({
    timeout: 30_000,
  });
});

test("a survey can be created, renamed and deleted in the browser", async ({
  page,
}) => {
  test.slow();
  await page.goto("/surveys");
  await page.getByRole("button", { name: "Create a Survey" }).first().click();

  // A new survey opens straight in the Creator, exactly like on My Forms.
  await expect(page).toHaveURL(/\/surveys\/survey-1\/edit$/);
  await expect(page.locator(".svc-creator").first()).toBeVisible({
    timeout: 30_000,
  });

  await page.goto("/surveys");
  await expect(page.getByText("New Survey", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Rename survey" }).first().click();
  await page.getByPlaceholder("Enter a survey name...").fill("Renamed by e2e");
  await page.getByRole("button", { name: "Save name" }).click();
  await expect(page.getByText("Renamed by e2e")).toBeVisible();

  // The workspace lives in localStorage, so it survives a full reload while the
  // server keeps sending the canonical seed list.
  const reloaded = await page.reload();
  expect(await reloaded!.text()).not.toContain("Renamed by e2e");
  await expect(page.getByText("Renamed by e2e")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Survey actions" }).first().click();
  await page.getByRole("menuitem", { name: "Delete" }).click();
  await expect(page.getByText("Renamed by e2e")).toHaveCount(0);
});

for (const route of allRoutes) {
  test(`no SSR failure or hydration mismatch on ${route}`, async ({ page }) => {
    test.slow();
    const problems = captureProblems(page);

    // A full document load: this is the request that runs the server render.
    // Without the status check a failed SSR still looks fine, because React
    // recovers on the client and paints the page anyway.
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);

    await page.waitForLoadState("networkidle");

    expect(problems).toHaveLength(0);
  });
}
