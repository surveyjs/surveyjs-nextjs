// POST /api/translate: Translate with AI
import { methods, route } from "../../../server/integration/http.ts";
import { translate } from "../../../server/routes/ai-translation.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  POST: route(translate),
});
