// HTTP plumbing the handlers share, in Web Request / Response terms: errors with a status, the JSON and multipart
// readers (route handlers get no body parser and no size limit), the query string, the origin behind a
// proxy, outbound fetch with a timeout, and route(), which every src/app/**/route.ts wraps its handlers in.
// Not demo code: route() calls the demo-only files below around each handler, each marked where it does.
import { demoAiLimit } from "../demo/ai-limit.ts";
import { demoCacheHeader } from "../demo/cache-header.ts";
import { demoSandbox } from "../demo/sandbox.ts";
import { demoUploadLimit } from "../demo/upload-limit.ts";

/** An error route() answers as { error: message } with this status. `expose` says the message is meant for the client. */
export class HttpError extends Error {
  status: number;
  expose = true;
  code: string | undefined;
  headers: Record<string, string>;
  constructor(status: number, message: string, { code, headers = {} }: { code?: string; headers?: Record<string, string> } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.headers = headers;
  }
}

/** throw httpError(404, "Unknown form"): the client gets 404 { error: "Unknown form" }. */
export function httpError(status: number, message: string, options?: { code?: string; headers?: Record<string, string> }) {
  return new HttpError(status, message, options);
}

const MESSAGES: Record<number, string> = {
  400: "Bad request", 401: "Unauthorized", 403: "Forbidden", 404: "Not found", 405: "Method not allowed", 411: "Length required",
  413: "The request body is too large", 415: "Unsupported media type", 422: "Unprocessable content", 429: "Too many requests",
};

// ---------------------------------------------------------------------------------------------
// route(): the same error shape on every platform

export type Params = Record<string, string | string[] | undefined>;
export type Handler<P extends Record<string, string> = Record<string, string>> = (req: Request, params: P) => Response | Promise<Response>;
type Context = { params: Promise<Params> };

/**
 * Wrap a handler for a route.ts export. Next.js 16 passes params as a Promise: route() awaits it, so handlers get
 * plain strings. An HttpError becomes { error } with its status; any other exception is logged with its stack and
 * answered 500 { error: "Internal server error" }, never Next.js's empty or HTML 500. The demo hooks (the visitor
 * sandbox's cookie, the AI-call cap, X-Demo-Cache, the demo's 5 MB answer) run around the handler.
 */
export function route<P extends Record<string, string>>(handler: Handler<P>) {
  return async (req: Request, context?: Context): Promise<Response> => {
    let sandboxCookie: string | null = null;
    let response: Response;
    try {
      sandboxCookie = demoSandbox(req);   // Demo only: the visitor's sandbox (DEMO_MODE=true) and its demo_sid cookie
      const params = Object.fromEntries(Object.entries((await context?.params) ?? {})
        .map(([key, value]) => [key, Array.isArray(value) ? value.join("/") : (value ?? "")]));
      response = demoAiLimit(req)                                       // Demo only: 20 AI calls a day
        ?? await demoCacheHeader(req, async () => handler(req, params as P));   // Demo only: X-Demo-Cache on /api/countries
    } catch (error) {
      response = demoUploadLimit(error) ?? errorResponse(req, error);   // Demo only: the 5 MB cap's own answer
    }
    if (sandboxCookie) response.headers.append("Set-Cookie", sandboxCookie);
    return response;
  };
}

function errorResponse(req: Request, error: unknown): Response {
  if (error instanceof HttpError) {
    return Response.json({ error: error.message }, { status: error.status, headers: error.headers });
  }
  console.error(`${req.method} ${new URL(req.url).pathname}:`, error);   // an exception: log it with its stack
  return Response.json({ error: "Internal server error" }, { status: 500 });
}

/** 404 { error: "Not found" }: src/app/api/[...path]/route.ts answers every unknown /api path with it. */
export const notFound = route(() => {
  throw httpError(404, MESSAGES[404]);
});

const METHODS = ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] as const;
type Method = (typeof METHODS)[number];
type RouteExport = (req: Request, context?: Context) => Promise<Response>;

/**
 * Every method for a route.ts, so a known path with another method answers 405 { error } with Allow (Next.js's own
 * 405 has an empty body). GET also answers HEAD, as Express does.
 */
export function methods(handlers: Partial<Record<Method, RouteExport>>): Record<Method, RouteExport> {
  const allowed = METHODS.filter((method) => handlers[method] || (method === "HEAD" && handlers.GET));
  const notAllowed = route(() => {
    throw httpError(405, MESSAGES[405], { headers: { Allow: allowed.join(", ") } });
  });
  const result = {} as Record<Method, RouteExport>;
  for (const method of METHODS) result[method] = handlers[method] ?? (method === "HEAD" ? handlers.GET : undefined) ?? notAllowed;
  return result;
}

// ---------------------------------------------------------------------------------------------
// Request bodies

/** 12 MB: a Creator definition with images or a long form is bigger than the usual 1 MB default. */
const JSON_LIMIT = 12 * 1024 * 1024;

const contentType = (req: Request) => (req.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();

/** Content-Length when the request has one, else null. */
const declaredLength = (req: Request) => {
  const header = req.headers.get("content-length");
  return header === null || !/^\d+$/.test(header) ? null : Number(header);
};

/** The body as bytes, refused with 413 once it passes the limit, from Content-Length and while reading. */
async function readBody(req: Request, limit: number, tooLarge: string): Promise<Buffer> {
  const length = declaredLength(req);
  if (length !== null && length > limit) {
    await req.body?.cancel();
    throw httpError(413, tooLarge);
  }
  if (!req.body) return Buffer.alloc(0);
  const chunks: Uint8Array[] = [];
  let size = 0;
  for await (const chunk of req.body) {
    size += chunk.byteLength;
    if (size > limit) throw httpError(413, tooLarge);
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/**
 * The JSON body, parsed from the raw text with JSON.parse: {} stays {}, "  padded  " and "" stay as sent, and any
 * JSON value comes back (a top-level null or string is the handler's wrong envelope, not a parse error). Another
 * content type gives undefined, which every handler treats as a wrong envelope. Don't copy what it returns: store
 * JSON.stringify() of it (see integration/stored-json.ts). 1.0 comes back as 1, as in every JavaScript backend.
 */
export async function readJson(req: Request): Promise<unknown> {
  if (contentType(req) !== "application/json") return undefined;
  const charset = /;\s*charset=("?)([^";]+)\1/i.exec(req.headers.get("content-type") ?? "")?.[2].toLowerCase();
  if (charset && charset !== "utf-8" && charset !== "utf8") throw httpError(415, `Unsupported charset "${charset.toUpperCase()}"`);
  const text = (await readBody(req, JSON_LIMIT, MESSAGES[413])).toString("utf8");
  if (text.trim() === "") return {};   // as Express's json parser: an empty JSON body is {}
  try {
    return JSON.parse(text);
  } catch {
    throw httpError(400, "The request body is not valid JSON");
  }
}

/** An uploaded file: its bytes, the client's name (kept as sent, UTF-8) and the type it claimed (never trusted). */
export type UploadedFile = { name: string; type: string; size: number; buffer: Buffer; field: string };

/**
 * The files of a multipart/form-data body. Request.formData() buffers the whole body in memory and has no limit of
 * its own, so this refuses a body without Content-Length, or bigger than `maxFiles` files of `maxFileSize` plus 1 MB
 * of headroom, before reading it. Then each file is checked against `maxFileSize` (code LIMIT_FILE_SIZE: the
 * route's own message, or the demo's 413), and a file in another field gets `wrongField` (LIMIT_UNEXPECTED_FILE).
 * A body that isn't multipart has no files.
 */
export async function readFiles(req: Request, field: string, { maxFileSize, maxFiles, tooLarge, wrongField, tooMany = tooLarge }: {
  maxFileSize: number; maxFiles: number; tooLarge: HttpErrorArgs; wrongField: HttpErrorArgs; tooMany?: HttpErrorArgs;
}): Promise<UploadedFile[]> {
  if (contentType(req) !== "multipart/form-data") return [];
  const length = declaredLength(req);
  if (length === null) throw httpError(411, "Send the upload with a Content-Length header");
  if (length > maxFiles * maxFileSize + 1024 * 1024) throw httpError(...tooMany, { code: "LIMIT_FILE_SIZE" });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    throw httpError(400, "The request body is not valid multipart/form-data");
  }
  const uploads: UploadedFile[] = [];
  for (const [name, value] of form.entries()) {
    if (typeof value === "string") continue;   // a text field
    if (name !== field) throw httpError(...wrongField, { code: "LIMIT_UNEXPECTED_FILE" });
    if (value.size > maxFileSize) throw httpError(...tooLarge, { code: "LIMIT_FILE_SIZE" });
    if (uploads.length === maxFiles) throw httpError(...tooMany, { code: "LIMIT_FILE_COUNT" });
    uploads.push({ name: value.name, type: value.type, size: value.size, buffer: Buffer.from(await value.arrayBuffer()), field: name });
  }
  return uploads;
}

type HttpErrorArgs = [status: number, message: string];

// ---------------------------------------------------------------------------------------------
// Query strings and the origin

/** A query parameter: the first value, or null. URLSearchParams never gives an array (Express 5 would). */
export const query = (req: Request, name: string): string | null => new URL(req.url).searchParams.get(name);

/**
 * The origin the visitor sees: X-Forwarded-Proto and X-Forwarded-Host (else Host) behind a TLS proxy (Traefik,
 * nginx, App Service), for absolute URLs, the canonical link, the ws/wss relay URLs and the Secure cookie flag.
 * This trusts any proxy; in your own production, accept these headers only from the proxy's addresses.
 */
export function requestOrigin(req: Request | { headers: Headers }): { protocol: "http" | "https"; host: string; origin: string } {
  const first = (name: string) => req.headers.get(name)?.split(",")[0].trim() || null;
  const protocol = first("x-forwarded-proto") === "https" ? "https" : first("x-forwarded-proto") === "http" ? "http"
    : req instanceof Request && new URL(req.url).protocol === "https:" ? "https" : "http";
  const host = first("x-forwarded-host") ?? first("host") ?? (req instanceof Request ? new URL(req.url).host : "localhost");
  return { protocol, host, origin: `${protocol}://${host}` };
}

// ---------------------------------------------------------------------------------------------
// Outbound calls

/** Why an outbound call failed: the remote end took too long, wasn't listening, or answered with an error. */
export class FetchError extends Error {
  timedOut: boolean;
  refused: boolean;
  status: number | null;
  constructor(message: string, { timedOut = false, refused = false, status = null, cause }: { timedOut?: boolean; refused?: boolean; status?: number | null; cause?: unknown } = {}) {
    super(message, { cause });
    this.timedOut = timedOut;
    this.refused = refused;
    this.status = status;
  }
}

/**
 * fetch() with a timeout, which tells a timeout from a refused connection and treats a 4xx or 5xx answer as a
 * failure (fetch itself only throws when nothing answered). Returns the response, whose body is still unread.
 * cache: "no-store": the app keeps its own TTL cache (countries), so Next.js's fetch cache never holds an answer.
 */
export async function fetchWithTimeout(url: string, { timeout, ...init }: RequestInit & { timeout: number }): Promise<Response> {
  let response;
  try {
    response = await fetch(url, { ...init, cache: "no-store", signal: AbortSignal.timeout(timeout) });
  } catch (error) {
    const timedOut = (error as Error).name === "TimeoutError";
    const refused = ((error as Error).cause as { code?: string } | undefined)?.code === "ECONNREFUSED";
    throw new FetchError(`${new URL(url).origin} ${timedOut ? "timed out" : refused ? "refused the connection" : "is unreachable"}`, { timedOut, refused, cause: error });
  }
  if (!response.ok) {
    await response.body?.cancel();
    throw new FetchError(`${new URL(url).origin} answered ${response.status}`, { status: response.status });
  }
  return response;
}
