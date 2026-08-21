'use client'

import { useEffect, useState } from "react";
import { data, json } from "../../data/dashboard_data";
import { Dashboard } from "survey-analytics";
import "survey-analytics/survey.analytics.css";
import { Model } from "survey-core";

export default function SurveyDashboard() {
  let [dashboard, setDashboard] = useState<Dashboard>();

  if (!dashboard) {
    const survey = new Model(json);
    dashboard = new Dashboard({
      questions: survey.getAllQuestions(),
      data
    });
    setDashboard(dashboard);
  }

  useEffect(() => {
    dashboard?.render("surveyDashboard");
    return () => {
      dashboard?.clear();
    }
  }, [dashboard]);

  return <div id="surveyDashboard" style={{"margin": "auto", "width": "100%", "maxWidth": "1400px"}}></div>;
}
