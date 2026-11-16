// GET|PUT|DELETE /api/progress/:formId: Resume Progress
import { methods, route } from "../../../../server/integration/http.ts";
import { clearProgress, loadProgress, saveProgress } from "../../../../server/routes/resume-progress.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(loadProgress),
  PUT: route(saveProgress),
  DELETE: route(clearProgress),
});
