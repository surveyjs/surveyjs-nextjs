// POST /api/translate
import config from "../config.ts";
import { aiTranslation } from "../integration/ai-translation.ts";
import { httpError, readJson } from "../integration/http.ts";

type Envelope = { strings?: unknown; from?: unknown; to?: unknown };

// #region sjs:ai-translation.server
// POST /api/translate — strings in, translated strings out (same order); nothing goes to SurveyJS
export async function translate(req: Request) {
  const { ai } = config;
  if (!ai.apiKey) throw httpError(501, "Set AI_API_KEY to enable translation");
  const { strings, from = "", to = "" } = ((await readJson(req)) ?? {}) as Envelope;
  if (!Array.isArray(strings)) throw httpError(400, "Expected { strings, from, to }");

  const translated = await aiTranslation.translate(ai, strings, String(from), String(to));   // any OpenAI-compatible provider
  if (!Array.isArray(translated) || translated.length !== strings.length || !translated.every((s) => typeof s === "string")) {
    throw httpError(502, "The AI provider returned an unexpected answer");
  }
  return Response.json(translated);   // what options.callback() takes
}
// #endregion
