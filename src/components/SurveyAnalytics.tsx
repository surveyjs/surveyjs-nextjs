'use client'

import { useEffect, useState } from "react";
import { data, json } from "../../data/analytics_data";
import { VisualizationPanel, VisualizationManager, WordCloud } from "survey-analytics";
import "survey-analytics/survey.analytics.css";
import { Model } from "survey-core";
// const WordCloud = require("wordcloud");
// (window as any)["WordCloud"] = WordCloud;

VisualizationManager.unregisterVisualizerForAll(WordCloud);

export default function SurveyAnalytics() {
  let [visPanel, setVisPanel] = useState<VisualizationPanel>();

  if (visPanel === undefined) {
    const survey = new Model(json);
    visPanel = new VisualizationPanel(survey.getAllQuestions(), data);
    setVisPanel(visPanel);
  }

  useEffect(() => {
    visPanel && visPanel.render(document.getElementById("summaryContainer") as any);
  });

  return <div id="summaryContainer"></div>;
}
