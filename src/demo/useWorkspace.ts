"use client";

import { useSyncExternalStore } from "react";
import {
  findSurvey,
  getServerSnapshot,
  getSnapshot,
  responsesFor,
  subscribe,
} from "./store";
import type { DemoResponse, DemoState, DemoSurvey } from "./types";

/**
 * The workspace as React sees it.
 *
 * `useSyncExternalStore` is what makes the localStorage-backed store safe to
 * render on the server: the server (and the hydration pass) read the seed
 * snapshot, and React re-renders with the browser's own data right afterwards —
 * no effect, no flash of the wrong list, no hydration mismatch.
 */
export function useWorkspace(): DemoState {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function useSurvey(id: string): DemoSurvey | undefined {
  return findSurvey(useWorkspace(), id);
}

export function useResponses(id: string): readonly DemoResponse[] {
  return responsesFor(useWorkspace(), id);
}
