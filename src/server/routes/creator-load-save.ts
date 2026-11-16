// PUT /api/forms/:id
// GET /api/forms/:id is in load-definition-variables-data.ts: Creator reads its .definition.
// This file holds only the PUT, so LINT_DEFINITIONS=true can swap in lint-definition.ts (src/app/api/forms/[id]/route.ts).
import { can, currentUser } from "../auth.ts";
import { db } from "../db.ts";
import { httpError, readJson } from "../integration/http.ts";

// #region sjs:creator-load-save.server
// PUT /api/forms/:id — store the definition as-is: it's one JSON document
export async function saveForm(req: Request, { id }: { id: string }) {
  const denied = can(currentUser(req), "edit-forms");   // editing is an admin action: 403 otherwise
  if (denied) throw httpError(403, denied);
  const definition = await readJson(req);   // the parsed raw body: {} stays {}; store it with JSON.stringify, never a copy
  if (definition === undefined) throw httpError(400, "Expected a form definition");   // not a JSON body
  db(req).prepare("INSERT INTO forms (key, json) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET json = excluded.json")
    .run(id, JSON.stringify(definition));

  return new Response(null, { status: 204 });   // the next page load renders the new version
}
// #endregion
