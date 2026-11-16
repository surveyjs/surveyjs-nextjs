// Demo only: with DEMO_MODE=true each visitor works in a private copy of the seeded database and an uploads
// folder, chosen by the demo_sid cookie. The example handlers don't change: db(req) and filesDir(req) ask
// requestSandbox(req). route() (integration/http.ts) resolves the sandbox for API requests, src/proxy.ts for pages
// (with ?join=), and the relays with resolveSandbox(). Delete this file (and its calls) when you copy an example.
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, utimesSync } from "node:fs";
import { join } from "node:path";
import config from "../config.ts";
import { close, database } from "../db.ts";
import { requestOrigin } from "../integration/http.ts";
import { requestCookies, serializeCookie } from "./cookies.ts";

const TTL_HOURS = 24;

export type Sandbox = { id: string; database: string; files: string };

/** 128 random bits as 32 lowercase hex characters; nothing else ever reaches a file path. */
export const isValidId = (id: unknown): id is string => typeof id === "string" && /^[0-9a-f]{32}$/.test(id);

export const newSandboxId = () => randomBytes(16).toString("hex");

const paths = (id: string): Sandbox => ({
  id,
  database: join(config.dataDir, "sandbox", `${id}.sqlite`),
  files: join(config.dataDir, "sandbox", id),
});

export const sandboxExists = (id: unknown) => isValidId(id) && existsSync(paths(id).database);

/**
 * The visitor's sandbox, created from the seeded database on first use, and marked as used now. route(), the
 * proxy and the relays all call it.
 */
export function resolveSandbox(id: string): Sandbox {
  if (!isValidId(id)) throw new Error("Invalid sandbox id");
  const sandbox = paths(id);
  if (!existsSync(sandbox.database)) {
    mkdirSync(sandbox.files, { recursive: true });
    // A consistent copy of the seeded database, even while the app has it open
    database(config.databasePath).exec(`VACUUM INTO '${sandbox.database.replaceAll("'", "''")}'`);
  }
  const now = new Date();
  utimesSync(sandbox.database, now, now);   // last used: prune() removes sandboxes unused for 24 hours
  return sandbox;
}

// The sandbox route() gave a request (a fresh one has no cookie yet). A WeakMap per module graph is enough: route()
// and the handlers it calls are in the same one.
const assigned = new WeakMap<Request, Sandbox>();

/** The request's sandbox in demo mode, from route() or the demo_sid cookie; null outside demo mode. */
export function requestSandbox(req: Request): Sandbox | null {
  if (!config.demoMode) return null;
  const known = assigned.get(req);
  if (known) return known;
  const id = requestCookies(req).demo_sid;
  return isValidId(id) ? resolveSandbox(id) : null;
}

/** The demo_sid Set-Cookie line: readable only by the server, 30 days. */
export const sandboxCookie = (req: Request | { headers: Headers }, id: string) =>
  serializeCookie("demo_sid", id, { maxAge: 30 * 24 * 3600, secure: requestOrigin(req).protocol === "https", httpOnly: true });

/**
 * For route(): the request's sandbox, a fresh one when demo_sid is missing or invalid (never a file path built from
 * client input). Returns the Set-Cookie line to send, or null. Outside demo mode it does nothing.
 */
export function demoSandbox(req: Request): string | null {
  if (!config.demoMode) return null;
  let id = requestCookies(req).demo_sid;
  let fresh = false;
  if (!isValidId(id)) {
    id = newSandboxId();
    fresh = true;
  }
  assigned.set(req, resolveSandbox(id));
  return fresh ? sandboxCookie(req, id) : null;
}

/** Remove sandboxes (and relay snapshots) unused for 24 hours, closing their databases first. server.ts runs it hourly in demo mode. */
export function prune(now = Date.now()): number {
  const cutoff = now - TTL_HOURS * 3600 * 1000;
  let removed = 0;
  const folder = join(config.dataDir, "sandbox");
  for (const name of existsSync(folder) ? readdirSync(folder) : []) {
    const id = name.replace(/\.sqlite$/, "");
    if (!name.endsWith(".sqlite") || !isValidId(id)) continue;
    const sandbox = paths(id);
    if (statSync(sandbox.database).mtimeMs < cutoff) {
      close(sandbox.database);   // every handle in the process, also the route handlers' (process-state.ts)
      rmSync(sandbox.database, { force: true });
      rmSync(sandbox.files, { recursive: true, force: true });
      removed++;
    }
  }
  const snapshots = join(config.dataDir, "relay");
  for (const name of existsSync(snapshots) ? readdirSync(snapshots) : []) {
    const path = join(snapshots, name);
    if (name.endsWith(".json") && statSync(path).mtimeMs < cutoff) rmSync(path, { force: true });
  }
  return removed;
}
