/**
 * Demo plumbing — not the seam.
 *
 * Keeps the two localStorage collections in memory so React can read them
 * synchronously (see `src/hooks/useWorkspace.ts`), and notifies subscribers when
 * either one changes. Replacing localStorage with a real API means rewriting the
 * bodies in `survey-json.ts` and `survey-results.ts`, and deleting this file
 * along with the reads it backs.
 *
 * Two keys rather than one blob, so each maps onto the endpoint it would become:
 * `sjs-demo-surveys` → /api/surveys, `sjs-demo-results` → /api/results.
 */
import { createSeedResponses, seedSurveys } from "@/demo/seed";
import type { DemoResponse, DemoSurvey } from "./types";

const SURVEYS_KEY = "sjs-demo-surveys";
const RESULTS_KEY = "sjs-demo-results";

/**
 * What the server renders: the seed list, and no responses. Hydration reads
 * these too, so they must match the server output exactly.
 */
const SERVER_SURVEYS: readonly DemoSurvey[] = seedSurveys;
const SERVER_RESULTS: readonly DemoResponse[] = [];

let surveys: readonly DemoSurvey[] | null = null;
let results: readonly DemoResponse[] | null = null;

const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function persist(key: string, value: unknown): void {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private browsing or a full quota: the workspace still works for this
    // session, it just will not survive a reload.
  }
}

function loadArray<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

/** First visit: seed both collections and write them out. */
function seed(): void {
  surveys = seedSurveys;
  results = createSeedResponses();
  persist(SURVEYS_KEY, surveys);
  persist(RESULTS_KEY, results);
}

function ensureLoaded(): void {
  if (surveys !== null && results !== null) return;
  const storedSurveys = loadArray<DemoSurvey>(SURVEYS_KEY);
  const storedResults = loadArray<DemoResponse>(RESULTS_KEY);
  if (storedSurveys && storedResults) {
    surveys = storedSurveys;
    results = storedResults;
    return;
  }
  seed();
}

export function readSurveys(): readonly DemoSurvey[] {
  if (!isBrowser()) return SERVER_SURVEYS;
  ensureLoaded();
  return surveys!;
}

export function readResults(): readonly DemoResponse[] {
  if (!isBrowser()) return SERVER_RESULTS;
  ensureLoaded();
  return results!;
}

export function writeSurveys(next: readonly DemoSurvey[]): void {
  surveys = next;
  persist(SURVEYS_KEY, next);
  emit();
}

export function writeResults(next: readonly DemoResponse[]): void {
  results = next;
  persist(RESULTS_KEY, next);
  emit();
}

export function serverSurveys(): readonly DemoSurvey[] {
  return SERVER_SURVEYS;
}

export function serverResults(): readonly DemoResponse[] {
  return SERVER_RESULTS;
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1 && isBrowser()) {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && isBrowser()) {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Another tab edited the workspace — drop the cache so both stay in sync. */
function onStorage(event: StorageEvent): void {
  if (event.key !== SURVEYS_KEY && event.key !== RESULTS_KEY) return;
  surveys = null;
  results = null;
  emit();
}

/** Restore the seeded workspace. Demo-only — there is no API equivalent. */
export function resetDemoData(): void {
  seed();
  emit();
}
