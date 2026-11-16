// npm run readme: regenerates the README's example table (between the steps markers) from surveyjs-integration.json.
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

process.chdir(join(import.meta.dirname, ".."));
const { default: config } = await import("../src/server/config.ts");

type Step = { title: string; anchor: string; page: string; licence: string; files: Record<string, string> };
const manifest = JSON.parse(readFileSync("surveyjs-integration.json", "utf8")) as { live?: string; steps: Step[] };
const file = (step: Step, role: string) => (step.files[role] ? `[\`${step.files[role]}\`](${step.files[role]})` : "—");
// Without a hosted demo, the run path is the local one (npm run dev serves on 8000)
const run = (step: Step) => (manifest.live ? `[${step.page}](${manifest.live}${step.page})` : `\`${step.page}\``);

const rows = ["| Example | Run | Server | Client | Page | Licence |", "|---|---|---|---|---|---|"];
for (const step of manifest.steps) {
  rows.push(`| [${step.title}](${config.docs}#${step.anchor}) | ${run(step)} | ${file(step, "server")} | ${file(step, "client")} | ${file(step, "page")} | ${step.licence} |`);
}

const readme = readFileSync("README.md", "utf8");
const marker = /(<!-- steps:start[^>]*-->)[\s\S]*?(<!-- steps:end -->)/;
if (!marker.test(readme)) {
  console.error("README.md needs <!-- steps:start --> and <!-- steps:end --> markers.");
  process.exit(1);
}
writeFileSync("README.md", readme.replace(marker, (_, start: string, end: string) => `${start}\n${rows.join("\n")}\n${end}`));
console.log(`Updated the example table in README.md (${manifest.steps.length} examples).`);
