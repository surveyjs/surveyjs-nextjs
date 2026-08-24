"use client";

import { useCallback, useRef } from "react";
import { FileDownIcon } from "lucide-react";
import type { Model } from "survey-core";
import { Button } from "@/components/ui/button";
import { SurveyForm } from "@/components/SurveyForm";
import { addResponse } from "@/demo/store";
import type { DemoSurvey } from "@/demo/types";
import { exportSurveyToPdf } from "@/lib/pdf-export";

export default function RunPane({ survey }: { survey: DemoSurvey }) {
  const model = useRef<Model | null>(null);

  const onModelReady = useCallback((instance: Model) => {
    model.current = instance;
  }, []);

  const onComplete = useCallback(
    (data: Record<string, unknown>) => addResponse(survey.id, data),
    [survey.id],
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          onClick={() => exportSurveyToPdf(survey, model.current?.data)}
        >
          <FileDownIcon />
          Save as PDF
        </Button>
      </div>
      <SurveyForm
        schema={survey.json}
        onComplete={onComplete}
        completedMessage="Thank you. Your response has been added to this survey's results."
      />
    </div>
  );
}
