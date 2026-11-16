// Demo only: the Code tab. It shows the files that just ran: each JSON definition, then each region the manifest
// lists for the example (`// #region sjs:<id>` … `// #endregion`), dedented, with a link to its lines on GitHub.
// scripts/check.ts reads regions the same way. The files are read at request time, so the image ships src/.
import config from "../config.ts";
import { readRepoFile } from "../paths.ts";
import { readManifest, type Step } from "./manifest.ts";

const OPEN = /^\s*\/\/\s*#region\s+sjs:(\S+)/;
const CLOSE = /^\s*\/\/\s*#endregion/;

export type Region = { start: number; end: number; code: string; count: number };

/** Every `#region sjs:<id>` in a file. start and end are the 1-based lines inside the markers. */
export function regionsIn(path: string, text = readRepoFile(path)): Map<string, Region> {
  const lines = text.split(/\r?\n/);
  const regions = new Map<string, Region>();
  let open: { id: string; from: number } | null = null;
  lines.forEach((line, i) => {
    const m = OPEN.exec(line);
    if (m) open = { id: m[1], from: i + 1 };
    else if (open && CLOSE.test(line)) {
      const found = regions.get(open.id);
      if (found) found.count++;
      else regions.set(open.id, { start: open.from + 1, end: i, code: dedent(lines.slice(open.from, i)), count: 1 });
      open = null;
    }
  });
  return regions;
}

function dedent(lines: string[]) {
  const indents = lines.filter((line) => line.trim() !== "").map((line) => line.length - line.trimStart().length);
  const indent = indents.length ? Math.min(...indents) : 0;
  return lines.map((line) => line.slice(indent)).join("\n");
}

const github = (path: string) => `${config.github}/blob/${readManifest().branch}/${path}`;

/** The JSON definitions, shown collapsed above the regions. */
export function codeDefinitions(step: Step) {
  return Object.entries(step.files)
    .filter(([role]) => role.startsWith("definition"))
    .map(([, path]) => ({ path, code: readRepoFile(path).trim(), url: github(path) }));
}

const language = (path: string) => (path.endsWith(".json") ? "json" : /\.tsx?$/.test(path) ? "typescript" : "javascript");

/** The regions the manifest lists for an example, from its client file and every server* file, in manifest order. */
export function codePanel(step: Step) {
  const panel = [];
  for (const [role, path] of Object.entries(step.files)) {
    if (role !== "client" && !role.startsWith("server")) continue;
    for (const [id, region] of regionsIn(path)) {
      if (!step.regions.includes(id)) continue;
      panel.push({
        id,
        role: role === "client" ? "client" : "server",
        path,
        language: language(path),
        code: region.code,
        url: `${github(path)}#L${region.start}-L${region.end}`,
      });
    }
  }
  return panel;
}
