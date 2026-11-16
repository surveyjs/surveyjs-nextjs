// GET /api/claims/:id/pdf: Generate PDFs
import { methods, route } from "../../../../../server/integration/http.ts";
import { claimPdf } from "../../../../../server/routes/server-pdf.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(claimPdf),
});
