// POST /api/responses
import { httpError, readJson } from "../integration/http.ts";
import { insertResponse } from "../integration/stored-json.ts";

type Envelope = { formId?: string; data?: unknown };

// #region sjs:save-response.server
// POST /api/responses: Store submitted answers as one JSON document
// readJson() parses the raw body: {} stays {}, "  padded  " and "" stay as sent
export async function saveResponse(req: Request) {
  const { formId, data } = ((await readJson(req)) ?? {}) as Envelope;
  if (formId == null || data == null) throw httpError(400, "Expected { formId, data }");

  const id = insertResponse(req, formId, data);   // JSON.stringify(data), never a copy of it
  return Response.json({ id }, { status: 201 });
}
// #endregion
