"use client";

import { useEffect, useMemo, useRef } from "react";
import { Model } from "survey-core";
import { VisualizationPanel } from "survey-analytics";
import type { SurveyJSON } from "@/schemas";
import { useWorkspace } from "@/demo/useWorkspace";

import "survey-analytics/survey.analytics.css";

export default function ResultsPane({
  surveyId,
  json,
}: {
  surveyId: string;
  json: SurveyJSON;
}) {
  const container = useRef<HTMLDivElement>(null);
  const { responses } = useWorkspace();

  // The store hands back a stable array, so this only recomputes when the
  // workspace actually changes — the dashboard is expensive to rebuild.
  const data = useMemo(
    () =>
      responses
        .filter((response) => response.surveyId === surveyId)
        .map((response) => response.data),
    [responses, surveyId],
  );

  useEffect(() => {
    const host = container.current;
    if (!host) return;

    const model = new Model(json);
    const panel = new VisualizationPanel(model.getAllQuestions(), data, {
      allowHideQuestions: false,
      allowDynamicLayout: false,
    });
    panel.render(host);

    return () => {
      panel.clear();
      host.innerHTML = "";
    };
  }, [json, data]);

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground rounded-lg border px-6 py-16 text-center text-sm">
        No responses yet. Run the survey to collect some.
      </div>
    );
  }

  return <div ref={container} className="rounded-lg border p-2" />;
}
