// Every setting, read from the environment once. No other file reads process.env (the one exception is
// integration/ai-provider.ts, which hands SURVEYJS_OLLAMA_BASE_URL to the extractor; see there).
// server.ts loads .env with Node's own process.loadEnvFile(), before Next.js starts, so there is no dotenv.
// Nothing here is NEXT_PUBLIC_*: the browser gets what it needs from the server-rendered page config.
import { resolve } from "node:path";

type Env = Record<string, string | undefined>;

/** Switches accept 1, true, on or yes, as the contract test does. */
const flag = (value: string | undefined) => /^(1|true|on|yes)$/i.test(value ?? "");
const text = (value: string | undefined) => (typeof value === "string" && value.trim() !== "" ? value.trim() : null);

/** The settings for an environment. Tests set their own process.env before they import the app. */
export function readConfig(env: Env) {
  // Azure App Service and Heroku set PORT; APP_PORT wins, so a second checkout can move off 8000
  const port = Number(env.APP_PORT || env.PORT || 8000);
  const dataDir = resolve(env.DATA_DIR || "storage");

  return Object.freeze({
    env: env.NODE_ENV || "development",
    port,
    host: env.APP_HOST || (env.PORT ? "0.0.0.0" : "127.0.0.1"),
    dataDir,
    databasePath: resolve(dataDir, "database.sqlite"),

    // Run Server-Side Workflows: the switches pick validate-response.ts and lint-definition.ts
    validateResponses: flag(env.VALIDATE_RESPONSES),
    lintDefinitions: flag(env.LINT_DEFINITIONS),

    // Demo only: a private SQLite copy and uploads folder per visitor (README: How data works in the demo)
    demoMode: flag(env.DEMO_MODE),

    // The relays run in this process, on this port. Set these to the proxy's origin (wss://example.com) when it
    // serves /ws/ on another host; unset, the pages use their own origin
    relay: Object.freeze({ fillUrl: text(env.RELAY_URL), editUrl: text(env.EDIT_RELAY_URL) }),

    // Shown in the browser, and applied to server PDFs: setLicenseKey() runs only when it is set
    licenseKey: text(env.SURVEYJS_LICENSE_KEY),

    // Translate with AI: an OpenAI-compatible /chat/completions endpoint
    ai: Object.freeze({
      baseUrl: (text(env.AI_BASE_URL) ?? "https://api.openai.com/v1").replace(/\/+$/, ""),
      apiKey: text(env.AI_API_KEY),
      model: text(env.AI_MODEL) ?? "gpt-4o-mini",
    }),

    // Extract Responses from Documents: the extractor's provider, chosen as SurveyJS Server chooses it.
    // The names differ from the service's (AI_PROVIDER, AI_MODEL) because AI_MODEL belongs to translation here.
    extraction: Object.freeze({
      provider: text(env.SURVEYJS_AI_PROVIDER),
      model: text(env.SURVEYJS_AI_MODEL),
      ollamaBaseUrl: text(env.SURVEYJS_OLLAMA_BASE_URL),
      openaiApiKey: text(env.OPENAI_API_KEY),
      anthropicApiKey: text(env.ANTHROPIC_API_KEY),
    }),

    // Which checkout answered: `<branch>@<commit>`, set at deploy; unset, demo/build.ts asks git
    build: text(env.SURVEYJS_BUILD),

    // The Next.js integration docs. Example pages link to <docs>#<anchor> (anchors: surveyjs-integration.json)
    docs: text(env.SURVEYJS_DOCS) ?? "https://surveyjs.io/documentation/backend-integration-nextjs",
    github: text(env.SURVEYJS_GITHUB) ?? "https://github.com/surveyjs/surveyjs-nextjs",
  });
}

export type Config = ReturnType<typeof readConfig>;
export type ExtractionConfig = Config["extraction"];
export type AiConfig = Config["ai"];

export const config: Config = readConfig(process.env);
export default config;
