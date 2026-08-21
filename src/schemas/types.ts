/**
 * Shared, renderer-agnostic types for the schema package.
 *
 * NOTE: This package depends on `survey-core` ONLY. Nothing here may reference
 * a UI framework (survey-react-ui, react-bootstrap, MUI, Tailwind, ...).
 */

/** A SurveyJS V3 survey definition (the JSON you'd pass to `new Model(json)`). */
export type SurveyJSON = Record<string, unknown>;

/** Survey response data keyed by question name. */
export type SurveyData = Record<string, unknown>;

/** Rendering mode for the model factory. */
export type SurveyMode = "edit" | "display";

/** A self-contained, drop-in schema with a stable id + human label. */
export interface SchemaDefinition {
  /** Stable identifier used by routes/nav and the demo registry. */
  readonly id: string;
  /** Human-readable title (mirrors the schema's own `title`). */
  readonly title: string;
  /** Short description for cards / page intros. */
  readonly description: string;
  /** The SurveyJS V3 JSON. Replace freely with real CMS-1500 / intake JSON. */
  readonly json: SurveyJSON;
}
