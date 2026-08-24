import type { SurveyData, SurveyJSON } from "@/schemas";

/**
 * One survey in the demo workspace — the equivalent of a row on the real
 * "My Surveys" page. Everything lives in the browser; there is no API behind it.
 */
export interface DemoSurvey {
  readonly id: string;
  readonly name: string;
  readonly json: SurveyJSON;
  /** ISO date; fixed for seeded surveys so the server and the client agree. */
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly isPublished: boolean;
  readonly archived: boolean;
}

/** A single submitted response, used as input for the analytics dashboard. */
export interface DemoResponse {
  readonly id: string;
  readonly surveyId: string;
  readonly submittedAt: string;
  readonly data: SurveyData;
}

export interface DemoState {
  readonly surveys: readonly DemoSurvey[];
  readonly responses: readonly DemoResponse[];
}
