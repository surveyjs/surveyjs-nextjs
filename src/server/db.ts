// SQLite through node:sqlite: plain parameterized SQL, no ORM, so "a response is one JSON document" stays visible.
// Handlers call db(req). It answers the request's database: the shared one, or in demo mode the visitor's sandbox
// copy (demo/sandbox.ts resolves it from the demo_sid cookie). Opening a file is cached in process-state.ts, so each
// database is opened once per process, however many module graphs ask for it.
import { DatabaseSync } from "node:sqlite";
import { join } from "node:path";
import config from "./config.ts";
import { requestSandbox } from "./demo/sandbox.ts";
import { processState } from "./process-state.ts";

const open = processState("databases", () => new Map<string, DatabaseSync>());

/** The database at a path, opened once and kept open. */
export function database(path: string): DatabaseSync {
  let handle = open.get(path);
  if (!handle) {
    handle = new DatabaseSync(path);
    handle.exec("PRAGMA busy_timeout = 5000; PRAGMA foreign_keys = ON;");
    open.set(path, handle);
  }
  return handle;
}

/**
 * The database for a request: the sandbox's in demo mode, otherwise the app's. The relays have no Request and
 * pass the DatabaseSync they resolved themselves, which comes back as it is.
 */
export function db(source: Request | DatabaseSync): DatabaseSync {
  if (source instanceof DatabaseSync) return source;
  return database(requestSandbox(source)?.database ?? config.databasePath);
}

/** Where a request's uploads live: <DATA_DIR>/files, or the sandbox's folder in demo mode. Named by id, never by the client. */
export function filesDir(req: Request): string {
  return requestSandbox(req)?.files ?? join(config.dataDir, "files");
}

/** Run fn inside one transaction: everything or nothing. */
export function transaction<T>(handle: DatabaseSync, fn: () => T): T {
  handle.exec("BEGIN");
  try {
    const result = fn();
    handle.exec("COMMIT");
    return result;
  } catch (error) {
    handle.exec("ROLLBACK");
    throw error;
  }
}

/** Close one database (a pruned sandbox) or, without a path, all of them (shutdown, tests). */
export function close(path?: string): void {
  for (const [key, handle] of open) {
    if (path === undefined || key === path) {
      handle.close();
      open.delete(key);
    }
  }
}
