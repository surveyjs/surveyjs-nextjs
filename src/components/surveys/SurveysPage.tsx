"use client";

import { useRouter } from "next/navigation";
import { PlusIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSurvey } from "@/storage/survey-json";
import { resetDemoData } from "@/storage/workspace-cache";
import { useResults, useSurveys } from "@/hooks/useWorkspace";
import { SurveyRow } from "./SurveyRow";

export function SurveysPage() {
  const router = useRouter();
  const surveys = useSurveys();
  const responses = useResults();

  const create = async () => {
    const survey = await createSurvey();
    router.push(`/surveys/${survey.id}/edit`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">My Forms</h1>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetDemoData}>
            <RotateCcwIcon />
            Reset demo data
          </Button>
          <Button size="sm" onClick={create}>
            <PlusIcon />
            Create a Survey
          </Button>
        </div>
      </div>

      <div className="mt-6 rounded-lg border">
        {surveys.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              No surveys yet. Create your first one to get started.
            </p>
            <Button onClick={create}>
              <PlusIcon />
              Create a Survey
            </Button>
          </div>
        ) : (
          surveys.map((survey) => (
            <SurveyRow
              key={survey.id}
              survey={survey}
              responseCount={
                responses.filter((response) => response.surveyId === survey.id)
                  .length
              }
            />
          ))
        )}
      </div>
    </div>
  );
}
