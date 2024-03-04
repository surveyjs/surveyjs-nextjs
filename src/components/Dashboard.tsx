'use client'

import { useEffect, useState } from "react";
import { data, json } from "../../data/dashboard_data";
import { VisualizationPanel, VisualizationManager, WordCloud } from "survey-analytics";
import "survey-analytics/survey.analytics.css";
import { Model } from "survey-core";
// const WordCloud = require("wordcloud");
// (window as any)["WordCloud"] = WordCloud;

// VisualizationManager.unregisterVisualizerForAll(WordCloud);

export default function Dashboard() {
  let [vizPanel, setVizPanel] = useState<VisualizationPanel>();

  if (!vizPanel) {
    const survey = new Model(json);
    vizPanel = new VisualizationPanel(survey.getAllQuestions(), data);
    setVizPanel(vizPanel);
  }

  useEffect(() => {
    vizPanel?.render("surveyVizPanel");
    return () => {
      vizPanel?.clear();
    }
  }, [vizPanel]);

  return <div id="surveyVizPanel" style={{"margin": "auto", "width": "100%", "maxWidth": "1400px"}}></div>;
}
