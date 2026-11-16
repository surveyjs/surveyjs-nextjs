// GET|PUT /api/variable-presets/:formId: Variable Presets
import { methods, route } from "../../../../server/integration/http.ts";
import { loadPresets, savePresets } from "../../../../server/routes/variable-presets.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(loadPresets),
  PUT: route(savePresets),
});
