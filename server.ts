// The custom server: checks the port, loads .env, seeds a missing database, then serves Next.js and both WebSocket
// relays on one port, and shuts down cleanly on Ctrl+C and SIGTERM. A custom server because the relays need the
// HTTP server's "upgrade" event, which route handlers never get (README: Why a custom server).
//
//   npm run dev     node server.ts --dev          Next.js in development mode (hot reload for src/app, src/components)
//   npm start       node server.ts --production   after `npm run build`
//
// Node.js runs this file as it is, with its built-in type stripping, so this file and src/server/** use only
// erasable TypeScript and import each other by relative paths ending in .ts.

// Type stripping and node:sqlite need Node.js 24: say so instead of failing with a syntax or module error
const [major] = process.versions.node.split(".").map(Number);
if (major < 24) {
  console.error(`This app needs Node.js 24 or later; this is ${process.version}. Install Node.js 26 LTS from https://nodejs.org.`);
  process.exit(1);
}

// Paths in settings.env and .env (DATA_DIR) and the repository files the pages read are relative to this folder
process.chdir(import.meta.dirname);

// .env (the private keys), then settings.env (everything else, committed), with Node's own loader, before anything
// reads the environment. loadEnvFile() keeps what is already set: the shell wins, then .env, then settings.env.
// Next.js reads .env again for its own module graph, and keeps what is already set.
const { existsSync } = await import("node:fs");
if (existsSync(".env")) process.loadEnvFile(".env");
if (existsSync("settings.env")) process.loadEnvFile("settings.env");

// The mode comes from the arguments (npm scripts can't set variables inline on Windows), else NODE_ENV
const dev = process.argv.includes("--dev") || (!process.argv.includes("--production") && process.env.NODE_ENV === "development");
Object.assign(process.env, { NODE_ENV: dev ? "development" : "production" });

const { createServer } = await import("node:http");
const { connect } = await import("node:net");
const { default: config } = await import("./src/server/config.ts");

const busy = `Port ${config.port} is already in use. Another copy of this app (another checkout or branch?) may be running. Stop it, or set APP_PORT.`;

/**
 * Is something answering on the port? Don't rely on the bind error: on Windows a server on 0.0.0.0 and another on
 * 127.0.0.1 can both bind the same port, and the first one keeps answering.
 */
const answers = (port: number) => new Promise<boolean>((resolve) => {
  const socket = connect({ host: "127.0.0.1", port });
  const done = (result: boolean) => { socket.destroy(); resolve(result); };
  socket.setTimeout(500, () => done(false));
  socket.once("connect", () => done(true));
  socket.once("error", () => done(false));
});

if (await answers(config.port)) {
  console.error(busy);
  process.exit(1);
}

const { setLicenseKey } = await import("survey-core");
const { close } = await import("./src/server/db.ts");
const { seed } = await import("./src/server/seed.ts");
const { attachRelays } = await import("./src/server/relay/index.ts");
const { currentBuild } = await import("./src/server/demo/build.ts");
const { prune } = await import("./src/server/demo/sandbox.ts");
const { default: next } = await import("next");

// The relays run in this module graph (survey-core isn't needed there, but this is where startup work goes); the
// route handlers' own copy sets the key again in src/server/integration/surveyjs.ts, for server PDFs
if (config.licenseKey) setLicenseKey(config.licenseKey);

if (seed(config.databasePath)) console.log(`Created and seeded ${config.databasePath}`);

// Which checkout answered, asked once here and handed to the route handlers' module graph through the environment
const build = currentBuild();
if (build) process.env.SURVEYJS_BUILD = build;

const app = next({ dev, dir: import.meta.dirname, hostname: config.host, port: config.port });
await app.prepare();
const handle = app.getRequestHandler();

const server = createServer((req, res) => handle(req, res));
const relays = attachRelays(server);

server.once("error", (error: NodeJS.ErrnoException) => {
  console.error(error.code === "EADDRINUSE" ? busy : error);
  process.exit(1);
});
server.listen(config.port, config.host, () => {
  const mode = dev ? "development" : "production";
  console.log(`Serving ${import.meta.dirname}${build ? ` (${build})` : ""} on http://127.0.0.1:${config.port} (${mode})`);
});

// Demo only: remove visitor sandboxes unused for 24 hours, hourly
if (config.demoMode) setInterval(() => prune(), 3600 * 1000).unref();

// Ctrl+C (SIGINT) and docker stop (SIGTERM): close the relays (1001, going away), stop accepting connections,
// close Next.js (and its development workers), then the databases, then exit, so the port is free at once
let stopping = false;
const shutdown = (signal: string) => {
  if (stopping) return;
  stopping = true;
  console.log(`${signal}: shutting down`);
  relays.close();
  server.close(async () => {
    await app.close().catch(() => {});
    close();
    process.exit(0);
  });
  server.closeAllConnections();
  setTimeout(() => process.exit(0), 3000).unref();
};
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
