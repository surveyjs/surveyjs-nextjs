// POST /api/claims
import { db, transaction } from "../db.ts";
import { httpError, readJson } from "../integration/http.ts";
import { insertResponse } from "../integration/stored-json.ts";

type Envelope = { data?: { customer_email?: string; amount?: number } | null; definitionVersion?: string };

// #region sjs:relational-storage.server
// POST /api/claims — original JSON first, then the columns you query
export async function saveClaim(req: Request) {
  const { data, definitionVersion } = ((await readJson(req)) ?? {}) as Envelope;   // the parsed raw body: {} stays {}
  if (data == null || definitionVersion == null) throw httpError(400, "Expected { data, definitionVersion }");

  const id = transaction(db(req), () => {
    const responseId = insertResponse(req, "claim", data, definitionVersion);   // the original and its version
    db(req).prepare("INSERT INTO claims (response_id, customer_email, amount) VALUES (?, ?, ?)")
      .run(responseId, data.customer_email ?? null, data.amount ?? null);        // keys come from valueName
    return responseId;
  });
  return Response.json({ id }, { status: 201 });
}
// #endregion

