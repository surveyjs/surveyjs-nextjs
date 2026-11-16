// The dev run's global setup: request every page once, so Turbopack compiles it before the specs run. Without it,
// the first spec to open each example waits for the compile and can time out. Each page answers 200 once compiled.
import type { FullConfig } from "@playwright/test";
import { readFileSync } from "node:fs";

export default async function warmDevRoutes(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? "http://127.0.0.1:8000";
  const manifest = JSON.parse(readFileSync("surveyjs-integration.json", "utf8")) as { steps: { page: string }[] };
  const paths = ["/", "/claim", "/examples/server-pdf/loading", ...manifest.steps.map((step) => step.page), "/up", "/demo/stored/save-response"];
  for (const path of paths) {
    const started = Date.now();
    const response = await fetch(baseURL + path, { headers: { Cookie: "demo_user=alice" } }).catch(() => null);
    console.log(`warm ${path}: ${response?.status ?? "failed"} in ${Date.now() - started} ms`);
  }
}
