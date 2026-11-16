// GET|PUT|DELETE /api/progress/:formId
import { currentUser } from "../auth.ts";
import { db } from "../db.ts";
import { httpError, readJson } from "../integration/http.ts";

// #region sjs:resume-progress.server
// Return the current user's saved answers and UI state
export function loadProgress(req: Request, { formId }: { formId: string }) {
  const user = currentUser(req);
  if (!user) throw httpError(401, "Sign in to load progress");
  const row = db(req).prepare("SELECT json FROM progress WHERE key = ?").get(`${user.id}:${formId}`) as { json: string } | undefined;

  // the document as stored, or null when there is none
  return new Response(row?.json ?? "null", { headers: { "Content-Type": "application/json" } });
}

// Store progress under a key containing both the user ID and form ID
export async function saveProgress(req: Request, { formId }: { formId: string }) {
  const user = currentUser(req);
  if (!user) throw httpError(401, "Sign in to save progress");
  const progress = await readJson(req);   // the parsed raw body: {} stays {}; store it with JSON.stringify, never a copy
  if (progress === undefined) throw httpError(400, "Expected { data, uiState }");   // not a JSON body
  db(req).prepare("INSERT INTO progress (key, json) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET json = excluded.json")
    .run(`${user.id}:${formId}`, JSON.stringify(progress));

  return new Response(null, { status: 204 });
}
// #endregion

// #region sjs:resume-progress.delete
// Remove only the current user's draft
export function clearProgress(req: Request, { formId }: { formId: string }) {
  const user = currentUser(req);
  if (!user) throw httpError(401, "Sign in to clear progress");
  db(req).prepare("DELETE FROM progress WHERE key = ?").run(`${user.id}:${formId}`);

  return new Response(null, { status: 204 });
}
// #endregion
