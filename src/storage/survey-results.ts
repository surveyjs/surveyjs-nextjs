/**
 * Submitted responses — what `/surveys/[id]/run` collects and the dashboard on
 * `/surveys/[id]/results` charts.
 *
 * This is the second of the two files you replace when you put a real backend
 * behind the template:
 *
 * ```ts
 * export async function submitResult(surveyId: string, data: SurveyData) {
 *   await fetch(`/api/surveys/${surveyId}/results`, {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify(data),
 *   });
 * }
 * ```
 *
 * What the demo implementation does: writes to `localStorage` under
 * `sjs-demo-results`, seeded on the first visit with generated responses so the
 * dashboard has something to chart (`src/demo/seed.ts`). What it does not do:
 * collect anything centrally — one visitor never sees another's answers, which
 * is exactly what you lose the moment this becomes a real endpoint.
 *
 * `listResults` is synchronous for the same reason as in `survey-json.ts`: it
 * feeds `useSyncExternalStore`. See the note there.
 */
import type { SurveyData } from "@/schemas";
import type { DemoResponse } from "./types";
import { readResults, writeResults } from "./workspace-cache";

export function listResults(surveyId?: string): readonly DemoResponse[] {
  const all = readResults();
  return surveyId
    ? all.filter((response) => response.surveyId === surveyId)
    : all;
}

export async function submitResult(
  surveyId: string,
  data: SurveyData,
): Promise<void> {
  const response: DemoResponse = {
    id: `${surveyId}-r${Date.now().toString(36)}`,
    surveyId,
    submittedAt: new Date().toISOString().slice(0, 10),
    data,
  };
  writeResults([...readResults(), response]);
}

export async function deleteResult(id: string): Promise<void> {
  writeResults(readResults().filter((response) => response.id !== id));
}

/** Called by `deleteSurvey` — the cascade a real DELETE would do server-side. */
export async function deleteResultsFor(surveyId: string): Promise<void> {
  writeResults(
    readResults().filter((response) => response.surveyId !== surveyId),
  );
}
