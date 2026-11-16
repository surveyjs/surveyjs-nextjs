// GET /api/files/:id: Store Files Separately
import { methods, route } from "../../../../server/integration/http.ts";
import { downloadFile } from "../../../../server/routes/store-files.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(downloadFile),
});
