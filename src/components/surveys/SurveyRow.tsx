"use client";

import { useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import Link, { useLinkStatus } from "next/link";
import {
  BarChart3Icon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CopyPlusIcon,
  FileDownIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
  Settings2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  cloneSurvey,
  deleteSurvey,
  renameSurvey,
} from "@/storage/survey-json";
import type { DemoSurvey } from "@/storage/types";
import { exportSurveyToPdf } from "@/lib/pdf-export";

/**
 * Swaps a link's icon for a spinner while its navigation is in flight.
 *
 * `useLinkStatus` only works inside a `<Link>`, which is the point: the buttons
 * stay real links — prefetched, middle-clickable — and still react the instant
 * they are pressed. The Creator and the dashboard take a moment to load, and
 * without this the row looks dead in the meantime.
 */
function LinkIcon({ idle: Idle }: { idle: ComponentType<{ className?: string }> }) {
  const { pending } = useLinkStatus();
  return pending ? <Loader2Icon className="animate-spin" /> : <Idle />;
}

type Working = "pdf" | "clone" | "delete" | null;

export function SurveyRow({
  survey,
  responseCount,
}: {
  survey: DemoSurvey;
  responseCount: number;
}) {
  const router = useRouter();
  const [editingName, setEditingName] = useState<string | null>(null);
  const [working, setWorking] = useState<Working>(null);

  const commitRename = () => {
    if (editingName !== null && editingName.trim()) {
      void renameSurvey(survey.id, editingName.trim());
    }
    setEditingName(null);
  };

  /** Menu actions close the menu, so their spinner shows on the trigger. */
  const run = async (action: Exclude<Working, null>, task: () => Promise<void>) => {
    setWorking(action);
    try {
      await task();
    } finally {
      setWorking(null);
    }
  };

  return (
    <div className="flex flex-col gap-3 border-b px-4 py-4 last:border-b-0 sm:flex-row sm:items-center sm:gap-4">
      <div className="min-w-0 flex-1">
        {editingName === null ? (
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate font-medium" title={survey.name}>
              {survey.name}
            </span>
            <Button
              variant="ghost"
              size="icon-xs"
              aria-label="Rename survey"
              onClick={() => setEditingName(survey.name)}
            >
              <PencilIcon />
            </Button>
          </div>
        ) : (
          <div className="flex max-w-md items-center gap-2">
            <Input
              autoFocus
              value={editingName}
              placeholder="Enter a survey name..."
              onChange={(event) => setEditingName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") commitRename();
                if (event.key === "Escape") setEditingName(null);
              }}
            />
            <Button size="icon-sm" aria-label="Save name" onClick={commitRename}>
              <CheckIcon />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Cancel rename"
              onClick={() => setEditingName(null)}
            >
              <XIcon />
            </Button>
          </div>
        )}

        <p className="text-muted-foreground mt-1 text-xs">
          {responseCount} response{responseCount === 1 ? "" : "s"}
        </p>
      </div>

      <div className="text-muted-foreground flex shrink-0 items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5" title="Created on">
          <CalendarIcon className="size-3.5" />
          {survey.createdAt}
        </span>
        <span className="flex items-center gap-1.5" title="Updated on">
          <ClockIcon className="size-3.5" />
          {survey.updatedAt}
        </span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/surveys/${survey.id}/configure`}>
            <LinkIcon idle={Settings2Icon} />
            Configure
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/surveys/${survey.id}/run`}>
            <LinkIcon idle={PlayIcon} />
            Run
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/surveys/${survey.id}/results`}>
            <LinkIcon idle={BarChart3Icon} />
            Results
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Survey actions"
              disabled={working !== null}
            >
              {working ? (
                <Loader2Icon className="animate-spin" />
              ) : (
                <MoreHorizontalIcon />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem
              onSelect={() => run("pdf", () => exportSurveyToPdf(survey))}
            >
              <FileDownIcon />
              Export to PDF
            </DropdownMenuItem>

            <DropdownMenuItem
              onSelect={() =>
                run("clone", async () => {
                  const clone = await cloneSurvey(survey.id);
                  if (clone) router.push(`/surveys/${clone.id}/configure`);
                })
              }
            >
              <CopyPlusIcon />
              Clone
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              variant="destructive"
              onSelect={() => {
                if (
                  window.confirm(
                    "Do you really want to delete this survey? This operation can't be undone.",
                  )
                ) {
                  void run("delete", () => deleteSurvey(survey.id));
                }
              }}
            >
              <Trash2Icon />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
