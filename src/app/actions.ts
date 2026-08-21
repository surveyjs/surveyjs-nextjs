"use server";

import { revalidatePath } from "next/cache";
import { Model } from "survey-core";
import { getSchemaDefinition, type SurveyJSON } from "@/schemas";
import { clearSurveyJson, getSessionId, setSurveyJson } from "@/lib/schema-store";

export interface ActionResult {
  readonly ok: boolean;
  readonly error?: string;
}

export async function saveSurveyJson(
  schemaId: string,
  source: string,
): Promise<ActionResult> {
  const sessionId = await getSessionId();
  if (!sessionId) return { ok: false, error: "No demo session. Reload the page." };

  let parsed: unknown;
  try {
    parsed = JSON.parse(source);
  } catch (error) {
    return { ok: false, error: `Invalid JSON: ${(error as Error).message}` };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: "The survey definition must be a JSON object." };
  }

  try {
    new Model(parsed);
  } catch (error) {
    return { ok: false, error: `survey-core rejected the schema: ${(error as Error).message}` };
  }

  getSchemaDefinition(schemaId);
  setSurveyJson(sessionId, schemaId, parsed as SurveyJSON);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function resetSurveyJson(schemaId: string): Promise<ActionResult> {
  const sessionId = await getSessionId();
  if (!sessionId) return { ok: false, error: "No demo session. Reload the page." };
  clearSurveyJson(sessionId, schemaId);
  revalidatePath("/", "layout");
  return { ok: true };
}
