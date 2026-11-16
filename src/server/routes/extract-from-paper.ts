// GET /api/work-orders/blank.pdf, POST /api/work-orders/extract
// survey-pdf and ai-form-response-extractor run right here, as they run in SurveyJS Server (src/pdf.ts,
// src/extractor.ts, src/provider.ts). The answers come back as a draft: nothing is saved until a person reviews them.
import { createExtractor } from "ai-form-response-extractor";
import { lintSurvey } from "survey-core/linter";
import config from "../config.ts";
import { db } from "../db.ts";
import { AiConfigurationError, aiProvider } from "../integration/ai-provider.ts";
import { detectType } from "../integration/file-type.ts";
import { httpError, readFiles } from "../integration/http.ts";
import { lintOptions, surveyjs } from "../integration/surveyjs.ts";

const TOO_LARGE = "The scan must be a file of 5 MB or less";

/** The scan: one file of at most 5 MB in the field "scan". On the demo, route() answers the 5 MB case itself. */
const scans = (req: Request) => readFiles(req, "scan", {
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 1,
  tooLarge: [413, TOO_LARGE],
  wrongField: [400, 'Upload the scan in a field named "scan"'],   // a file in another field
});

// The in-process mapping's answers for a failed extraction
const EXTRACTION_ERRORS: Record<number, string> = {
  503: "No AI provider is configured for document extraction",   // none chosen, an unknown one, or its key missing
  504: "The AI provider timed out",                               // no answer within 120 s
  502: "Could not extract the response from the document",        // unreachable, an HTTP error, or an answer it can't use
};

type Extraction = { data?: unknown; confidence?: unknown[]; uniqueId?: string | null };

const isObject = (value: unknown) => value !== null && typeof value === "object" && !Array.isArray(value);
const workOrder = (req: Request) => db(req).prepare("SELECT json FROM forms WHERE key = 'work-order'").get() as { json: string } | undefined;

// #region sjs:extract-from-paper.template
// Generate a blank, fillable PDF using the same schema as extraction
export async function blankWorkOrder(req: Request) {
  const form = workOrder(req);
  if (!form) throw httpError(404, "Unknown work order form");
  const definition = JSON.parse(form.json);
  if (lintSurvey(definition, lintOptions).findings.some((finding) => finding.severity === "error")) {
    surveyjs.logFailure("blank work order", "the work-order definition has errors");
    return Response.json({ error: "The stored definition has errors" }, { status: 500 });
  }

  const pdf = await surveyjs.renderPdf(definition).catch((error: unknown) => error);   // new SurveyPDF(…) without answers
  if (!surveyjs.isPdf(pdf)) {   // it threw, or its bytes aren't a PDF
    surveyjs.logFailure("blank work order", pdf);
    return Response.json({ error: "Couldn't generate the PDF" }, { status: 500 });
  }
  return new Response(new Uint8Array(pdf), { headers: {
    "Content-Type": "application/pdf", "Content-Disposition": 'attachment; filename="work-order.pdf"', "Cache-Control": "private, no-store",
  } });
}
// #endregion

// #region sjs:extract-from-paper.server
// POST /api/work-orders/extract — read the answers from the uploaded scan; return them as a draft response
export async function extractWorkOrder(req: Request) {
  const [scan] = await scans(req);   // the file in the field "scan", at most 5 MB
  if (!scan) throw httpError(400, 'Upload the scan in a field named "scan"');
  if (!detectType(scan.buffer)) throw httpError(400, "The file is not a PDF, PNG, JPEG, WebP or GIF document");
  const definition = JSON.parse(workOrder(req)!.json);
  if (lintSurvey(definition, lintOptions).findings.some((finding) => finding.severity === "error")) {
    surveyjs.logFailure("extract-from-paper", "the work-order definition has errors");
    return Response.json({ error: "The stored definition has errors" }, { status: 500 });
  }
  let result: Extraction;
  try {
    const provider = aiProvider.create(config.extraction);   // from SURVEYJS_AI_PROVIDER and its key
    const extractor = createExtractor({ provider, adapter: "surveyjs", options: {} });
    const formDefinition = surveyjs.toFormDefinition(definition);
    result = await surveyjs.withTimeout(extractor.extractFromImage({ image: scan.buffer, formDefinition }), 120_000) as Extraction;
    if (!isObject(result?.data)) throw new TypeError("The extractor returned no answers object");   // rawResponse repeats the form
  } catch (error) {
    const status = error instanceof AiConfigurationError ? 503 : (error as Error).name === "TimeoutError" ? 504 : 502;
    if (status !== 503) surveyjs.logFailure("extract-from-paper", error, { withMessage: false });   // it may quote the answers
    return Response.json({ error: EXTRACTION_ERRORS[status] }, { status });
  }
  return Response.json({ answers: result.data, confidence: result.confidence ?? [], uniqueId: result.uniqueId ?? null });   // never rawResponse
}
// #endregion
