// GET|PUT /api/variable-presets/:formId
import { can, currentUser } from "../auth.ts";
import { db } from "../db.ts";
import { httpError, readJson } from "../integration/http.ts";

// #region sjs:variable-presets.server
// GET /api/variable-presets/:formId — return the stored preset list, or [] when none are saved
export function loadPresets(req: Request, { formId }: { formId: string }) {
  const row = db(req).prepare("SELECT json FROM variable_presets WHERE key = ?").get(formId) as { json: string } | undefined;

  return new Response(row?.json ?? "[]", { headers: { "Content-Type": "application/json" } });
}

// PUT /api/variable-presets/:formId — store the variable presets as-is: it's one JSON document
export async function savePresets(req: Request, { formId }: { formId: string }) {
  const denied = can(currentUser(req), "edit-forms");   // editing is an admin action: 403 otherwise
  if (denied) throw httpError(403, denied);
  const presets = await readJson(req);   // the parsed raw body: {} stays {}; store it with JSON.stringify, never a copy
  if (presets === undefined) throw httpError(400, "Expected a list of presets");   // not a JSON body
  db(req).prepare("INSERT INTO variable_presets (key, json) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET json = excluded.json")
    .run(formId, JSON.stringify(presets));

  return new Response(null, { status: 204 });
}
// #endregion
