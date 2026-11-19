// Demo only: what the catalog and the example pages read before they render: the site texts, the page config
// (window.SURVEYJS_PAGE), the Code tab, and the few queries some example pages make (the reference does these in its
// views' @php blocks). The pages are Server Components in src/app; they call these with pageRequest()
// (src/lib/page-request.ts), a Web Request built from the page's own headers, so this file stays plain Web code.
import { setLicenseKey } from "survey-core";
import { currentUser } from "../auth.ts";
import config from "../config.ts";
import { db } from "../db.ts";
import { httpError, query, requestOrigin } from "../integration/http.ts";
import { readShared } from "../paths.ts";
import { currentBuild } from "./build.ts";
import { codeDefinitions, codePanel } from "./code-panel.ts";
import { docsUrl, findStep, readManifest, type Step } from "./manifest.ts";
import { requestSandbox } from "./sandbox.ts";
import { LABELS, forPage, userKey } from "./users.ts";

/** The catalog's browser title, and the example pages' header next to the SurveyJS pill */
export const TITLE = "Next.js Backend Integration";
/** The catalog header, next to the logo */
export const HEADER = "Step-by-Step Next.js Backend Integration";

// The forms render on the server too, so the licence key applies here before any model renders, as getPage()
// (src/demo/host.ts) applies it in the browser. survey-core is external (next.config.ts), so the page's client
// components share this copy.
if (config.licenseKey) setLicenseKey(config.licenseKey);

/** The four Lato files every page preloads (shared/ui/fonts.css names the family "Lato"). */
export const FONTS = ["Regular", "Medium", "Semibold", "Bold"].map((weight) => `/shared/ui/fonts/lato/LatoLatin-${weight}.woff2`);

/** What the catalog, the PDF loading page and the example pages all read. */
export function siteData(req: Request) {
  return {
    title: TITLE,
    header: HEADER,
    github: config.github,
    build: currentBuild(),
    docs: docsUrl(),
    canonical: requestOrigin(req).origin + new URL(req.url).pathname,   // https behind a TLS proxy (X-Forwarded-Proto)
  };
}

/** The manifest step for a slug; an unknown one is the page's 404. */
export function stepFor(slug: string): Step {
  const step = findStep(slug);
  if (!step) throw httpError(404, "Unknown example");
  return step;
}

/** Everything the example layout (src/components/example/example-layout.tsx) reads. */
export function exampleData(req: Request, step: Step) {
  const user = currentUser(req);
  return {
    ...siteData(req),
    step,
    page: pageConfig(req, step),
    users: forPage(step.slug),
    labels: LABELS,
    demoUser: userKey(user),
    commercial: step.licence.startsWith("Commercial"),
    needsAi: step.licence.includes("needs an AI provider"),
    stepDocs: docsUrl(step),
    codeDefinitions: codeDefinitions(step),
    codePanel: codePanel(step),
    switches: { validateResponses: config.validateResponses, lintDefinitions: config.lintDefinitions },
    demoMode: config.demoMode,
  };
}

export type ExampleData = ReturnType<typeof exampleData>;

/** window.SURVEYJS_PAGE: what src/demo/host.ts and the example client components read. */
export function pageConfig(req: Request, step: Step) {
  // Typed for the pages that pass `definition` (and relational-storage's `definitionV2`) to their client component
  const definitions = Object.fromEntries(Object.entries(step.files)
    .filter(([role]) => role.startsWith("definition"))
    .map(([role, path]) => [role, readShared(path.replace(/^shared\//, ""))])) as { definition: Record<string, unknown>; definitionV2?: Record<string, unknown> };
  if (step.slug === "extract-from-paper") {
    const form = db(req).prepare("SELECT json FROM forms WHERE key = 'work-order'").get() as { json: string } | undefined;
    if (!form) throw httpError(404, "Unknown work order form");
    definitions.definition = JSON.parse(form.json);
  }
  // The relays run in this process: the page's own origin, ws or wss as the visitor sees it (X-Forwarded-Proto)
  const { protocol, host } = requestOrigin(req);
  const origin = `${protocol === "https" ? "wss" : "ws"}://${host}`;
  const user = currentUser(req);
  return {
    slug: step.slug,
    version: readManifest().surveyjsVersion,
    licenseKey: config.licenseKey,
    demoUser: userKey(user),
    user: user ? { key: user.key, name: user.name, plan: user.plan, isEditor: user.isEditor } : null,
    relay: {
      fill: { url: config.relay.fillUrl ?? origin, port: config.port },
      edit: { url: config.relay.editUrl ?? origin, port: config.port },
    },
    demoMode: config.demoMode,
    sandboxId: requestSandbox(req)?.id ?? null,
    switches: { validateResponses: config.validateResponses, lintDefinitions: config.lintDefinitions },
    ...definitions,
  };
}

// ---------------------------------------------------------------------------------------------
// What some example pages compute before they render

const records = (req: Request, formId: string, labelKey: string, customerEmail: string | null = null) =>
  (db(req).prepare(`SELECT id, data FROM responses WHERE form_id = ? ${customerEmail === null ? "" : "AND data ->> '$.customer_email' = ?"}
    ORDER BY id LIMIT 10`).all(formId, ...(customerEmail === null ? [] : [customerEmail])) as { id: number; data: string }[])
    .map((row) => ({ id: String(row.id), label: `#${row.id} · ${(JSON.parse(row.data) as Record<string, unknown>)[labelKey] ?? ""}` }));

/** load-definition-variables-data and /claim: the signed-in customer's claims for the Saved response picker. */
export function claimRecords(req: Request) {
  return { record: query(req, "record") ?? "", records: records(req, "claim", "customer_email", currentUser(req)?.email ?? "") };
}

/** fill-together: the seeded job sheets, and the one in ?record (default the first). */
export function jobSheets(req: Request) {
  const list = records(req, "job-sheet", "customer");
  const record = query(req, "record") ?? list[0]?.id ?? "new";
  return { records: list, record, known: list.some((r) => r.id === record) };
}

/** edit-together: the team forms, and the one in ?form (the proxy answered 400 for an invalid one). */
export function teamForms(req: Request) {
  const formId = query(req, "form") ?? "support-team";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(formId)) throw httpError(400, "Invalid form ID");
  const forms = (db(req).prepare("SELECT key, json FROM forms WHERE key LIKE '%-team' OR key LIKE 'team-%' ORDER BY key").all() as { key: string; json: string }[])
    .map((row) => {
      const title = (JSON.parse(row.json) as { title?: string | { default?: string } }).title;
      return { id: row.key, label: (typeof title === "string" ? title : title?.default) || "Untitled form" };
    });
  return { forms, formId, known: forms.some((f) => f.id === formId) };
}

/** relational-storage: ?version=v1 or v2. */
export const definitionVersion = (req: Request) => (query(req, "version") === "v2" ? "v2" : "v1");

/** server-pdf: the 10 latest claims, each with its JSON. */
export function latestClaims(req: Request) {
  return (db(req).prepare("SELECT id, data FROM responses WHERE form_id = 'claim' ORDER BY id DESC LIMIT 10").all() as { id: number; data: string }[])
    .map((row) => {
      const answers = JSON.parse(row.data) as Record<string, unknown> | null;
      const email = answers?.customer_email;
      return { id: row.id, label: ["string", "number", "boolean"].includes(typeof email) ? String(email) : "No email provided", json: JSON.stringify(answers, null, 4) };
    });
}

/** creator-load-save and creator-uploads: ?form shows the saved form instead of Creator. */
export const formMode = (req: Request) => new URL(req.url).searchParams.has("form");
