// Demo only: in demo mode a room belongs to one visitor sandbox, so its key is "<demo_sid>:<id>". Outside demo
// mode the key is the plain record or form id. The relays build keys here, outside their regions.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import config from "../config.ts";
import { timestamp } from "../integration/stored-json.ts";

/** The room key for a record or form id, in a sandbox (demo mode) or not. */
export const roomKey = (sandboxId: string | null | undefined, id: string) => (sandboxId ? `${sandboxId}:${id}` : id);

/**
 * Where a relay writes a room snapshot for the Data panel (demo/stored.ts reads it). Room keys contain ":" (invalid
 * in Windows file names) and ids from the URL, so the file is named by the key's SHA-256.
 */
export function snapshotPath(key: string, relay: "fill" | "edit" = "fill"): string {
  const name = `${createHash("sha256").update(key).digest("hex")}.json`;
  return join(config.dataDir, "relay", relay === "fill" ? name : `${relay}-${name}`);
}

/** Write a room's state for the Data panel. */
export function writeSnapshot(key: string, relay: "fill" | "edit", snapshot: Record<string, unknown>): void {
  const path = snapshotPath(key, relay);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify({ ...snapshot, updatedAt: timestamp() }, null, 4));
}
