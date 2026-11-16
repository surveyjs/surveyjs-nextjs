// Demo only: on the hosted demo (DEMO_MODE=true), /api/translate and /api/work-orders/extract allow 20 calls per
// visitor (demo_sid) per UTC day. route() asks before each handler. The counts live in this process: with several
// processes, keep them in a shared store (Redis, a table) instead.
import config from "../config.ts";
import { processState } from "../process-state.ts";
import { requestSandbox } from "./sandbox.ts";

const LIMIT = 20;
const PATHS = ["/api/translate", "/api/work-orders/extract"];
const calls = processState("ai-calls", () => new Map<string, number>());   // "<demo_sid>:<YYYY-MM-DD>" => count

/** The 429 answer once the visitor has used today's calls, or null. */
export function demoAiLimit(req: Request): Response | null {
  if (!config.demoMode || req.method !== "POST" || !PATHS.includes(new URL(req.url).pathname)) return null;
  const key = `${requestSandbox(req)?.id}:${new Date().toISOString().slice(0, 10)}`;
  const count = calls.get(key) ?? 0;
  if (count >= LIMIT) return Response.json({ error: "The demo allows 20 AI calls per visitor per day" }, { status: 429 });
  calls.set(key, count + 1);
  const oldest = calls.keys().next().value;
  if (calls.size > 10_000 && oldest !== undefined) calls.delete(oldest);   // forget the oldest visitors first
  return null;
}
