import type { SurveyData, SurveyJSON } from "@/schemas";

/**
 * One survey in the workspace — the row you see on `/surveys`, plus the JSON
 * definition Survey Creator edits.
 */
export interface DemoSurvey {
  readonly id: string;
  readonly name: string;
  readonly json: SurveyJSON;
  /** ISO date; fixed for seeded surveys so the server and the client agree. */
  readonly createdAt: string;
  readonly updatedAt: string;
}

/** A single submitted response — what the dashboard charts. */
export interface DemoResponse {
  readonly id: string;
  readonly surveyId: string;
  readonly submittedAt: string;
  readonly data: SurveyData;
}
