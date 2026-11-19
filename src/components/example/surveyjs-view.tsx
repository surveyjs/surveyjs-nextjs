"use client";
// Demo only: renders what an example's start-up code created in the browser, in place of shared/client/host.js's
// mountSurvey() and survey-creator-js's renderSurveyCreator(): a form (survey-react-ui's <Survey>) or Survey Creator
// (survey-creator-react's <SurveyCreatorComponent>). The pages whose form comes with the page render <Survey> from
// their own client component, on the server too.
import type { Model } from "survey-core";
import { SurveyCreatorComponent, type SurveyCreator } from "survey-creator-react";
import { Survey } from "survey-react-ui";

export type View = { survey: Model } | { creator: SurveyCreator } | null;

export function SurveyJsView({ view }: { view: View }) {
  if (view && "creator" in view) return <SurveyCreatorComponent creator={view.creator} />;
  if (view && "survey" in view) return <Survey model={view.survey} />;
  return null;
}
