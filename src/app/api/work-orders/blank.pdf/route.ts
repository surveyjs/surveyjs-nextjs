// GET /api/work-orders/blank.pdf: Extract Responses from Documents (the blank work order)
import { methods, route } from "../../../../server/integration/http.ts";
import { blankWorkOrder } from "../../../../server/routes/extract-from-paper.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(blankWorkOrder),
});
