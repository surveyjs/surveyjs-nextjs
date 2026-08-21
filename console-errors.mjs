import { chromium } from "@playwright/test";

const routes = process.argv.slice(3);
const base = process.argv[2];

const browser = await chromium.launch();

for (const route of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));

  const res = await page.goto(base + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  console.log(`\n===== ${route}  (http ${res.status()}) — ${errors.length} console errors =====`);
  errors.forEach((e, i) => console.log(`\n--- ${i + 1} ---\n${e.slice(0, 6000)}`));
  await page.close();
}

await browser.close();
