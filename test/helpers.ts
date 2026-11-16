// Shared by the node:test files. They call the route handlers directly: each src/app/**/route.ts is imported by Node
// itself (it runs .ts with type stripping) and called with new Request(...), the way Next.js calls it, so no Next.js
// server is needed. The relays get a plain http.Server with attachRelays().
//
// src/server/config.ts reads process.env once, so a test file calls startApp() before it imports anything from
// src/server (node --test runs each file in its own process). Import the app's modules dynamically after it.
import { mkdtempSync, rmSync } from "node:fs";
import { globSync } from "node:fs";
import { createServer, type Server } from "node:http";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";

type RouteModule = Record<string, (req: Request, context: { params: Promise<Record<string, string | string[]>> }) => Promise<Response> | Response>;
type Route = { segments: string[]; file: string; module?: RouteModule };

export type TestResponse = { status: number; headers: Headers; bytes: Buffer; text: string; data: unknown };
export type RequestOptions = { json?: unknown; body?: BodyInit; user?: string | null; headers?: Record<string, string>; raw?: boolean };

const root = join(import.meta.dirname, "..");

/** The app's route.ts files, most specific first: static segments before [param] before [...catchAll], as Next.js routes. */
function routes(): Route[] {
  const rank = (segment: string) => (segment.startsWith("[...") ? 2 : segment.startsWith("[") ? 1 : 0);
  return globSync("src/app/**/route.ts", { cwd: root })
    .map((file) => ({ file: join(root, file), segments: relative("src/app", file).split(sep).slice(0, -1) }))
    .sort((a, b) => {
      for (let i = 0; i < Math.max(a.segments.length, b.segments.length); i++) {
        const diff = rank(a.segments[i] ?? "") - rank(b.segments[i] ?? "");
        if (diff !== 0) return diff;
      }
      return b.segments.length - a.segments.length;
    });
}

function match(route: Route, parts: string[]): Record<string, string | string[]> | null {
  const params: Record<string, string | string[]> = {};
  for (let i = 0; i < route.segments.length; i++) {
    const segment = route.segments[i];
    if (segment.startsWith("[...")) {
      if (i >= parts.length) return null;
      params[segment.slice(4, -1)] = parts.slice(i);
      return params;
    }
    if (i >= parts.length) return null;
    if (segment.startsWith("[")) params[segment.slice(1, -1)] = parts[i];
    else if (segment !== parts[i]) return null;
  }
  return route.segments.length === parts.length ? params : null;
}

/** Point the app at a fresh, seeded DATA_DIR with these environment variables, then give a request helper. */
export async function startApp(env: Record<string, string> = {}) {
  const dataDir = mkdtempSync(join(tmpdir(), "surveyjs-test-"));
  Object.assign(process.env, { NODE_ENV: "test", DATA_DIR: dataDir, APP_PORT: "0", SURVEYJS_BUILD: "test" }, env);
  process.chdir(root);
  const { default: config } = await import("../src/server/config.ts");
  const { close, database } = await import("../src/server/db.ts");
  const { seed } = await import("../src/server/seed.ts");
  seed(config.databasePath);

  const table = routes();
  const origin = "http://127.0.0.1:8000";
  const jar: { sid: string | null } = { sid: null };

  /** A request with demo_user (alice unless given; null for signed out) and the demo_sid the server issued. */
  async function request(method: string, path: string, { json, body, user = "alice", headers = {}, raw }: RequestOptions = {}): Promise<TestResponse> {
    const cookie = [jar.sid && `demo_sid=${jar.sid}`, user && `demo_user=${user}`].filter(Boolean).join("; ");
    const init: RequestInit & { headers: Record<string, string> } = { method, headers: { ...headers, ...(cookie ? { Cookie: cookie } : {}) } };
    if (json !== undefined) {
      init.headers["Content-Type"] ??= "application/json";
      init.body = raw ? (json as string) : JSON.stringify(json);
    } else if (body !== undefined) init.body = body;
    // As a browser sends it: the body's bytes with Content-Length (and the multipart boundary for FormData)
    let req = new Request(origin + path, init);
    if (init.body !== undefined) {
      const bytes = new Uint8Array(await req.arrayBuffer());
      const sent = new Headers(req.headers);
      sent.set("Content-Length", String(bytes.byteLength));
      req = new Request(origin + path, { method, headers: sent, body: bytes });
    }
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean).map(decodeURIComponent);
    let response: Response | undefined;
    for (const route of table) {
      const params = match(route, parts);
      if (!params) continue;
      route.module ??= (await import(pathToFileURL(route.file).href)) as RouteModule;
      const handler = route.module[method];
      if (!handler) throw new Error(`${route.file} exports no ${method}`);
      response = await handler(req, { params: Promise.resolve(params) });
      break;
    }
    if (!response) throw new Error(`No route.ts for ${path}`);
    for (const line of response.headers.getSetCookie()) {
      const m = /^demo_sid=([^;]*)/.exec(line);
      if (m) jar.sid = m[1];
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const text = bytes.toString("utf8");
    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      data = undefined;
    }
    return { status: response.status, headers: response.headers, bytes, text, data };
  }

  return {
    config,
    jar,
    request,
    /** The app's shared database; in demo mode sandboxDb() is the visitor's copy. */
    db: () => database(config.databasePath),
    sandboxDb: () => database(join(dataDir, "sandbox", `${jar.sid}.sqlite`)),
    stop() {
      close();
      rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
    },
  };
}

/** The relays on a plain http.Server on a free port, for the app startApp() configured. */
export async function startRelays() {
  const { attachRelays } = await import("../src/server/relay/index.ts");
  const server: Server = createServer((req, res) => res.writeHead(404).end());
  const relays = attachRelays(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;
  return {
    url: `ws://127.0.0.1:${port}`,
    async stop() {
      relays.close();
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

export type Message = Record<string, unknown> & { type?: string };

/** A WebSocket client that keeps every message, with next(type) to wait for one. */
export function socket(url: string, cookie?: string) {
  // Node's WebSocket takes headers like the browser can't; the relay reads the cookies from the upgrade request
  const ws = new WebSocket(url, cookie ? ({ headers: { Cookie: cookie } } as unknown as string[]) : undefined);
  const messages: Message[] = [];
  const waiters: { test: (m: Message) => boolean; resolve: (m: Message) => void }[] = [];
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as Message;
    const waiter = waiters.find((w) => w.test(message));
    if (waiter) {
      waiters.splice(waiters.indexOf(waiter), 1);
      waiter.resolve(message);
    } else messages.push(message);
  });
  const opened = new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", () => reject(new Error(`could not connect to ${url}`)), { once: true });
  });
  opened.catch(() => {});   // a refused connection rejects only for callers that wait for it
  const closed = new Promise<CloseEvent>((resolve) => ws.addEventListener("close", (event) => resolve(event), { once: true }));
  return {
    ws,
    messages,
    opened,
    closed,
    send: (message: unknown) => ws.send(typeof message === "string" ? message : JSON.stringify(message)),
    next(type: string | ((m: Message) => boolean), ms = 3000): Promise<Message> {
      const test = typeof type === "function" ? type : (m: Message) => m.type === type;
      const found = messages.find(test);
      if (found) {
        messages.splice(messages.indexOf(found), 1);
        return Promise.resolve(found);
      }
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(`timed out waiting for ${String(type)}`)), ms);
        waiters.push({ test, resolve: (m) => { clearTimeout(timer); resolve(m); } });
      });
    },
    close() {
      ws.close();
      return closed;
    },
  };
}

/** The round-trip document every storing endpoint must keep exactly (the contract test's). */
export const ROUNDTRIP = { a: "  padded  ", b: "", c: null, d: {}, e: [{}], f: [], g: 1.5, h: "naïve — 東京", i: { j: { k: [1, "x", true] } } };

/** A form-data body with one or more files in a field. */
export function files(field: string, ...entries: [Buffer, string, string][]) {
  const form = new FormData();
  for (const [bytes, type, name] of entries) form.append(field, new Blob([new Uint8Array(bytes)], { type }), name);
  return form;
}

export const PNG = Buffer.from("89504e470d0a1a0a0000000d4948445200000001000000010806000000", "hex");
