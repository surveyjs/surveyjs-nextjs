'use client'

import { useEffect, useState } from "react";
import { data, json } from "../../data/analytics_data";

import jsPDF from "jspdf";
// import * as XLSX from "xlsx";
import "jspdf-autotable";

import { Tabulator } from "survey-analytics/survey.analytics.tabulator.js";
import { Model } from "survey-core";
import "survey-analytics/survey.analytics.tabulator.css";
import "tabulator-tables/dist/css/tabulator.min.css";

(window as any)["jsPDF"] = jsPDF;
// (window as any)["XLSX"] = XLSX;

export default function SurveyAnalyticsTabulator() {
  let [visPanel, setVisPanel] = useState<Tabulator>();

  if (visPanel === undefined) {
    const survey = new Model(json);
    visPanel = new Tabulator(survey, data);
    setVisPanel(visPanel);
  }

  useEffect(() => {
    visPanel && visPanel.render(document.getElementById("summaryContainer") as any);
  });

  return <div style={{ height: "80vh", width: "100%" }} id="summaryContainer"></div>;
}
