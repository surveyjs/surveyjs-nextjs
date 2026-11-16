// The Form Library pages wear the SurveyJS shadcn adapter (survey-core/themes/adapters/shadcn-base-nova.css) with the
// SurveyJS brand in shadcn's tokens (src/app/globals.css). It replaces shared/browser-tests/form-theme.spec.js, which
// checks the Tailwind adapter, with the same four checks on save-response: brand and font, the embedded survey
// reading the tokens (no literal fallback), the card's spacing, and the invalid state. A shadcn, Tailwind or
// survey-core upgrade that drops a token makes the adapter fall back to its literals silently; these tests fail instead.
import { expect, test, type Page } from "@playwright/test";

const SJS_GREEN = "rgb(25, 179, 148)";   // --color-sjs, #19b394
const escape = (text: string) => text.replace(/[().]/g, "\\$&");

/** Computed custom properties: on :root (shadcn's side) or on the survey root (the adapter's side). */
function readVariables(page: Page, names: string[], selector?: string) {
  return page.evaluate(([names, selector]) => {
    const style = getComputedStyle(selector ? document.querySelector(selector)! : document.documentElement);
    return Object.fromEntries(names.map((name) => [name, style.getPropertyValue(name).trim()]));
  }, [names, selector] as const);
}

/** The computed colour of a throwaway element coloured with a CSS value, inside the survey root. */
function resolveColor(page: Page, value: string) {
  return page.evaluate((value) => {
    const probe = document.createElement("span");
    probe.style.color = value;
    document.querySelector(".sd-root-modern")!.append(probe);
    const color = getComputedStyle(probe).color;
    probe.remove();
    return color;
  }, value);
}

test.beforeEach(async ({ page }) => {
  await page.goto("/examples/save-response");
  await expect(page.locator(".sd-root-modern")).toBeVisible();
});

test("1. brand and font: shadcn's primary and ring are the SurveyJS green, Lato in the foreground colour", async ({ page }) => {
  expect(await resolveColor(page, "var(--primary)")).toBe(SJS_GREEN);
  expect(await resolveColor(page, "var(--ring)")).toBe(SJS_GREEN);
  // bg-primary is shadcn's utility: theme.css's --color-primary and shadcn's @theme inline mapping end in the green
  await expect(page.locator("#stored-dot")).toHaveCSS("background-color", SJS_GREEN);
  await expect(page.getByRole("button", { name: "Send message", exact: true })).toHaveCSS("background-color", SJS_GREEN);

  const email = page.getByRole("textbox", { name: /Your email/ });
  await email.focus();
  // shadcn's focus: a 1px ring in --ring and the 3px halo (ring/50), drawn as box-shadows on the form box
  await expect(email.locator('xpath=ancestor::*[contains(@class, "sd-formbox")][1]')).toHaveCSS("box-shadow", new RegExp(`${escape(SJS_GREEN)} 0px 0px 0px 1px`));

  const foreground = await resolveColor(page, "var(--color-gray-800)");
  expect(await resolveColor(page, "var(--foreground)")).toBe(foreground);
  for (const text of [page.locator(".sd-question__title").first(), email]) {
    await expect(text).toHaveCSS("font-family", /^Lato,/);
    await expect(text).toHaveCSS("color", foreground);
  }
  await expect(page.locator("#page-header h1")).toHaveCSS("font-family", /^Lato,/);   // the page around the form: Lato too
});

test("2. no literal fallback: shadcn's tokens exist and the embedded survey resolves to them", async ({ page }) => {
  const tokens = await readVariables(page, ["--background", "--foreground", "--card", "--primary", "--primary-foreground", "--muted-foreground",
    "--destructive", "--border", "--input", "--ring", "--radius", "--spacing", "--font-sans", "--color-sjs", "--color-sjs-red"]);
  for (const [name, value] of Object.entries(tokens)) expect(value, `${name} on :root`).not.toBe("");
  expect(tokens["--font-sans"]).toMatch(/^['"]?Lato/);

  const survey = await readVariables(page, ["--sjs2-base-unit-radius", "--sjs2-typography-font-family-text"], ".sd-root-modern");
  expect(survey["--sjs2-base-unit-radius"]).toBe(tokens["--radius"]);
  expect(survey["--sjs2-typography-font-family-text"]).toMatch(/Lato/);
  for (const [variable, token] of [
    ["--sjs2-color-component-action-brand-primary-default-bg", "--primary"],
    ["--sjs2-color-component-action-brand-primary-default-label", "--primary-foreground"],
    ["--sjs2-color-component-formbox-focused-border", "--ring"],
    ["--sjs2-color-component-formbox-default-border", "--border"],
    ["--sjs2-color-component-message-error-text", "--destructive"],
    ["--sjs2-color-component-input-default-value", "--foreground"],
    ["--sjs2-color-component-input-default-placeholder", "--muted-foreground"],
  ]) {
    expect(await resolveColor(page, `var(${variable})`), variable).toBe(await resolveColor(page, `var(${token})`));
  }
  expect(await resolveColor(page, "var(--destructive)")).toBe(await resolveColor(page, "var(--color-sjs-red)"));
});

for (const width of [1440, 390]) {
  test(`3. the card's spacing at ${width}: the form starts at the card's padding edge, one left edge`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    const edges = await page.evaluate(() => {
      // The card's padding edge: #form pads the form inside #component
      const form = document.querySelector("#form")!;
      const titleText = document.createRange();
      titleText.selectNodeContents(document.querySelector(".sd-question__title")!);
      return {
        cardPadding: form.getBoundingClientRect().left + parseFloat(getComputedStyle(form).paddingLeft),
        body: document.querySelector(".sd-body")!.getBoundingClientRect().left,
        header: document.querySelector(".sd-title")!.getBoundingClientRect().left,
        question: titleText.getBoundingClientRect().left,
        button: document.querySelector(".sd-body__navigation .sd-navigation__complete-btn")!.getBoundingClientRect().left,
      };
    });
    // Under 720px the form fills the card; wider, survey-core centres its 720px column (widthMode "auto")
    const edge = width === 390 ? edges.cardPadding : edges.body;
    expect(edges.question).toBeCloseTo(edge, 0);
    expect(edges.button).toBeCloseTo(edge, 0);
    expect(edges.header).toBeCloseTo(edge, 0);
    if (width === 390) expect(edges.body).toBeCloseTo(edges.cardPadding, 0);
  });
}

test("4. a required-field error: the destructive red on the field and the message", async ({ page }) => {
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  const message = page.locator(".sd-question__erbox").first();
  await expect(message).toBeVisible();

  const red = await resolveColor(page, "var(--color-sjs-red)");
  expect(await resolveColor(page, "var(--sjs2-color-border-alert-primary)")).toBe(red);
  const email = page.getByRole("textbox", { name: /Your email/ });
  // aria-invalid in shadcn's style: a 1px inset ring in --destructive, and the destructive/20 halo
  await expect(email.locator('xpath=ancestor::*[contains(@class, "sd-formbox")][1]')).toHaveCSS("box-shadow", new RegExp(`^${escape(red)} 0px 0px 0px 1px inset`));
  await expect(message).toHaveCSS("color", red);
});
