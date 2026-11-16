// POST /api/work-orders/extract: Extract Responses from Documents
import { methods, route } from "../../../../server/integration/http.ts";
import { extractWorkOrder } from "../../../../server/routes/extract-from-paper.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  POST: route(extractWorkOrder),
});
