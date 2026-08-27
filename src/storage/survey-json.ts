/**
 * Survey definitions — the list on `/surveys` and the JSON each one holds.
 *
 * This is one of the two files you replace when you put a real backend behind
 * the template. Every mutation is already `async`, so swapping a body for a
 * request changes nothing at the call sites:
 *
 * ```ts
 * export async function saveSurveyJson(id: string, json: SurveyJSON) {
 *   await fetch(`/api/surveys/${id}`, {
 *     method: "PUT",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ json }),
 *   });
 * }
 * ```
 *
 * What the demo implementation does: writes to `localStorage` under
 * `sjs-demo-surveys`, so every visitor gets their own workspace and nothing
 * reaches a server. What it does not do: share anything between browsers,
 * survive clearing site data, or validate who is editing what.
 *
 * The reads are deliberately synchronous. They feed `useSyncExternalStore`
 * (`src/hooks/useWorkspace.ts`), which requires a snapshot that returns
 * immediately and keeps a stable identity — that is what lets the server render
 * the seeded list and the browser swap in its own data without a flash or a
 * hydration mismatch. Making them `async` means moving the read into a server
 * component and passing the result down as a prop; see the README.
 */
import type { SurveyJSON } from "@/schemas";
import type { DemoSurvey } from "./types";
import { readSurveys, writeSurveys } from "./workspace-cache";
import { deleteResultsFor } from "./survey-results";

export function listSurveys(): readonly DemoSurvey[] {
  return readSurveys();
}

export function findSurvey(id: string): DemoSurvey | undefined {
  return readSurveys().find((survey) => survey.id === id);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function uniqueId(prefix: string): string {
  const taken = new Set(readSurveys().map((survey) => survey.id));
  let index = 1;
  while (taken.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function patch(id: string, apply: (survey: DemoSurvey) => DemoSurvey): void {
  writeSurveys(
    readSurveys().map((survey) => (survey.id === id ? apply(survey) : survey)),
  );
}

export async function createSurvey(): Promise<DemoSurvey> {
  const survey: DemoSurvey = {
    id: uniqueId("survey"),
    name: "New Survey",
    json: { title: "New Survey", pages: [{ name: "page1", elements: [] }] },
    createdAt: today(),
    updatedAt: today(),
  };
  writeSurveys([survey, ...readSurveys()]);
  return survey;
}

export async function cloneSurvey(id: string): Promise<DemoSurvey | undefined> {
  const source = findSurvey(id);
  if (!source) return undefined;
  const clone: DemoSurvey = {
    ...source,
    id: uniqueId(`${id}-copy`),
    name: `${source.name} (copy)`,
    createdAt: today(),
    updatedAt: today(),
  };
  writeSurveys([clone, ...readSurveys()]);
  return clone;
}

export async function renameSurvey(id: string, name: string): Promise<void> {
  patch(id, (survey) => ({ ...survey, name, updatedAt: today() }));
}

export async function saveSurveyJson(
  id: string,
  json: SurveyJSON,
): Promise<void> {
  patch(id, (survey) => ({ ...survey, json, updatedAt: today() }));
}

/** Deletes the definition and, like a cascading DELETE would, its results. */
export async function deleteSurvey(id: string): Promise<void> {
  writeSurveys(readSurveys().filter((survey) => survey.id !== id));
  await deleteResultsFor(id);
}
