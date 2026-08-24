"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, RotateCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSurvey, resetWorkspace } from "@/demo/store";
import { useWorkspace } from "@/demo/useWorkspace";
import { cn } from "@/lib/utils";
import { SurveyRow } from "./SurveyRow";

export function SurveysPage() {
  const router = useRouter();
  const { surveys, responses } = useWorkspace();
  const [showArchived, setShowArchived] = useState(false);

  const visible = surveys.filter((survey) => survey.archived === showArchived);
  const hasArchived = surveys.some((survey) => survey.archived);

  const create = () => {
    const survey = createSurvey();
    router.push(`/surveys/${survey.id}/edit`);
  };

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Surveys</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Every survey here is built, filled in, analysed and exported entirely
            in your browser — no account, no server, no data leaves the page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={resetWorkspace}>
            <RotateCcwIcon />
            Reset demo data
          </Button>
          {!showArchived && (
            <Button size="sm" onClick={create}>
              <PlusIcon />
              Create a Survey
            </Button>
          )}
        </div>
      </div>

      {hasArchived && (
        <div className="bg-muted mt-6 inline-flex rounded-md p-0.5">
          {[
            { label: "Active", archived: false },
            { label: "Archived", archived: true },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => setShowArchived(tab.archived)}
              className={cn(
                "rounded-sm px-3 py-1 text-sm transition-colors",
                showArchived === tab.archived
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      <div className="mt-6 rounded-lg border">
        {visible.length === 0 ? (
          <div className="flex flex-col items-center gap-4 px-6 py-16 text-center">
            <p className="text-muted-foreground text-sm">
              {showArchived
                ? "No archived surveys."
                : "No surveys yet. Create your first one to get started."}
            </p>
            {!showArchived && (
              <Button onClick={create}>
                <PlusIcon />
                Create a Survey
              </Button>
            )}
          </div>
        ) : (
          visible.map((survey) => (
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
