// The start command, node server.ts: it refuses a port that something answers on, prints which checkout it serves,
// stops cleanly, and passes the licence key to the pages. The serving checks run Next.js in development mode
// (`npm test` runs before `npm run build` in CI, so there is no production build yet).
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { createServer, type AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const root = join(import.meta.dirname, "..");
const dataDir = mkdtempSync(join(tmpdir(), "surveyjs-run-"));
after(() => rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const freePort = () => new Promise<number>((resolve) => {
  const server = createServer().listen(0, "127.0.0.1", () => {
    const { port } = server.address() as AddressInfo;
    server.close(() => resolve(port));
  });
});

/** node server.ts with these variables; resolves with { code, output } when it exits. */
function run(env: Record<string, string>, args: string[] = [], { until, stop }: { until?: string; stop?: (child: ChildProcess) => Promise<void> } = {}) {
  const child = spawn(process.execPath, ["server.ts", ...args], {
    cwd: root, env: { ...process.env, DATA_DIR: dataDir, PORT: "", AI_API_KEY: "", ...env }, stdio: ["ignore", "pipe", "pipe"],
  });
  let output = "";
  let stopping: Promise<void> | undefined;
  const onData = (chunk: Buffer) => {
    output += chunk;
    if (until && !stopping && output.includes(until)) {
      stopping = Promise.resolve().then(() => stop?.(child)).finally(() => { if (child.exitCode === null) child.kill(); });   // also after a failed check
    }
  };
  child.stdout!.on("data", onData);
  child.stderr!.on("data", onData);
  return new Promise<{ code: number | null; output: string }>((resolve, reject) =>
    child.on("exit", (code) => (stopping ?? Promise.resolve()).then(() => resolve({ code, output }), reject)));
}

test("a busy APP_PORT is refused with the meta prompt's message and exit code 1", async () => {
  const busy = createServer().listen(0, "127.0.0.1");
  await new Promise((resolve) => busy.once("listening", resolve));
  const { port } = busy.address() as AddressInfo;
  try {
    for (const args of [["--dev"], ["--production"]]) {
      const { code, output } = await run({ APP_PORT: String(port) }, args);
      assert.equal(code, 1);
      assert.match(output, new RegExp(`Port ${port} is already in use\\. Another copy of this app \\(another checkout or branch\\?\\) may be running\\. Stop it, or set APP_PORT\\.`));
    }
  } finally {
    busy.close();
  }
});

test("a free port serves Next.js and the relays, prints the folder, the build and the mode, and SIGTERM frees the port", async () => {
  const port = await freePort();
  const { code, output } = await run({ APP_PORT: String(port), SURVEYJS_BUILD: "test-branch@abc1234", SURVEYJS_LICENSE_KEY: "dummy-key" }, ["--dev"], {
    until: "on http://",
    stop: async (child) => {
      assert.deepEqual(await (await fetch(`http://127.0.0.1:${port}/up`)).json(), { status: "ok" });
      // The licence key reaches the browser through the server-rendered page config, never the bundle
      const page = await (await fetch(`http://127.0.0.1:${port}/examples/save-response`)).text();
      assert.ok(page.includes('"licenseKey":"dummy-key"'), "the page config carries the key");
      assert.ok(page.includes("Running test-branch@abc1234"), "the build line reaches the route handlers' module graph");
      // A relay on the same port
      const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/rooms/run-commands?name=T`, { headers: { Cookie: "demo_user=alice" } } as unknown as string[]);
      const first = await new Promise<string>((resolve, reject) => {
        ws.addEventListener("message", (event) => resolve(String(event.data)), { once: true });
        ws.addEventListener("error", () => reject(new Error("the relay refused")), { once: true });
      });
      assert.equal(JSON.parse(first).type, "init");
      ws.close();
      child.kill("SIGTERM");
    },
  });
  assert.match(output, new RegExp(`Serving .+ \\(test-branch@abc1234\\) on http://127\\.0\\.0\\.1:${port} \\(development\\)`));
  if (process.platform !== "win32") {
    assert.equal(code, 0);   // Windows has no signals: kill() ends the process
    assert.match(output, /SIGTERM: shutting down/);
  }
  const reopened = createServer().listen(port, "127.0.0.1");
  await new Promise((resolve, reject) => reopened.once("listening", resolve).once("error", reject));
  reopened.close();
});
