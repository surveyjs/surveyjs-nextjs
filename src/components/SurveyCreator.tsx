'use client'

import { useState } from "react";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/defaultV2.css";
import "survey-creator-core/survey-creator-core.css";

import { json } from "../../data/survey_json";

export default function SurveyCreatorWidget() {
  let [creator, setCreator] = useState<SurveyCreator>();

  if (creator === undefined) {
    let options = { showLogicTab: true, showTranslationTab: true };
    creator = new SurveyCreator(options);
    creator.saveSurveyFunc = (no: number, callback: (num: number, status: boolean) => void) => {
      console.log(JSON.stringify(creator.JSON));
      callback(no, true);
    };
    setCreator(creator);
  }

  creator.JSON = json;

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <SurveyCreatorComponent creator={creator} />
    </div>
  );
}
