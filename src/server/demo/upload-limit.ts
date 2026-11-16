// Demo only: on the hosted demo (DEMO_MODE=true), a file over 5 MB answers 413 with the demo's own message, before
// any other check of the batch, as the reference's middleware does. The handlers' upload limit is 5 MB too, so
// readFiles() (integration/http.ts) stops at the same point: route() only swaps the answer. Off the demo,
// /api/files answers 422 and the scan 413, as the contract says.
import config from "../config.ts";
import { HttpError } from "../integration/http.ts";

export function demoUploadLimit(error: unknown): Response | null {
  if (!config.demoMode || !(error instanceof HttpError) || error.code !== "LIMIT_FILE_SIZE") return null;
  return Response.json({ error: "Files over 5 MB are not accepted on the demo" }, { status: 413 });
}
