// GET /api/claims/:id/pdf
// survey-pdf runs right here, as it runs in SurveyJS Server (src/pdf.ts); integration/surveyjs.ts holds the call.
import { lintSurvey } from "survey-core/linter";
import { db } from "../db.ts";
import { httpError } from "../integration/http.ts";
import { lintOptions, surveyjs } from "../integration/surveyjs.ts";
import { readRepoFile } from "../paths.ts";

const versioned = (version: string) => readRepoFile(`shared/definitions/relational-storage.${version}.json`);

// #region sjs:server-pdf.server
// GET /api/claims/:id/pdf — fill the claim's definition with its answers and send the PDF
export async function claimPdf(req: Request, { id }: { id: string }) {
  const claim = (/^\d+$/.test(id)
    ? db(req).prepare("SELECT data, definition_version FROM responses WHERE form_id = 'claim' AND id = ?").get(id)
    : undefined) as { data: string; definition_version: string | null } | undefined;
  if (!claim) throw httpError(404, "Unknown claim");
  const version = claim.definition_version;   // use the schema version recorded with the response
  const json = version === "v1" || version === "v2" ? versioned(version)
    : version === null ? (db(req).prepare("SELECT json FROM forms WHERE key = 'claim'").get() as { json: string } | undefined)?.json : undefined;
  if (json === undefined) throw httpError(409, "The schema version for this claim is unavailable");
  const definition = JSON.parse(json);
  if (lintSurvey(definition, lintOptions).findings.some((finding) => finding.severity === "error")) {
    surveyjs.logFailure("server-pdf", `the definition of claim ${id} has errors`);
    return Response.json({ error: "The stored definition has errors" }, { status: 500 });
  }
  const pdf = await surveyjs.renderPdf(definition, JSON.parse(claim.data)).catch((error: unknown) => error);   // new SurveyPDF(…)
  if (!surveyjs.isPdf(pdf)) {   // it threw, or its bytes aren't a PDF
    surveyjs.logFailure("server-pdf", pdf);
    return Response.json({ error: "Couldn't generate the PDF" }, { status: 500 });
  }
  return new Response(new Uint8Array(pdf), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="claim-${id}.pdf"`, "Cache-Control": "private, no-store",
  } });
}
// #endregion
