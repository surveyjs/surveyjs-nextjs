// Demo only: /shared/<path>, only the four folders every platform serves (client, definitions, samples, ui),
// resolved so nothing outside them is reachable, with Content-Type by extension
import { sharedFile } from "../../../server/demo/shared-files.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  return sharedFile((await params).path);
}
