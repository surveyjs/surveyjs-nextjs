"use client";

import "@/lib/survey-ssr-environment";
import { useEffect, useMemo, useState } from "react";
import { Survey } from "survey-react-ui";
import type { Question } from "survey-core";
import {
  createSurveyModel,
  type SchemaInput,
  type SurveyData,
  type SurveyMode,
} from "@/schemas";
import { FormCompleted } from "./FormCompleted";

import "survey-core/survey-core.css";
import "survey-core/themes/adapters/shadcn-base-nova.css";
import "@/styles/survey-overrides-shadcn.css";
import "@/styles/survey-overrides-base-nova.css";

export function SurveyForm({
  schema,
  data,
  mode,
  onComplete,
  completedMessage = "Thank you. Your response has been submitted.",
  prefillData,
  prefillLabel = "Prefill demo data",
}: {
  schema: SchemaInput;
  data?: SurveyData;
  mode?: SurveyMode;
  onComplete?: (data: SurveyData) => void;
  completedMessage?: string;
  prefillData?: SurveyData;
  prefillLabel?: string;
}) {
  const model = useMemo(
    () => createSurveyModel(schema, { data, mode }),
    [schema, data, mode],
  );

  useEffect(() => {
    if (!prefillData) return;
    const id = "sv-prefill-demo";
    model.addNavigationItem({
      id,
      title: prefillLabel,
      action: () => {
        const names = new Set(
          model.currentPage.questions.map((q: Question) => q.getValueName()),
        );
        model.mergeData(
          Object.fromEntries(
            Object.entries(prefillData).filter(([key]) => names.has(key)),
          ),
        );
      },
    });
    return () => {
      model.navigationBar.removeActionById(id);
    };
  }, [model, prefillData, prefillLabel]);

  const [completed, setCompleted] = useState(false);
  useEffect(() => setCompleted(false), [model]);
  useEffect(() => {
    const handler = (sender: typeof model) => {
      setCompleted(true);
      onComplete?.(sender.data);
    };
    model.onComplete.add(handler);
    return () => model.onComplete.remove(handler);
  }, [model, onComplete]);

  const handleEdit = () => {
    model.clear(false);
    setCompleted(false);
  };

  if (completed) {
    return <FormCompleted message={completedMessage} onEdit={handleEdit} />;
  }

  return (
    <div className="border overflow-hidden">
      <Survey model={model} />
    </div>
  );
}
