import { Model } from "survey-core";
import type { SchemaDefinition, SurveyData, SurveyJSON, SurveyMode } from "./types";

export interface CreateSurveyModelOptions {
  /** Initial response data to load into the model. */
  data?: SurveyData;
  /** `edit` (default) for an interactive form, `display` for read-only. */
  mode?: SurveyMode;
  /** Locale code (e.g. "en", "fr"). Defaults to the survey's own locale. */
  locale?: string;
}

/** Accepts either a raw schema JSON or a {@link SchemaDefinition} wrapper. */
export type SchemaInput = SurveyJSON | SchemaDefinition;

function toJson(schema: SchemaInput): SurveyJSON {
  return "json" in schema && typeof (schema as SchemaDefinition).json === "object"
    ? (schema as SchemaDefinition).json
    : (schema as SurveyJSON);
}

/**
 * Build a configured `survey-core` {@link Model} from a schema (+ optional data
 * and mode). This is the single, renderer-agnostic factory every app uses — it
 * keeps model construction identical across the Bootstrap / shadcn / MUI hosts.
 *
 * The returned model is headless: apps render it with their own UI package.
 */
export function createSurveyModel(
  schema: SchemaInput,
  options: CreateSurveyModelOptions = {},
): Model {
  const { data, mode = "edit", locale } = options;

  const model = new Model(toJson(schema));

  model.mode = mode;

  if (locale) {
    model.locale = locale;
  }

  if (data) {
    // Replace rather than merge so each record loads cleanly.
    model.data = data;
  }

  return model;
}
