// Attaches both relays to the custom server's HTTP server (server.ts), so they share its port: the upgrade router,
// the sign-in check, the visitor sandbox, keep-alive pings and the demo's room snapshots. The relays' own code is in
// fill-relay.ts and edit-relay.ts. Route handlers never see upgrade requests, so this file reads the cookies itself.
// Upgrades outside /ws/ are left alone: Next.js adds its own "upgrade" listener to the server on the first request
// (its hot reload is a WebSocket under /_next/ in development), so handing them to nextApp.getUpgradeHandler() too
// would answer them twice.
import type { IncomingMessage, Server } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocketServer, type WebSocket } from "ws";
import config from "../config.ts";
import { database } from "../db.ts";
import { parseCookies } from "../demo/cookies.ts";
import { isValidId, resolveSandbox } from "../demo/sandbox.ts";
import { findUser } from "../demo/users.ts";
import { editRelay, type EditContext } from "./edit-relay.ts";
import type { EditSocket } from "./edit-room.ts";
import { fillRelay, type FillContext } from "./fill-relay.ts";
import type { FillSocket } from "./fill-room.ts";
import { roomKey, writeSnapshot } from "./room-key.ts";

type Kind = "fill" | "edit";
type AliveSocket = WebSocket & { isAlive?: boolean };

const ROUTES: { pattern: RegExp; kind: Kind }[] = [
  { pattern: /^\/ws\/rooms\/([A-Za-z0-9_-]{1,64})$/, kind: "fill" },
  { pattern: /^\/ws\/forms\/([A-Za-z0-9_-]{1,64})$/, kind: "edit" },
];

/** Answer a refused upgrade with a plain HTTP status, then close the socket. */
function refuse(socket: Duplex, status: number, reason: string) {
  socket.end(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\nContent-Length: 0\r\n\r\n`);
  socket.destroy();
}

/** The relays on `server`: the custom server's in server.ts, or a plain http.Server in the tests. */
export function attachRelays(server: Server): { close(): void } {
  const relays = { fill: fillRelay(), edit: editRelay() };
  const sockets: Record<Kind, WebSocketServer> = {
    fill: new WebSocketServer({ noServer: true, maxPayload: 20 * 1024 * 1024 }),   // a large answer (a signature) fits one frame
    edit: new WebSocketServer({ noServer: true, maxPayload: 5 * 1024 * 1024 }),    // the reference relay's limit for one record
  };

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    try {
      const url = new URL(req.url ?? "/", "http://relay");
      if (!url.pathname.startsWith("/ws/")) return;   // Next.js's own listener (hot reload in development)
      const route = ROUTES.find(({ pattern }) => pattern.test(url.pathname));
      if (!route) return refuse(socket, 400, "Bad Request");
      const id = route.pattern.exec(url.pathname)![1];
      const cookies = parseCookies(req.headers.cookie);

      // Demo only: in demo mode the demo_sid cookie picks the visitor's sandbox (the same check as demo/sandbox.ts),
      // so the room is seeded from and saves into that copy, and its key is "<demo_sid>:<id>"
      let sandbox = null;
      if (config.demoMode) {
        if (!isValidId(cookies.demo_sid)) return refuse(socket, 401, "Unauthorized");
        sandbox = resolveSandbox(cookies.demo_sid);
      }
      const db = database(sandbox?.database ?? config.databasePath);

      // Demo only: the demo_user cookie stands in for your real session check here (Auth.js, a JWT…).
      // Like saving in creator-load-save, editing together is for editors (can(user, "edit-forms") in auth.ts).
      const user = findUser(db, cookies.demo_user);
      if (!user) return refuse(socket, 401, "Unauthorized");
      if (route.kind === "edit" && !user.isEditor) return refuse(socket, 403, "Forbidden");

      sockets[route.kind].handleUpgrade(req, socket, head, (ws) => {
        const context = { user, database: db, name: url.searchParams.get("name"), roomKey: roomKey(sandbox?.id, id) };
        if (route.kind === "fill") accept("fill", ws, { ...context, recordId: id });
        else accept("edit", ws, { ...context, formId: id });
      });
    } catch (error) {
      console.error("relay: upgrade failed", error);
      refuse(socket, 500, "Internal Server Error");
    }
  });

  /** An exception in a socket handler isn't Next.js's to catch and would stop the process: log it, keep the room. */
  function guard(ws: WebSocket, kind: Kind, what: string, fn: () => void) {
    try {
      fn();
      snapshot(kind, ws, what);
    } catch (error) {
      console.error(`${kind} relay: ${what} failed`, error);
    }
  }

  function accept(kind: "fill", ws: WebSocket, context: FillContext): void;
  function accept(kind: "edit", ws: WebSocket, context: EditContext): void;
  function accept(kind: Kind, ws: WebSocket, context: FillContext | EditContext): void {
    const alive = ws as AliveSocket;
    alive.isAlive = true;
    ws.on("pong", () => (alive.isAlive = true));
    ws.on("error", (error) => console.error(`${kind} relay: socket error`, error.message));
    ws.on("message", (data, isBinary) => {
      const raw = isBinary ? "" : data.toString();
      guard(ws, kind, /"type"\s*:\s*"presence"/.test(raw) ? "presence" : "message", () =>
        kind === "fill" ? relays.fill.message(ws as FillSocket, raw) : relays.edit.message(ws as EditSocket, raw));
    });
    ws.on("close", () => guard(ws, kind, "close", () =>
      kind === "fill" ? relays.fill.close(ws as FillSocket) : relays.edit.close(ws as EditSocket)));
    guard(ws, kind, "connect", () =>
      kind === "fill" ? relays.fill.connect(ws as FillSocket, context as FillContext) : relays.edit.connect(ws as EditSocket, context as EditContext));
  }

  /** Demo only: the room's state for the Data panel (fill: participants, values, responseId; edit: the log's length). */
  function snapshot(kind: Kind, ws: WebSocket, what: string) {
    if (!config.demoMode || what === "presence") return;
    if (kind === "fill") {
      const room = relays.fill.roomOf(ws as FillSocket);
      if (room) writeSnapshot((ws as FillSocket).client.roomKey, "fill", { participants: room.clients.size, values: room.values, responseId: room.responseId });
    } else {
      const room = relays.edit.roomOf(ws as EditSocket);
      const title = (room?.seed as { title?: unknown } | undefined)?.title ?? null;
      if (room) writeSnapshot((ws as EditSocket).client.roomKey, "edit", { participants: room.clients.size, "seed title": title, "records in the log": room.log.length });
    }
  }

  // Keep-alive: ping every 30 s and drop clients that didn't answer, so a proxy's idle connections close cleanly
  const timer = setInterval(() => {
    for (const wss of Object.values(sockets)) {
      for (const ws of wss.clients as Set<AliveSocket>) {
        if (!ws.isAlive) ws.terminate();
        else {
          ws.isAlive = false;
          ws.ping();
        }
      }
    }
  }, 30_000).unref();

  return {
    close() {
      clearInterval(timer);
      for (const wss of Object.values(sockets)) {
        for (const ws of wss.clients) ws.close(1001, "Server shutting down");
        wss.close();
      }
    },
  };
}
