// GET /up: the health route. It answers without touching the database (or a sandbox).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
