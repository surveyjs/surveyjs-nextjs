// POST /api/files: Store Files Separately (Creator's uploads use it too)
import { methods, route } from "../../../server/integration/http.ts";
import { storeFiles } from "../../../server/routes/store-files.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  POST: route(storeFiles),
});
