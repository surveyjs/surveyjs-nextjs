import type { SurveyJSON } from "@/schemas";

const PREFIX = "sjs-demo-schema:";

function key(schemaId: string): string {
  return `${PREFIX}${schemaId}`;
}

export function readOverride(schemaId: string): SurveyJSON | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key(schemaId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null;
    }
    return parsed as SurveyJSON;
  } catch {
    return null;
  }
}

export function writeOverride(schemaId: string, json: SurveyJSON): boolean {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key(schemaId), JSON.stringify(json));
    return true;
  } catch {
    return false;
  }
}

export function clearOverride(schemaId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key(schemaId));
  } catch {
    // Ignore — a demo override is not worth surfacing a storage failure for.
  }
}
