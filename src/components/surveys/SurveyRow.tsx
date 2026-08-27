"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart3Icon,
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CopyPlusIcon,
  FileDownIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PlayIcon,
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

export function SurveyRow({
  survey,
  responseCount,
}: {
  survey: DemoSurvey;
  responseCount: number;
}) {
  const router = useRouter();
  const [editingName, setEditingName] = useState<string | null>(null);

  const commitRename = () => {
    if (editingName !== null && editingName.trim()) {
      void renameSurvey(survey.id, editingName.trim());
    }
    setEditingName(null);
  };

  const openEditor = () => router.push(`/surveys/${survey.id}/edit`);

  return (
    <div
      className="hover:bg-accent/40 flex cursor-pointer flex-col gap-3 border-b px-4 py-4 transition-colors last:border-b-0 sm:flex-row sm:items-center sm:gap-4"
      onClick={() => {
        if (editingName === null) openEditor();
      }}
    >
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
              onClick={(event) => {
                event.stopPropagation();
                setEditingName(survey.name);
              }}
            >
              <PencilIcon />
            </Button>
          </div>
        ) : (
          <div
            className="flex max-w-md items-center gap-2"
            onClick={(event) => event.stopPropagation()}
          >
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

      <div
        className="flex shrink-0 items-center gap-2"
        onClick={(event) => event.stopPropagation()}
      >
        <Button variant="outline" size="sm" asChild>
          <Link href={`/surveys/${survey.id}/run`}>
            <PlayIcon />
            Run
          </Link>
        </Button>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/surveys/${survey.id}/results`}>
            <BarChart3Icon />
            Results
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Survey actions">
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuItem onSelect={openEditor}>
              <PencilIcon />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => router.push(`/surveys/${survey.id}/run`)}
            >
              <PlayIcon />
              Run
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => router.push(`/surveys/${survey.id}/results`)}
            >
              <BarChart3Icon />
              View Results
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => exportSurveyToPdf(survey)}>
              <FileDownIcon />
              Export to PDF
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={async () => {
                const clone = await cloneSurvey(survey.id);
                if (clone) router.push(`/surveys/${clone.id}/edit`);
              }}
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
                  void deleteSurvey(survey.id);
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
