// POST /api/files, GET /api/files/:id
import { randomUUID } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { canReadFile, currentUser } from "../auth.ts";
import { db, filesDir } from "../db.ts";
import { detectType } from "../integration/file-type.ts";
import { httpError, readFiles } from "../integration/http.ts";

const TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];

/** The whole batch is read into memory and checked before a byte is written: 5 MB a file, 10 files at most. */
const uploads = (req: Request) => readFiles(req, "files[]", {
  maxFileSize: 5 * 1024 * 1024,
  maxFiles: 10,
  tooLarge: [422, "Each file must be 5 MB or less"],
  tooMany: [422, "Upload at most 10 files at a time"],
  wrongField: [422, 'Upload the files in a field named "files[]"'],
});

/** The bytes of a stored file, or null when they are gone from disk (never an error that shows the path). */
function readStored(req: Request, id: string) {
  try {
    return readFileSync(join(filesDir(req), id));
  } catch {
    return null;
  }
}

// #region sjs:store-files.server
// POST /api/files — store uploads, return their ids in the same order
// Field "files[]", the name on every platform: PHP keeps only the last of several fields named "files"
export async function storeFiles(req: Request) {
  const files = await uploads(req);   // every file in the field "files[]", each checked against 5 MB
  if (files.length === 0) throw httpError(422, 'Upload one or more files in a field named "files[]"');
  const types = files.map((file) => detectType(file.buffer));   // by the bytes, never the client's Content-Type
  const refused = files.find((file, i) => !TYPES.includes(types[i] ?? ""));
  if (refused) throw httpError(422, `${refused.name} is not a PNG, JPEG, WebP, GIF or PDF file`);

  const ids = files.map((file, i) => {
    const id = randomUUID();   // stored by id, never by the client's file name
    writeFileSync(join(filesDir(req), id), file.buffer);
    db(req).prepare("INSERT INTO files (id, name, type) VALUES (?, ?, ?)").run(id, file.name, types[i]);
    return id;
  });
  return Response.json(ids);
}
// #endregion

// #region sjs:store-files.download
// GET /api/files/:id — the content, for private files only; check access first
export function downloadFile(req: Request, { id }: { id: string }) {
  const file = db(req).prepare("SELECT id, name, type FROM files WHERE id = ?").get(id) as { id: string; name: string; type: string } | undefined;
  const bytes = file && canReadFile(currentUser(req), file) ? readStored(req, file.id) : null;
  if (!file || !bytes) throw httpError(404, "Not found");   // 404, not 403: don't confirm the file exists

  // nosniff and sandbox: an uploaded HTML or SVG never runs as this site
  return new Response(bytes, {
    headers: { "Content-Type": file.type, "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "sandbox" },
  });
}
// #endregion
