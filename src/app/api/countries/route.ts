// GET /api/countries: Load Choices from Web
import { methods, route } from "../../../server/integration/http.ts";
import { listCountries } from "../../../server/routes/choices-from-web.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(listCountries),
});
