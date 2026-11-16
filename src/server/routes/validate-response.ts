// POST /api/responses, validated against the stored definition
// Used in place of save-response.ts when VALIDATE_RESPONSES=true (src/app/api/responses/route.ts). survey-core runs
// right here, as it runs in SurveyJS Server (src/validator.ts).
import { Model } from "survey-core";
import { lintSurvey } from "survey-core/linter";
import { db } from "../db.ts";
import { httpError, readJson } from "../integration/http.ts";
import { insertResponse } from "../integration/stored-json.ts";
import { lintOptions, surveyjs } from "../integration/surveyjs.ts";

type Envelope = { formId?: unknown; data?: unknown };

const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);

// #region sjs:validate-response.server
// POST /api/responses — validate the answers against the stored definition, then store them as usual
export async function validateResponse(req: Request) {
  const { formId, data } = ((await readJson(req)) ?? {}) as Envelope;   // the parsed raw body: {} stays {} (see Save Responses)
  if (typeof formId !== "string" || !isObject(data)) throw httpError(400, "Expected { formId, data } with an answers object");
  const form = db(req).prepare("SELECT json FROM forms WHERE key = ?").get(formId) as { json: string } | undefined;
  if (!form) throw httpError(404, "Unknown form");
  const definition = JSON.parse(form.json);
  if (lintSurvey(definition, lintOptions).findings.some((finding) => finding.severity === "error")) {
    surveyjs.logFailure("validate-response", `the stored definition of ${formId} has errors`);
    return Response.json({ error: "The stored definition has errors" }, { status: 500 });   // a broken form is this app's fault
  }

  const survey = new Model(definition);
  const dataErrors = survey.setData(data, {});   // unknown keys, wrong value types, choices that don't exist
  const valid = survey.validate();               // required answers and the definition's validators
  if (dataErrors.length > 0 || !valid) return Response.json({ errors: surveyjs.responseErrors(survey, dataErrors) }, { status: 400 });

  const id = insertResponse(req, formId, data);   // stored as it arrived, never a copy
  return Response.json({ id }, { status: 201 });
}
// #endregion
