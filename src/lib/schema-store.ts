import { cookies } from "next/headers";
import { getSchemaDefinition, type SurveyJSON } from "@/schemas";
import { SESSION_COOKIE } from "@/lib/session";

// Next bundles server actions and page renders separately, so module-level
// state is not shared between them. globalThis is.
const globalStore = globalThis as unknown as {
  __surveyJsonOverrides?: Map<string, Map<string, SurveyJSON>>;
};
const overrides = (globalStore.__surveyJsonOverrides ??= new Map<
  string,
  Map<string, SurveyJSON>
>());

export async function getSessionId(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getSurveyJson(schemaId: string): Promise<SurveyJSON> {
  const sessionId = await getSessionId();
  const custom = sessionId
    ? overrides.get(sessionId)?.get(schemaId)
    : undefined;
  return custom ?? getSchemaDefinition(schemaId).json;
}

export async function isCustomized(schemaId: string): Promise<boolean> {
  const sessionId = await getSessionId();
  return Boolean(sessionId && overrides.get(sessionId)?.has(schemaId));
}

export function setSurveyJson(
  sessionId: string,
  schemaId: string,
  json: SurveyJSON,
): void {
  const bucket = overrides.get(sessionId) ?? new Map<string, SurveyJSON>();
  bucket.set(schemaId, json);
  overrides.set(sessionId, bucket);
}

export function clearSurveyJson(sessionId: string, schemaId: string): void {
  overrides.get(sessionId)?.delete(schemaId);
}
