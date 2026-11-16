// Demo only: /shared/<path> (src/app/shared/[...path]/route.ts). shared/ is a copy of the reference's and lives
// outside public/, so only its four page-facing folders are served: client/, definitions/, samples/ and ui/.
// The path is resolved and must stay inside one of them; dotfiles and anything else answer 404, never 403.
import { readFileSync, statSync } from "node:fs";
import { extname, join, resolve, sep } from "node:path";
import { repoPath } from "../paths.ts";

const FOLDERS = ["client", "definitions", "samples", "ui"];

const TYPES: Record<string, string> = {
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".woff2": "font/woff2",
  ".txt": "text/plain; charset=utf-8",
};

const notFound = () => new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });

export function sharedFile(segments: string[]): Response {
  const [folder, ...rest] = segments;
  if (!FOLDERS.includes(folder) || rest.length === 0 || rest.some((part) => part.startsWith("."))) return notFound();
  const base = resolve(repoPath(`shared/${folder}`));
  const path = resolve(join(base, ...rest));
  if (!path.startsWith(base + sep)) return notFound();   // "..", or an encoded one: nothing outside the folder
  try {
    if (!statSync(path).isFile()) return notFound();
    return new Response(readFileSync(path), {
      headers: { "Content-Type": TYPES[extname(path).toLowerCase()] ?? "application/octet-stream", "Cache-Control": "no-cache" },
    });
  } catch {
    return notFound();
  }
}
