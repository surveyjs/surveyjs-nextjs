// Demo only: GET /demo/stored/:slug, the Data panel ("What the server stored")
import { methods, route } from "../../../../server/integration/http.ts";
import { storedRoute } from "../../../../server/demo/stored.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const { GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS } = methods({
  GET: route(storedRoute),
});
