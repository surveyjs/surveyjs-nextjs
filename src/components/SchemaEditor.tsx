"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  CheckIcon,
  RotateCcwIcon,
  SaveIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SurveyForm } from "@/components/SurveyForm";
import { resetSurveyJson, saveSurveyJson } from "@/app/actions";
import type { SurveyJSON } from "@/schemas";

const JsonEditor = dynamic(() => import("@/components/JsonEditor"), {
  ssr: false,
  loading: () => (
    <div className="text-muted-foreground flex h-full items-center justify-center text-sm">
      Loading editor…
    </div>
  ),
});

function parse(source: string): { json?: SurveyJSON; error?: string } {
  try {
    const parsed = JSON.parse(source);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return { error: "The survey definition must be a JSON object." };
    }
    return { json: parsed as SurveyJSON };
  } catch (error) {
    return { error: (error as Error).message };
  }
}

export function SchemaEditor({
  schemaId,
  title,
  backHref,
  initialSource,
  defaultSource,
  customized,
}: {
  schemaId: string;
  title: string;
  backHref: string;
  initialSource: string;
  defaultSource: string;
  customized: boolean;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [source, setSource] = useState(initialSource);
  const [preview, setPreview] = useState(initialSource);
  const [saved, setSaved] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => setPreview(source), 400);
    return () => clearTimeout(timer);
  }, [source]);

  const parsedPreview = useMemo(() => parse(preview), [preview]);
  const syntaxError = parse(source).error;
  const dirty = source !== initialSource;

  const format = useCallback(() => {
    const { json } = parse(source);
    if (json) setSource(JSON.stringify(json, null, 2));
  }, [source]);

  const save = useCallback(() => {
    setServerError(null);
    startTransition(async () => {
      const result = await saveSurveyJson(schemaId, source);
      if (!result.ok) {
        setServerError(result.error ?? "Failed to save.");
        return;
      }
      setSaved(true);
      router.push(backHref);
      router.refresh();
    });
  }, [backHref, router, schemaId, source]);

  const reset = useCallback(() => {
    setServerError(null);
    setSource(defaultSource);
    startTransition(async () => {
      const result = await resetSurveyJson(schemaId);
      if (!result.ok) setServerError(result.error ?? "Failed to reset.");
      router.refresh();
    });
  }, [defaultSource, router, schemaId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold tracking-tight">
              {title} — survey JSON
            </h1>
            {customized && <Badge variant="secondary">Custom JSON</Badge>}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            The whole form is this JSON. Edit it, watch the preview update, then
            save — the page re-renders it on the server.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" className="gap-2" onClick={() => router.push(backHref)}>
            <ArrowLeftIcon />
            Back
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={format} disabled={Boolean(syntaxError)}>
            <WandSparklesIcon />
            Format
          </Button>
          <Button variant="outline" size="sm" className="gap-2" onClick={reset} disabled={pending}>
            <RotateCcwIcon />
            Reset
          </Button>
          <Button size="sm" className="gap-2" onClick={save} disabled={pending || Boolean(syntaxError) || (!dirty && !customized)}>
            {saved ? <CheckIcon /> : <SaveIcon />}
            {pending ? "Saving…" : "Save & render on server"}
          </Button>
        </div>
      </div>

      {(syntaxError || serverError) && (
        <div className="border-destructive/50 text-destructive mb-3 rounded-md border px-3 py-2 text-sm">
          {serverError ?? syntaxError}
        </div>
      )}

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-2">
        <div className="min-h-[24rem] overflow-hidden rounded-lg border">
          <JsonEditor
            value={source}
            onChange={setSource}
            dark={resolvedTheme === "dark"}
          />
        </div>

        <div className="min-h-0 overflow-y-auto">
          <p className="text-muted-foreground mb-2 text-xs font-medium tracking-wide uppercase">
            Live preview
          </p>
          {parsedPreview.json ? (
            <SurveyForm key={preview} schema={parsedPreview.json} />
          ) : (
            <div className="text-muted-foreground border p-6 text-sm">
              {parsedPreview.error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
