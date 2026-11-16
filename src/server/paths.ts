// The repository's own files (shared/, the manifest, the region sources), from the project root. Modules that
// Next.js bundles have an import.meta.url inside .next/, so nothing here resolves from it: server.ts, the tests and
// the scripts all run with the project root as the working directory (server.ts changes to its own folder first).
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const root = process.cwd();

/** An absolute path for a repository path such as "shared/seed/forms.json". */
export const repoPath = (path: string) => join(root, path);

/** A repository file as text. */
export const readRepoFile = (path: string) => readFileSync(repoPath(path), "utf8");

/** A JSON file under shared/, parsed. */
export const readShared = <T = unknown>(path: string): T => JSON.parse(readRepoFile(`shared/${path}`)) as T;
