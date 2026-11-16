// Demo only: adds X-Demo-Cache: hit / miss / fallback to GET /api/countries, so the requests log shows where the
// list came from. It looks at the cache before the handler runs and at the answer after, so
// routes/choices-from-web.ts stays as the docs show it. "fallback" wins whenever the bundled list is served, also
// while it is cached.
import { cache } from "../integration/cache.ts";
import { readShared } from "../paths.ts";

let bundled: string | undefined;

export async function demoCacheHeader(req: Request, handle: () => Promise<Response>): Promise<Response> {
  if (req.method !== "GET" || new URL(req.url).pathname !== "/api/countries") return handle();
  const cached = cache.has("countries");
  const response = await handle();
  if (!response.ok) return response;
  bundled ??= JSON.stringify(readShared("seed/countries.json"));
  const body = JSON.stringify(await response.clone().json());
  response.headers.set("X-Demo-Cache", body === bundled ? "fallback" : cached ? "hit" : "miss");
  return response;
}
