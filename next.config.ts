import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Trace files from this folder only, not from a parent folder with its own lock file
  outputFileTracingRoot: import.meta.dirname,

  // Packages the route handlers load from node_modules instead of the server bundle. survey-pdf pulls jspdf,
  // node-fetch@2 and image-size; the extractor and its provider SDKs load optional peers at run time; ws has
  // optional native add-ons. survey-core is listed too, so survey-pdf and the handlers share one copy of it
  // (the licence key set in src/server/integration/surveyjs.ts reaches server PDFs). sharp is external by default.
  serverExternalPackages: ["survey-core", "survey-pdf", "ai-form-response-extractor", "openai", "@anthropic-ai/sdk", "ws"],

  turbopack: {
    // node:fs calls with paths from the environment (DATA_DIR) or the project root (paths.ts): Turbopack warns that
    // it would trace the whole project for a standalone build. This app runs from its checkout through server.ts,
    // never from traced output, so the warning doesn't apply.
    ignoreIssue: [{ path: "**/src/server/**", title: /Dynamic filesystem access/ }],
  },

  // No `env` block: nothing is built into the client bundle. The pages get the licence key and the relay URLs
  // from the server-rendered page config, so changing them needs a restart, not a rebuild.
};

export default nextConfig;
