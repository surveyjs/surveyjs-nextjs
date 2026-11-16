// The browser tests in production mode: the shared specs (shared/browser-tests, every one except form-theme.spec.js,
// which checks the Tailwind adapter) and this platform's own (e2e/: the shadcn form theme, the pages, the console).
// Chromium only, one worker.
//
//   npm run e2e:ci                                     after `npm run build`: seeds a fresh database in a temp
//                                                      DATA_DIR and starts node server.ts on APP_PORT (default 8000)
//   BASE_URL=http://127.0.0.1:9000 npx playwright test   against an app that is already running
//
// The Azure pipeline publishes test-results/e2e-junit-results.xml. Outside CI, an app that already answers on
// APP_PORT is used as it is, with its own database.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices, type PlaywrightTestConfig } from "@playwright/test";

const port = process.env.APP_PORT || "8000";
const baseURL = process.env.BASE_URL ?? `http://127.0.0.1:${port}`;

/** The app with a fresh, seeded database every run: the specs expect the seed, not what earlier runs stored. */
export function webServer(mode: "--production" | "--dev"): PlaywrightTestConfig["webServer"] {
  if (process.env.BASE_URL) return undefined;
  return {
    command: `node scripts/setup.ts && node server.ts ${mode}`,
    // No AI provider and no network: translation answers 501 and extraction 503, which the specs mock anyway
    env: {
      ...process.env, DATA_DIR: mkdtempSync(join(tmpdir(), "surveyjs-browser-")), APP_PORT: port, APP_HOST: "127.0.0.1", PORT: "",
      AI_API_KEY: "", SURVEYJS_AI_PROVIDER: "", OPENAI_API_KEY: "", ANTHROPIC_API_KEY: "",
    } as Record<string, string>,
    url: `${baseURL}/up`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  };
}

export const shared = {
  testDir: ".",
  testMatch: ["shared/browser-tests/**/*.spec.js", "e2e/**/*.spec.ts"],
  testIgnore: ["**/form-theme.spec.js", "**/node_modules/**"],   // the Tailwind adapter's theme test: e2e/form-theme-shadcn.spec.ts replaces it
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL, trace: "retain-on-failure" as const },
  projects: [{
    name: "chromium",
    use: {
      ...devices["Desktop Chrome"],
      // Full Chromium in its new headless mode, not the headless shell: the shell has no PDF viewer and turns a
      // navigation to a PDF into a download, so server-pdf's tab never shows the blob: URL.
      channel: "chromium",
      viewport: { width: 1440, height: 900 },
      // As in the reference: Chrome's Local Network Access checks would block a page the test fulfils itself
      launchOptions: { args: ["--disable-features=LocalNetworkAccessChecks"] },
    },
  }],
} satisfies PlaywrightTestConfig;

export default defineConfig({
  ...shared,
  outputDir: "test-results/artifacts",
  reporter: [["list"], ["html", { open: "never" }], ["junit", { outputFile: "test-results/e2e-junit-results.xml" }]],
  webServer: webServer("--production"),
});
