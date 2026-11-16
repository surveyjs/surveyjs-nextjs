// Run Server-Side Workflows, in process: the plumbing around the SurveyJS calls the handler files make. The same
// libraries SurveyJS Server uses (https://github.com/surveyjs/surveyjs-server at db1ac24: src/validator.ts, pdf.ts,
// extractor.ts) run inside this app, so it accepts and rejects what the service does. When you copy validate-response,
// lint-definition, server-pdf or extract-from-paper, copy this file too.
//
// Why no 502 or 504 for lint, validation or PDFs: they run on this app's CPU, so a failure there is this app's own
// error (500), and a timer can't stop synchronous work. 502 and 504 are kept for the AI provider, the one upstream left.
import { setLicenseKey, type SurveyError, type SurveyModel } from "survey-core";
import { SurveyPDF } from "survey-pdf";
import config from "../config.ts";

// The route handlers are Next.js's own module graph, with their own copy of survey-core: server.ts's
// setLicenseKey() doesn't reach it, so the key is set here too, once, for server PDFs
if (config.licenseKey) setLicenseKey(config.licenseKey);

/**
 * The service's linter options. The linter reports an unknown element, validator or trigger type below the error
 * level, but the deserializer drops such an object, so a response would be validated against less than the
 * definition says: raise them to errors.
 */
export const lintOptions = {
  rules: { "element/unknown-type": "error", "validator/unknown-type": "error", "trigger/unknown-type": "error" },
} as const;

type Definition = Record<string, unknown>;

export const surveyjs = {
  /**
   * The errors of a response, as validator.ts collects them: the data errors from setData(), then every question's
   * getAllErrors() (matrix cells, multiple text items and dynamic panels included) and every panel's errors.
   */
  responseErrors(survey: SurveyModel, dataErrors: unknown[]): unknown[] {
    return [
      ...dataErrors,
      ...survey.getAllQuestions(true).flatMap((question) => question.getAllErrors()),
      ...survey.getAllPanels(true).flatMap((panel) => (panel as unknown as { errors: SurveyError[] }).errors),
    ];
  },

  /** A PDF of the definition, filled with data when given (otherwise a blank, fillable form), as pdf.ts makes it. */
  async renderPdf(definition: Definition, data?: unknown): Promise<Buffer> {
    const pdf = new SurveyPDF(definition, {});
    if (data) pdf.data = data;
    return Buffer.from((await pdf.raw("arraybuffer")) as unknown as ArrayBuffer);
  },

  /** True for PDF bytes: a renderer that answers anything else has failed. */
  isPdf(bytes: unknown): bytes is Buffer {
    return Buffer.isBuffer(bytes) && bytes.toString("latin1", 0, 5) === "%PDF-";
  },

  /** Rejects with a TimeoutError after ms. The extractor takes no AbortSignal, so its request runs on unseen. */
  withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let timer: NodeJS.Timeout | undefined;
    const timeout = new Promise<never>((resolve, reject) => {
      timer = setTimeout(() => reject(Object.assign(new Error(`No answer within ${ms / 1000} s`), { name: "TimeoutError" })), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  },

  /**
   * Log a failure of this app's SurveyJS work or of the AI provider. Extraction errors are logged by name only:
   * their messages may quote the AI's answer, which holds the answers written on the form.
   */
  logFailure(what: string, error: unknown, { withMessage = true } = {}): void {
    const detail = error instanceof Error ? (withMessage ? error.stack : error.name) : String(error ?? "no PDF bytes");
    console.error(`${what}: ${detail}`);
  },

  /** The extractor looks for questions in `pages` only; a definition without pages keeps them at the root (extractor.ts). */
  toFormDefinition(definition: Definition): Definition {
    const rootElements = definition.elements ?? definition.questions;
    if (Array.isArray(definition.pages) || !Array.isArray(rootElements)) return definition;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars -- the definition without its root elements
    const { elements, questions, ...rest } = definition;
    return { ...rest, pages: [{ elements: rootElements }] };
  },
};
