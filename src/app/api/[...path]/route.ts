// Every other /api path: 404 { error: "Not found" }, JSON like every answer under /api (Next.js would send its HTML 404)
import { notFound } from "../../../server/integration/http.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = notFound;
export const HEAD = notFound;
export const POST = notFound;
export const PUT = notFound;
export const PATCH = notFound;
export const DELETE = notFound;
export const OPTIONS = notFound;
