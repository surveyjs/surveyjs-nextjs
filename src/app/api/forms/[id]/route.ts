// GET /api/forms/:id: Load JSON Schemas, Variables, and Answers (Option B); Creator reads its .definition
// PUT /api/forms/:id: Load and Save Form JSON Schemas, or Lint JSON Schemas when LINT_DEFINITIONS=true
import config from "../../../../server/config.ts";
import { methods, route } from "../../../../server/integration/http.ts";
import { saveForm } from "../../../../server/routes/creator-load-save.ts";
import { lintAndSaveForm } from "../../../../server/routes/lint-definition.ts";
import { loadForm } from "../../../../server/routes/load-definition-variables-data.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(loadForm),
  // lint-definition.ts replaces creator-load-save.ts's PUT when LINT_DEFINITIONS=true
  PUT: route(config.lintDefinitions ? lintAndSaveForm : saveForm),
});
