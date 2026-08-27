"use client";

import { useMemo, useSyncExternalStore } from "react";
import { listSurveys } from "@/storage/survey-json";
import { listResults } from "@/storage/survey-results";
import {
  serverResults,
  serverSurveys,
  subscribe,
} from "@/storage/workspace-cache";
import type { DemoResponse, DemoSurvey } from "@/storage/types";

/**
 * React bindings over the storage seam. No persistence lives here — these call
 * `src/storage/*` and re-render when it changes.
 *
 * `useSyncExternalStore` is what makes a browser-owned store safe to render on
 * the server: the server (and the hydration pass) read the seed snapshot, and
 * React re-renders with the browser's own data right afterwards — no effect, no
 * flash of the wrong list, no hydration mismatch.
 */
export function useSurveys(): readonly DemoSurvey[] {
  return useSyncExternalStore(subscribe, listSurveys, serverSurveys);
}

export function useSurvey(id: string): DemoSurvey | undefined {
  return useSurveys().find((survey) => survey.id === id);
}

export function useResults(surveyId?: string): readonly DemoResponse[] {
  // Subscribed unfiltered on purpose: the snapshot has to keep a stable
  // identity between renders, and a fresh `filter` result would not. The filter
  // is memoised for the same reason — callers use it as an effect dependency.
  const all = useSyncExternalStore(subscribe, listResults, serverResults);
  return useMemo(
    () =>
      surveyId
        ? all.filter((response) => response.surveyId === surveyId)
        : all,
    [all, surveyId],
  );
}
