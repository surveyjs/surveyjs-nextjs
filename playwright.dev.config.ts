// The same specs against the development server (node server.ts --dev). React strips most of its warnings from a
// production build, so this run is the one that sees them: e2e/console.spec.ts fails on any hydration warning or
// missing key, and Strict Mode runs every effect twice here. The routes are compiled first (e2e/warm-dev-routes.ts),
// so the first spec of each page doesn't time out while Turbopack compiles it.
//
// Ports, reports and artifact folders are separate, so both runs can live side by side in CI.
import { defineConfig } from "@playwright/test";
import { shared, webServer } from "./playwright.config.ts";

export default defineConfig({
  ...shared,
  globalSetup: "./e2e/warm-dev-routes.ts",
  outputDir: "test-results-dev/artifacts",
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report-dev" }], ["junit", { outputFile: "test-results-dev/e2e-junit-results.xml" }]],
  webServer: webServer("--dev"),
});
