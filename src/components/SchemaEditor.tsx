"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useTheme } from "next-themes";
import {
  ArrowLeftIcon,
  RotateCcwIcon,
  SaveIcon,
  WandSparklesIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SurveyForm } from "@/components/SurveyForm";
import { clearOverride, readOverride, writeOverride } from "@/lib/schema-overrides";
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
  defaultSource,
}: {
  schemaId: string;
  title: string;
  backHref: string;
  /** The canonical definition, server-rendered and used by "Reset". */
  defaultSource: string;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [source, setSource] = useState(defaultSource);
  const [preview, setPreview] = useState(defaultSource);
  const [customized, setCustomized] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);

  // Load this browser's saved definition before the first paint, so the editor
  // never shows the canonical JSON to someone who has their own.
  useLayoutEffect(() => {
    const override = readOverride(schemaId);
    if (!override) return;
    const loaded = JSON.stringify(override, null, 2);
    setSource(loaded);
    setPreview(loaded);
    setCustomized(true);
  }, [schemaId]);

  useEffect(() => {
    const timer = setTimeout(() => setPreview(source), 400);
    return () => clearTimeout(timer);
  }, [source]);

  const parsedPreview = useMemo(() => parse(preview), [preview]);
  const syntaxError = parse(source).error;

  const format = useCallback(() => {
    const { json } = parse(source);
    if (json) setSource(JSON.stringify(json, null, 2));
  }, [source]);

  const save = useCallback(() => {
    const { json, error } = parse(source);
    if (!json) {
      setStorageError(error ?? "Invalid JSON.");
      return;
    }
    if (!writeOverride(schemaId, json)) {
      setStorageError(
        "Could not write to localStorage — private browsing or storage is full.",
      );
      return;
    }
    setStorageError(null);
    router.push(backHref);
  }, [backHref, router, schemaId, source]);

  const reset = useCallback(() => {
    clearOverride(schemaId);
    setSource(defaultSource);
    setCustomized(false);
    setStorageError(null);
  }, [defaultSource, schemaId]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            {title} — survey JSON
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            The whole form is this JSON. Edit it, watch the preview update, then
            save — your version is kept in this browser.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => router.push(backHref)}
          >
            <ArrowLeftIcon />
            Back
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={format}
            disabled={Boolean(syntaxError)}
          >
            <WandSparklesIcon />
            Format
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={reset}
            disabled={source === defaultSource && !customized}
          >
            <RotateCcwIcon />
            Reset
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={save}
            disabled={Boolean(syntaxError)}
          >
            <SaveIcon />
            Save and quit
          </Button>
        </div>
      </div>

      {(syntaxError || storageError) && (
        <div className="border-destructive/50 text-destructive mb-3 rounded-md border px-3 py-2 text-sm">
          {storageError ?? syntaxError}
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
