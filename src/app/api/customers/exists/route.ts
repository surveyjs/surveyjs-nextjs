// GET /api/customers/exists: Async Calculations and Validation
import { methods, route } from "../../../../server/integration/http.ts";
import { customerExists } from "../../../../server/routes/async-functions.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(customerExists),
});
