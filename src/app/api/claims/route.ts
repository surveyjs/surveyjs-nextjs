// POST /api/claims: Use Relational Storage
import { methods, route } from "../../../server/integration/http.ts";
import { saveClaim } from "../../../server/routes/relational-storage.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  POST: route(saveClaim),
});
