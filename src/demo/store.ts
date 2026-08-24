import type { SurveyData, SurveyJSON } from "@/schemas";
import { createSeedState, generateResponses, serverState } from "./seed";
import type { DemoResponse, DemoState, DemoSurvey } from "./types";

const STORAGE_KEY = "sjs-demo-workspace";

let state: DemoState | null = null;
const listeners = new Set<() => void>();

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function persist(next: DemoState): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private browsing or a full quota: the workspace still works for this
    // session, it just will not survive a reload.
  }
}

function load(): DemoState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState;
      if (Array.isArray(parsed.surveys) && Array.isArray(parsed.responses)) {
        return parsed;
      }
    }
  } catch {
    // Fall through to a fresh workspace.
  }
  const seeded = createSeedState();
  persist(seeded);
  return seeded;
}

function emit(): void {
  listeners.forEach((listener) => listener());
}

function setState(next: DemoState): void {
  state = next;
  persist(next);
  emit();
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

/** Another tab edited the workspace — adopt its state so both stay in sync. */
function onStorage(event: StorageEvent): void {
  if (event.key !== STORAGE_KEY) return;
  state = null;
  emit();
}

export function getSnapshot(): DemoState {
  if (!isBrowser()) return serverState;
  if (!state) state = load();
  return state;
}

/** Hydration reads this, so it must match what the server rendered. */
export function getServerSnapshot(): DemoState {
  return serverState;
}

export function findSurvey(
  snapshot: DemoState,
  id: string,
): DemoSurvey | undefined {
  return snapshot.surveys.find((survey) => survey.id === id);
}

export function responsesFor(
  snapshot: DemoState,
  id: string,
): readonly DemoResponse[] {
  return snapshot.responses.filter((response) => response.surveyId === id);
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function update(
  id: string,
  patch: (survey: DemoSurvey) => DemoSurvey,
): void {
  const current = getSnapshot();
  setState({
    ...current,
    surveys: current.surveys.map((survey) =>
      survey.id === id ? patch(survey) : survey,
    ),
  });
}

function uniqueId(prefix: string): string {
  const existing = new Set(getSnapshot().surveys.map((survey) => survey.id));
  let index = 1;
  let candidate = `${prefix}-${index}`;
  while (existing.has(candidate)) {
    index += 1;
    candidate = `${prefix}-${index}`;
  }
  return candidate;
}

export function createSurvey(): DemoSurvey {
  const id = uniqueId("survey");
  const survey: DemoSurvey = {
    id,
    name: "New Survey",
    json: { title: "New Survey", pages: [{ name: "page1", elements: [] }] },
    createdAt: today(),
    updatedAt: today(),
    isPublished: false,
    archived: false,
  };
  const current = getSnapshot();
  setState({ ...current, surveys: [survey, ...current.surveys] });
  return survey;
}

export function cloneSurvey(id: string): DemoSurvey | undefined {
  const source = findSurvey(getSnapshot(), id);
  if (!source) return undefined;
  const clone: DemoSurvey = {
    ...source,
    id: uniqueId(`${id}-copy`),
    name: `${source.name} (copy)`,
    createdAt: today(),
    updatedAt: today(),
    isPublished: false,
    archived: false,
  };
  const current = getSnapshot();
  setState({ ...current, surveys: [clone, ...current.surveys] });
  return clone;
}

export function renameSurvey(id: string, name: string): void {
  update(id, (survey) => ({ ...survey, name, updatedAt: today() }));
}

export function saveSurveyJson(id: string, json: SurveyJSON): void {
  update(id, (survey) => ({ ...survey, json, updatedAt: today() }));
}

export function setPublished(id: string, isPublished: boolean): void {
  update(id, (survey) => ({ ...survey, isPublished, updatedAt: today() }));
}

export function setArchived(id: string, archived: boolean): void {
  update(id, (survey) => ({ ...survey, archived, updatedAt: today() }));
}

export function deleteSurvey(id: string): void {
  const current = getSnapshot();
  setState({
    surveys: current.surveys.filter((survey) => survey.id !== id),
    responses: current.responses.filter((response) => response.surveyId !== id),
  });
}

export function addResponse(surveyId: string, data: SurveyData): void {
  const current = getSnapshot();
  const response: DemoResponse = {
    id: `${surveyId}-r${Date.now().toString(36)}`,
    surveyId,
    submittedAt: today(),
    data,
  };
  setState({ ...current, responses: [...current.responses, response] });
}

/** Refill a survey's responses — handy after editing its questions. */
export function regenerateResponses(id: string, count = 60): void {
  const current = getSnapshot();
  const survey = findSurvey(current, id);
  if (!survey) return;
  setState({
    ...current,
    responses: [
      ...current.responses.filter((response) => response.surveyId !== id),
      ...generateResponses(survey.json, id, count),
    ],
  });
}

export function resetWorkspace(): void {
  setState(createSeedState());
}
