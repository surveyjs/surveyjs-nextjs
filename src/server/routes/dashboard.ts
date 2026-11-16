// GET /api/responses
import { db } from "../db.ts";
import { query } from "../integration/http.ts";

// #region sjs:dashboard.server
// GET /api/responses?formId=&includeCreatedAt=&from=&to=&limit=&offset=
export function listResponses(req: Request) {
  const to = query(req, "to");
  const limit = Math.min(Math.max(Number.parseInt(query(req, "limit") ?? "500", 10) || 0, 1), 5000);   // page on the server
  const offset = Math.max(Number.parseInt(query(req, "offset") ?? "0", 10) || 0, 0);
  const rows = db(req).prepare(`SELECT data, created_at FROM responses
    WHERE form_id = ? AND created_at >= ? ${to ? "AND substr(created_at, 1, 10) <= ?" : ""}
    ORDER BY created_at, id LIMIT ? OFFSET ?`)   // ISO 8601 UTC strings compare as dates
    .all(query(req, "formId") ?? "", query(req, "from") ?? "1970-01-01", ...(to ? [to] : []), limit, offset) as { data: string; created_at: string }[];

  // Include submission dates separately when requested by Dashboard
  if (/^(1|true|on|yes)$/.test(query(req, "includeCreatedAt") ?? "")) {
    return Response.json(rows.map((row) => ({ data: JSON.parse(row.data), createdAt: row.created_at })));
  }
  return new Response(`[${rows.map((row) => row.data).join(",")}]`, { headers: { "Content-Type": "application/json" } });   // as stored
}
// #endregion
