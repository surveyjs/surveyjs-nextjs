'use client'

import { useState } from "react";
import { ICreatorOptions } from "survey-creator-core";
import { SurveyCreatorComponent, SurveyCreator } from "survey-creator-react";
import "survey-core/defaultV2.css";
import "survey-creator-core/survey-creator-core.css";

import { json as defaultJson } from "../../data/survey_json";

const defaultCreatorOptions: ICreatorOptions = {
  showLogicTab: true,
  showTranslationTab: true
};

export default function SurveyCreatorWidget(props: { json?: Object, options?: ICreatorOptions }) {
  let [creator, setCreator] = useState<SurveyCreator>();

  if (!creator) {
    creator = new SurveyCreator(props.options || defaultCreatorOptions);
    creator.saveSurveyFunc = (no: number, callback: (num: number, status: boolean) => void) => {
      console.log(JSON.stringify(creator?.JSON));
      callback(no, true);
    };
    setCreator(creator);
  }

  creator.JSON = props.json || defaultJson;

  return (
    <div style={{ height: "80vh", width: "100%" }}>
      <SurveyCreatorComponent creator={creator} />
    </div>
  );
}
