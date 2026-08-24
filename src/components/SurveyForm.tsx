"use client";

import "@/lib/survey-ssr-environment";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Loader2Icon } from "lucide-react";
import { Survey } from "survey-react-ui";
import type { Model, Question } from "survey-core";
import {
  createSurveyModel,
  type SchemaInput,
  type SurveyData,
  type SurveyMode,
} from "@/schemas";
import { readOverride } from "@/lib/schema-overrides";
import { FormCompleted } from "./FormCompleted";

import "survey-core/survey-core.css";
import "survey-core/themes/adapters/shadcn-base-nova.css";
import "@/styles/survey-overrides-shadcn.css";
import "@/styles/survey-overrides-base-nova.css";

/** Minimum time the spinner stays on screen. */
const SPINNER_MIN_MS = 300;

export function SurveyForm({
  schema,
  schemaId,
  data,
  mode,
  onComplete,
  completedMessage = "Thank you. Your response has been submitted.",
  prefillData,
  prefillLabel = "Prefill demo data",
  onModelReady,
}: {
  schema: SchemaInput;
  /**
   * When set, a survey definition saved in localStorage under this id replaces
   * `schema` on the client. The server always renders `schema` itself, so the
   * prerendered HTML — the one crawlers get — stays canonical.
   */
  schemaId?: string;
  data?: SurveyData;
  mode?: SurveyMode;
  onComplete?: (data: SurveyData) => void;
  completedMessage?: string;
  prefillData?: SurveyData;
  prefillLabel?: string;
  onModelReady?: (model: Model) => void;
}) {
  const [effectiveSchema, setEffectiveSchema] = useState<SchemaInput>(schema);
  // Set only on the client, and only for a visitor who has their own saved
  // definition; cleared by survey-core's own "rendered" event below.
  const [swapping, setSwapping] = useState(false);

  // Layout effect, not a plain effect: it runs after hydration but before the
  // browser paints, so the canonical form is never shown to someone whose saved
  // definition is about to replace it.
  useLayoutEffect(() => {
    const override = schemaId ? readOverride(schemaId) : null;
    if (!override) return;

    // Updates from a layout effect are flushed before the browser paints, so
    // the spinner is in the DOM by the time the timeout below fires.
    setSwapping(true);

    // Let the browser paint it, then swap. The delay is a floor, not the cost
    // of the work: rebuilding the model and rendering the survey measures about
    // 30ms, so without it the spinner lives a single frame and reads as a blink.
    const timer = setTimeout(() => {
      setEffectiveSchema(override);
      setSwapping(false);
    }, SPINNER_MIN_MS);
    return () => clearTimeout(timer);
  }, [schemaId, schema]);

  const model = useMemo(
    () => createSurveyModel(effectiveSchema, { data, mode }),
    [effectiveSchema, data, mode],
  );

  useEffect(() => {
    onModelReady?.(model);
  }, [model, onModelReady]);

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

  // The survey stays mounted while swapping — it has to, otherwise it never
  // renders and never reports that it is done. The spinner covers it instead.
  return (
    <div className="relative">
      <div className={swapping ? "invisible" : undefined}>
        <div className="border overflow-hidden">
          <Survey model={model} />
        </div>
      </div>
      {swapping && (
        <div
          className="bg-background absolute inset-0 flex min-h-96 items-center justify-center border"
          role="status"
          aria-label="Loading..."
        >
          <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
        </div>
      )}
    </div>
  );
}
