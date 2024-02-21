'use client'

import { Model } from "survey-core";
import { SurveyPDF } from "survey-pdf";

import { json } from "../../../data/survey_json.js";

function savePDF(model: Model) {
  const surveyPDF = new SurveyPDF(json);
  surveyPDF.data = model.data;
  surveyPDF.save();
};

export default function PdfExport() {
  const model = new Model(json);
  return (
    <div className="flex min-h-screen flex-col items-center p-24">
      <h1 className="">SurveyJS PDF Export</h1>
      <div className="">
        <p>SurveyJS PDF Export is a client-side extension over the SurveyJS Library that enables users to save surveys as PDF documents.</p>
        <p>NOTE: Dynamic elements and characteristics (visibility, validation, navigation buttons) are not supported.</p>
        <p>Click the button below to export survey to a PDF document.</p>
        <button onClick={() => savePDF(model)}>Save as PDF</button>
      </div>
    </div>
  );
}
