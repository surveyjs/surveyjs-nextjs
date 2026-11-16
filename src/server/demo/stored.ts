// Demo only: GET /demo/stored/:slug, the Data panel ("What the server stored"). A fixed, whitelisted read per
// example, never arbitrary SQL. The section names and row fields are the reference's: the contract test and the
// browser tests read them.
import { existsSync, readFileSync } from "node:fs";
import type { SQLInputValue } from "node:sqlite";
import { currentUser } from "../auth.ts";
import config from "../config.ts";
import { db } from "../db.ts";
import { cache } from "../integration/cache.ts";
import { httpError, query } from "../integration/http.ts";
import { roomKey, snapshotPath } from "../relay/room-key.ts";
import { requestSandbox } from "./sandbox.ts";

type ResponseRow = { id: number; form_id: string; definition_version: string | null; data: string; created_at: string };

function responses(req: Request, formId: string | null, id: number | null, limit = 5, customerEmail: string | null = null) {
  const filters = ([
    formId ? ["form_id = ?", formId] : null,
    id ? ["id = ?", id] : null,
    customerEmail !== null ? ["data ->> '$.customer_email' = ?", customerEmail] : null,
  ] as ([string, SQLInputValue] | null)[]).filter((filter) => filter !== null);
  const where = filters.map(([sql]) => sql);
  const params = filters.map(([, value]) => value);
  const sql = `SELECT id, form_id, definition_version, data, created_at FROM responses
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY id DESC LIMIT ?`;
  return (db(req).prepare(sql).all(...params, limit) as ResponseRow[]).map((row) => ({
    data: JSON.parse(row.data), id: row.id, form_id: row.form_id, definition_version: row.definition_version, created_at: row.created_at,
  }));
}

function documents(req: Request, table: "forms" | "progress" | "variable_presets", key: string) {
  const row = db(req).prepare(`SELECT json FROM ${table} WHERE key = ?`).get(key) as { json: string } | undefined;
  return row ? { key, json: JSON.parse(row.json) } : null;
}

type ClaimRow = ResponseRow & { claim_id: number; response_id: number; customer_email: string | null; amount: number | null };

function claims(req: Request, id: number | null, limit = 3) {
  const rows = db(req).prepare(`
    SELECT claims.id AS claim_id, claims.response_id, claims.customer_email, claims.amount,
           responses.form_id, responses.definition_version, responses.created_at, responses.data
    FROM claims JOIN responses ON responses.id = claims.response_id
    ${id ? "WHERE responses.id = ?" : ""} ORDER BY claims.id DESC LIMIT ?`).all(...(id ? [id] : []), limit) as ClaimRow[];
  return {
    claims: rows.map((r) => ({ claim_id: r.claim_id, response_id: r.response_id, customer_email: r.customer_email, amount: r.amount })),
    responses: rows.map((r) => ({
      id: r.response_id, form_id: r.form_id, definition_version: r.definition_version, created_at: r.created_at, data: JSON.parse(r.data),
    })),
  };
}

function relaySnapshot(req: Request, relay: "fill" | "edit") {
  const id = query(req, "room") ?? "";
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return null;
  if (!config.demoMode) return "The relay writes room snapshots in demo mode only (DEMO_MODE=true)";
  const path = snapshotPath(roomKey(requestSandbox(req)?.id, id), relay);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : "No room data";
}

function rowCounts(req: Request) {
  return Object.fromEntries(["forms", "responses", "progress", "files", "claims", "variable_presets"]
    .map((table) => [table, (db(req).prepare(`SELECT COUNT(*) AS n FROM ${table}`).get() as { n: number }).n]));
}

const files = (req: Request, limit: number) => db(req).prepare("SELECT id, name, type FROM files ORDER BY rowid DESC LIMIT ?").all(limit);

/** The Data panel's sections for an example, or undefined for an unknown slug. */
export function stored(slug: string, req: Request): Record<string, unknown> | undefined {
  const raw = query(req, "id") ?? "";
  const id = /^\s*\+?\d+\s*$/.test(raw) ? Number(raw) || null : null;
  const key = (fallback: string) => query(req, "key") ?? fallback;
  const user = currentUser(req);
  switch (slug) {
    case "save-response": return { responses: responses(req, id ? null : "contact", id) };
    case "load-definition-variables-data": return { responses: responses(req, "claim", id, 5, id ? null : (user?.email ?? "")) };
    case "resume-progress": return {
      progress: documents(req, "progress", `${user?.id ?? ""}:${key("onboarding")}`),
      responses: responses(req, "onboarding", id),
    };
    case "store-files": return { responses: responses(req, "expenses", id, 3), files: files(req, 10) };
    case "choices-from-web": return {
      responses: responses(req, "visit", id, 3),
      offices: db(req).prepare("SELECT id, name, region FROM offices ORDER BY region, name").all(),
      "countries cache": cache.has("countries") ? "cached for 24 hours" : "empty: the next request fetches restcountries.com",
    };
    case "async-functions": return {
      customers: (db(req).prepare("SELECT email FROM customers").all() as { email: string }[]).map((row) => row.email),
      shipping_rates: db(req).prepare("SELECT postcode_prefix, price FROM shipping_rates ORDER BY postcode_prefix").all(),
    };
    case "relational-storage": return claims(req, id);
    case "fill-together": return { "relay room": relaySnapshot(req, "fill"), responses: responses(req, "job-sheet", id, 3) };
    case "dashboard": return { responses: (db(req).prepare("SELECT COUNT(*) AS n FROM responses WHERE form_id = 'feedback'").get() as { n: number }).n };
    case "creator-load-save": return { forms: documents(req, "forms", key("support")) };
    case "ai-translation": return { forms: documents(req, "forms", "support-translations") };
    case "creator-uploads": return { forms: documents(req, "forms", "support-assets"), files: files(req, 5) };
    case "variable-presets": return { variable_presets: documents(req, "variable_presets", key("support")) };
    case "edit-together": return { "relay room": relaySnapshot(req, "edit"), forms: documents(req, "forms", key("support-team")) };
    case "validate-response": return { responses: responses(req, "claim", id) };
    case "lint-definition": return { forms: documents(req, "forms", "support-lint") };
    case "server-pdf": return { responses: responses(req, "claim", id, 10) };
    case "extract-from-paper": return { "row counts": rowCounts(req), responses: responses(req, "work-order", id, 3) };
    default: return undefined;
  }
}

/** GET /demo/stored/:slug (src/app/demo/stored/[slug]/route.ts) */
export function storedRoute(req: Request, { slug }: { slug: string }) {
  const sections = stored(slug, req);
  if (sections === undefined) throw httpError(404, "Not found");
  return Response.json(sections);
}
