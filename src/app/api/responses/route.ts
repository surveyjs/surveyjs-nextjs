// POST /api/responses: Save Responses, or Validate Responses when VALIDATE_RESPONSES=true
// GET /api/responses: Analyze Results with Dashboard
import config from "../../../server/config.ts";
import { methods, route } from "../../../server/integration/http.ts";
import { listResponses } from "../../../server/routes/dashboard.ts";
import { saveResponse } from "../../../server/routes/save-response.ts";
import { validateResponse } from "../../../server/routes/validate-response.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  // validate-response.ts replaces save-response.ts when VALIDATE_RESPONSES=true, so save-response stays minimal
  POST: route(config.validateResponses ? validateResponse : saveResponse),
  GET: route(listResponses),
});
