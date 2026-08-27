"use client";

import { useMemo } from "react";
import { SurveyCreator, SurveyCreatorComponent } from "survey-creator-react";
import type { ICreatorOptions } from "survey-creator-core";
import { findSurvey, saveSurveyJson } from "@/storage/survey-json";

import "survey-core/survey-core.css";
import "survey-creator-core/survey-creator-core.css";

const CREATOR_OPTIONS: ICreatorOptions = {
  showJSONEditorTab: true,
  showTranslationTab: true,
  showThemeTab: true,
  showPreviewTab: true,
  isAutoSave: true,
};

export default function CreatorPane({ surveyId }: { surveyId: string }) {
  // Built once per survey. The JSON is read straight from the store rather than
  // taken as a prop: every save writes a new survey object back, and a prop
  // would rebuild the creator on each keystroke.
  const creator = useMemo(() => {
    const instance = new SurveyCreator(CREATOR_OPTIONS);
    const survey = findSurvey(surveyId);
    if (survey) instance.JSON = survey.json;
    // The callback is what tells the Creator the save went through, so it waits
    // for the storage call — with a real endpoint behind it, a failed request
    // reports back instead of being swallowed.
    instance.saveSurveyFunc = (
      saveNo: number,
      callback: (no: number, isSuccess: boolean) => void,
    ) => {
      saveSurveyJson(surveyId, instance.JSON).then(
        () => callback(saveNo, true),
        () => callback(saveNo, false),
      );
    };
    return instance;
  }, [surveyId]);

  return (
    <div className="h-[calc(100svh-13rem)] min-h-[32rem] overflow-hidden rounded-lg border">
      <SurveyCreatorComponent creator={creator} />
    </div>
  );
}
