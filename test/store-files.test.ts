// store-files: the batch is validated before anything is stored, types come from the bytes, names keep their
// characters, and downloads never run as the site. The demo's 5 MB cap is in demo-mode.test.ts.
import assert from "node:assert/strict";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { after, test } from "node:test";
import { files, PNG, startApp } from "./helpers.ts";

const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");
const JPEG = Buffer.from("ffd8ffe000104a464946", "hex");
const GIF = Buffer.from("GIF89a\x01\x00\x01\x00", "latin1");
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.alloc(4), Buffer.from("WEBPVP8 ")]);
const HTML = Buffer.from("<!DOCTYPE html><script>alert(document.cookie)</script>");
const BIG = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);

const app = await startApp();
after(() => app.stop());

const stored = () => (app.db().prepare("SELECT COUNT(*) AS n FROM files").get() as { n: number }).n;
const onDisk = () => readdirSync(join(app.config.dataDir, "files")).length;
const upload = (form: FormData, user?: string | null) => app.request("POST", "/api/files", { body: form, user });
const ids = (data: unknown) => data as string[];

test("PNG, JPEG, GIF, WebP and PDF by their bytes, in upload order", async () => {
  const r = await upload(files("files[]", [PNG, "image/png", "a.png"], [JPEG, "image/jpeg", "b.jpg"], [GIF, "image/gif", "c.gif"],
    [WEBP, "image/webp", "d.webp"], [PDF, "text/plain", "e.txt"]));
  assert.equal(r.status, 200, r.text);
  assert.equal(ids(r.data).length, 5);
  const types = ids(r.data).map((id) => (app.db().prepare("SELECT type FROM files WHERE id = ?").get(id) as { type: string }).type);
  assert.deepEqual(types, ["image/png", "image/jpeg", "image/gif", "image/webp", "application/pdf"]);
  for (const id of ids(r.data)) assert.ok(existsSync(join(app.config.dataDir, "files", id)));
});

test("one bad file refuses the whole batch with 422 and stores nothing: HTML named .png, over 5 MB, no files, the wrong field", async () => {
  const [rows, disk] = [stored(), onDisk()];
  for (const form of [
    files("files[]", [PNG, "image/png", "ok.png"], [HTML, "image/png", "page.png"]),
    files("files[]", [PNG, "image/png", "ok.png"], [BIG, "image/png", "big.png"]),
    new FormData(),
    files("files", [PNG, "image/png", "ok.png"]),
  ]) {
    const r = await upload(form);
    assert.equal(r.status, 422, r.text);
    assert.equal(typeof (r.data as { error: unknown }).error, "string");
  }
  assert.deepEqual([stored(), onDisk()], [rows, disk]);
});

test("a non-ASCII file name is stored as it was sent", async () => {
  const r = await upload(files("files[]", [PNG, "image/png", "квитанция.png"]));
  assert.equal((app.db().prepare("SELECT name FROM files WHERE id = ?").get(ids(r.data)[0]) as { name: string }).name, "квитанция.png");
});

test("downloads carry the stored type, nosniff and sandbox; signed out and unknown answer 404", async () => {
  const [id] = ids((await upload(files("files[]", [PNG, "text/html", "x.png"]))).data);
  const d = await app.request("GET", `/api/files/${id}`);
  assert.equal(d.status, 200);
  assert.ok(d.bytes.equals(PNG));
  assert.equal(d.headers.get("content-type"), "image/png");
  assert.equal(d.headers.get("x-content-type-options"), "nosniff");
  assert.equal(d.headers.get("content-security-policy"), "sandbox");
  assert.deepEqual((await app.request("GET", `/api/files/${id}`, { user: null })).data, { error: "Not found" });
  assert.equal((await app.request("GET", `/api/files/${id}`, { user: null })).status, 404);
  assert.equal((await app.request("GET", "/api/files/no-such-file")).status, 404);
});

test("an uploaded HTML file is refused; a stored one would still download with nosniff and sandbox", async () => {
  assert.equal((await upload(files("files[]", [HTML, "text/html", "page.html"]))).status, 422);
  const id = "00000000-0000-4000-8000-000000000000";
  app.db().prepare("INSERT INTO files (id, name, type) VALUES (?, 'page.html', 'text/html')").run(id);
  const { writeFileSync } = await import("node:fs");
  writeFileSync(join(app.config.dataDir, "files", id), HTML);
  const r = await app.request("GET", `/api/files/${id}`);
  assert.equal(r.headers.get("content-type"), "text/html");
  assert.equal(r.headers.get("x-content-type-options"), "nosniff");
  assert.equal(r.headers.get("content-security-policy"), "sandbox");
});

test("a file whose bytes are gone from disk answers 404 without its path", async () => {
  const [id] = ids((await upload(files("files[]", [PNG, "image/png", "gone.png"]))).data);
  rmSync(join(app.config.dataDir, "files", id));
  const r = await app.request("GET", `/api/files/${id}`);
  assert.equal(r.status, 404);
  assert.doesNotMatch(r.text, /ENOENT|storage|files/);
});
