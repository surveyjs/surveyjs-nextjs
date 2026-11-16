"use client";
// Demo only: renders what an example's start-up code created, in place of shared/client/host.js's mountSurvey() and
// survey-creator-js's renderSurveyCreator(): a form (survey-react-ui's <Survey>) or Survey Creator
// (survey-creator-react's <SurveyCreatorComponent>). Both render in the browser only: SurveyJS numbers its elements
// as it creates them, and Creator touches window when it is imported.
import dynamic from "next/dynamic";
import type { Model } from "survey-core";
import type { SurveyCreator } from "survey-creator-react";

const Survey = dynamic(() => import("survey-react-ui").then((m) => m.Survey), { ssr: false });
const SurveyCreatorComponent = dynamic(() => import("survey-creator-react").then((m) => m.SurveyCreatorComponent), { ssr: false });

export type View = { survey: Model } | { creator: SurveyCreator } | null;

export function SurveyJsView({ view }: { view: View }) {
  if (view && "creator" in view) return <SurveyCreatorComponent creator={view.creator} />;
  if (view && "survey" in view) return <Survey model={view.survey} />;
  return null;
}
