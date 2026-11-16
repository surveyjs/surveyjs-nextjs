// Demo only: which checkout is answering, `<branch>@<short commit>`. server.ts prints it at start, and the catalog
// and the example pages show it ("Running …"). server.ts asks git once and passes the answer on as SURVEYJS_BUILD,
// so the route handlers' module graph shows the same line; hosted demos set SURVEYJS_BUILD at deploy; without git,
// there is no build line.
import { execFileSync } from "node:child_process";
import config from "../config.ts";
import { root } from "../paths.ts";

let fromGit: string | null | undefined;

function git(...args: string[]) {
  return execFileSync("git", args, { cwd: root, timeout: 2000, stdio: ["ignore", "pipe", "ignore"], windowsHide: true }).toString().trim();
}

/** The build line, or null. */
export function currentBuild(): string | null {
  if (config.build) return config.build;
  if (fromGit === undefined) {
    try {
      fromGit = `${git("rev-parse", "--abbrev-ref", "HEAD")}@${git("rev-parse", "--short", "HEAD")}`;
    } catch {
      fromGit = null;   // no git on PATH, or not a checkout
    }
  }
  return fromGit;
}
