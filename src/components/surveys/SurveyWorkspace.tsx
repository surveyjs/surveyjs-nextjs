"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeftIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSurvey } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";
import RunPane from "./RunPane";

function PaneLoader() {
  return (
    <div
      className="text-muted-foreground flex min-h-96 items-center justify-center rounded-lg border"
      role="status"
      aria-label="Loading..."
    >
      <Loader2Icon className="size-6 animate-spin" />
    </div>
  );
}

// The Creator and the Dashboard both reach for `window` while they build their
// UI, so they never render on the server.
const CreatorPane = dynamic(() => import("./CreatorPane"), {
  ssr: false,
  loading: PaneLoader,
});
const ResultsPane = dynamic(() => import("./ResultsPane"), {
  ssr: false,
  loading: PaneLoader,
});

export type WorkspaceTab = "edit" | "run" | "results";

const TABS: { id: WorkspaceTab; label: string; segment: string }[] = [
  { id: "edit", label: "Editor", segment: "edit" },
  { id: "run", label: "Run", segment: "run" },
  { id: "results", label: "Results", segment: "results" },
];

export function SurveyWorkspace({
  surveyId,
  tab,
}: {
  surveyId: string;
  tab: WorkspaceTab;
}) {
  const survey = useSurvey(surveyId);

  if (!survey) {
    return (
      <div className="mx-auto max-w-lg py-24 text-center">
        <h1 className="text-lg font-semibold">Survey not found</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          It may have been deleted from this browser&apos;s workspace.
        </p>
        <Button className="mt-6" asChild>
          <Link href="/surveys">Back to My Forms</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/surveys">
            <ArrowLeftIcon />
            My Forms
          </Link>
        </Button>
        <h1 className="min-w-0 truncate text-lg font-semibold">{survey.name}</h1>

        <nav className="bg-muted ml-auto inline-flex rounded-md p-0.5">
          {TABS.map((item) => (
            <Link
              key={item.id}
              href={`/surveys/${survey.id}/${item.segment}`}
              aria-current={item.id === tab ? "page" : undefined}
              className={cn(
                "rounded-sm px-3 py-1 text-sm transition-colors",
                item.id === tab
                  ? "bg-background text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="min-h-0 flex-1">
        {tab === "edit" && <CreatorPane surveyId={survey.id} />}
        {tab === "run" && <RunPane survey={survey} />}
        {tab === "results" && (
          <ResultsPane surveyId={survey.id} json={survey.json} />
        )}
      </div>
    </div>
  );
}
