// PUT /api/forms/:id, linted before it is stored
// Used in place of the PUT in creator-load-save.ts when LINT_DEFINITIONS=true (src/app/api/forms/[id]/route.ts).
// survey-core's linter runs right here, as it runs in SurveyJS Server (src/validator.ts).
import { lintSurvey } from "survey-core/linter";
import { can, currentUser } from "../auth.ts";
import { db } from "../db.ts";
import { httpError, readJson } from "../integration/http.ts";
import { lintOptions } from "../integration/surveyjs.ts";

// #region sjs:lint-definition.server
// PUT /api/forms/:id — lint the definition from Creator before storing it
export async function lintAndSaveForm(req: Request, { id }: { id: string }) {
  const denied = can(currentUser(req), "edit-forms");
  if (denied) throw httpError(403, denied);
  const definition = await readJson(req);   // the parsed raw body: {} stays {} (see Load and Save Form JSON Schemas)
  if (definition === null || typeof definition !== "object" || Array.isArray(definition)) {
    throw httpError(400, "Expected a form definition");
  }

  const { findings } = lintSurvey(definition, lintOptions);
  const errors = findings.filter((finding) => finding.severity === "error");
  const warnings = findings.filter((finding) => finding.severity !== "error");
  if (errors.length > 0) return Response.json({ errors, warnings }, { status: 422 });   // refuse: the previous version stays

  db(req).prepare("INSERT INTO forms (key, json) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET json = excluded.json")
    .run(id, JSON.stringify(definition));   // stored as it arrived, never a copy
  if (warnings.length > 0) return Response.json({ warnings });   // warnings don't block the save
  return new Response(null, { status: 204 });
}
// #endregion
