// GET /claim (src/app/claim/page.tsx renders it), GET /api/forms/:id
import { currentUser } from "../auth.ts";
import { db } from "../db.ts";
import { httpError, query } from "../integration/http.ts";
import { readShared } from "../paths.ts";

// #region sjs:load-definition-variables-data.server
// Option A: Embed the schema and user variables in the HTML response (src/app/claim/page.tsx renders them)
export function loadClaimPage(req: Request) {
  const definition = readShared("definitions/load-definition-variables-data.json");
  const user = currentUser(req);
  const variables = { user: { name: user?.name ?? null, plan: user?.plan ?? null } };
  return { definition, variables };   // the page escapes both with scriptJson()
}

// Option B: Return the definition, variables, and previous answers in one response
export function loadForm(req: Request, { id }: { id: string }) {
  const form = db(req).prepare("SELECT json FROM forms WHERE key = ?").get(id) as { json: string } | undefined;
  if (!form) throw httpError(404, "Unknown form");
  const user = currentUser(req);
  const saved = (id === "claim-request"   // only the signed-in customer's own claims
    ? db(req).prepare("SELECT data FROM responses WHERE id = ? AND form_id = 'claim' AND data ->> 'customer_email' = ?")
      .get(query(req, "record") ?? "", user?.email ?? "")
    : db(req).prepare("SELECT data FROM responses WHERE id = ?").get(query(req, "record") ?? "")) as { data: string } | undefined;

  return Response.json({
    definition: JSON.parse(form.json),                                // the stored form definition
    variables: { user: { name: user?.name ?? null, plan: user?.plan ?? null } },
    data: saved ? JSON.parse(saved.data) : {},                       // previous answers, or {} when there are none
  });
}
// #endregion
