// The comments on data-corrupting pitfalls are inside the regions the docs show, the handler files stand alone, and
// each one reads like its Express counterpart (routes/<slug>.js in surveyjs-nodejs).
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { test } from "node:test";

process.chdir(new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const { regionsIn } = await import("../src/server/demo/code-panel.ts");

const region = (path: string, id: string) => {
  const found = regionsIn(path).get(id);
  assert.ok(found, `${path} has sjs:${id}`);
  return found.code;
};

test("the pitfall comments are inside the regions", () => {
  const pitfalls: [string, string, string[]][] = [
    ["src/server/routes/save-response.ts", "save-response.server", ["{} stays {}", "never a copy"]],
    ["src/server/routes/resume-progress.ts", "resume-progress.server", ["{} stays {}", "never a copy"]],
    ["src/server/routes/relational-storage.ts", "relational-storage.server", ["{} stays {}", "keys come from valueName"]],
    ["src/server/routes/creator-load-save.ts", "creator-load-save.server", ["{} stays {}", "never a copy"]],
    ["src/server/routes/variable-presets.ts", "variable-presets.server", ["{} stays {}", "never a copy"]],
    ["src/server/routes/validate-response.ts", "validate-response.server", ["{} stays {}"]],
    ["src/server/routes/lint-definition.ts", "lint-definition.server", ["{} stays {}"]],
    ["src/server/routes/store-files.ts", "store-files.server", ['"files[]"', "by the bytes, never the client's Content-Type", "never by the client's file name"]],
    ["src/server/routes/store-files.ts", "store-files.download", ["404, not 403", "nosniff and sandbox"]],
    ["src/server/routes/choices-from-web.ts", "choices-from-web.server", ["the first ?region=", "the browser can't call a service without CORS"]],
    ["src/server/routes/dashboard.ts", "dashboard.server", ["as stored", "ISO 8601 UTC strings compare as dates"]],
    ["src/server/routes/extract-from-paper.ts", "extract-from-paper.server", ["never rawResponse", "may quote the answers"]],
  ];
  for (const [path, id, comments] of pitfalls) {
    const code = region(path, id);
    for (const comment of comments) assert.ok(code.includes(comment), `sjs:${id} explains: ${comment}`);
  }
});

test("the regions show the SurveyJS calls themselves", () => {
  assert.match(region("src/server/routes/validate-response.ts", "validate-response.server"), /lintSurvey\(definition, lintOptions\)[\s\S]*new Model\(definition\)[\s\S]*setData\(data, \{\}\)[\s\S]*validate\(\)/);
  assert.match(region("src/server/routes/lint-definition.ts", "lint-definition.server"), /lintSurvey\(definition, lintOptions\)/);
  assert.match(region("src/server/routes/extract-from-paper.ts", "extract-from-paper.server"), /createExtractor\(\{ provider, adapter: "surveyjs"[\s\S]*extractFromImage/);
  assert.match(region("src/server/routes/server-pdf.ts", "server-pdf.server"), /renderPdf\(definition, JSON\.parse\(claim\.data\)\)/);
});

test("handler files never import each other, never read process.env and start with their endpoints", () => {
  for (const name of readdirSync("src/server/routes")) {
    const source = readFileSync(`src/server/routes/${name}`, "utf8");
    assert.doesNotMatch(source, /from "\.\/|from "\.\.\/routes\//, `${name} imports another handler file`);
    assert.doesNotMatch(source, /process\.env/, `${name} reads process.env`);
    assert.match(source.split("\n")[0], /^\/\/ (GET|POST|PUT|DELETE|GET\|PUT)/, `${name} starts with its endpoints`);
  }
});

test("every route.ts only delegates: imports, the segment config and route()/methods() exports", () => {
  const files = readdirSync("src/app", { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name === "route.ts")
    .map((entry) => `${entry.parentPath}/${entry.name}`.replaceAll("\\", "/"));
  assert.ok(files.length >= 19);
  for (const file of files) {
    const code = readFileSync(file, "utf8").split("\n").filter((line) => line.trim() && !line.trim().startsWith("//"));
    for (const line of code) {
      assert.match(line, /^(import |export const (runtime|dynamic) = |export const \{ GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS \} = methods\(\{$|\s+[A-Z]+: route\(.*\),$|\}\);$|export const [A-Z]+ = notFound;$|export (async )?function GET\(|\s+return |\}$)/, `${file}: ${line}`);
    }
  }
});
