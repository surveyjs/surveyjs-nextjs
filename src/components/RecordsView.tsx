"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import {
  insuranceClaimSeed,
  type ClaimRecord,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";
import { cn } from "@/lib/utils";
import { SurveyForm } from "@/components/SurveyForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type EditorMode = "create" | "edit" | "view";

interface Editor {
  readonly mode: EditorMode;
  readonly record: ClaimRecord | null;
  readonly key: number;
}

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const STATUS_BADGE: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  submitted: "bg-sky-500/15 text-sky-700 dark:text-sky-300 dark:bg-sky-400/15",
  in_review:
    "bg-amber-500/15 text-amber-700 dark:text-amber-300 dark:bg-amber-400/15",
  approved:
    "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 dark:bg-emerald-400/15",
  denied: "bg-destructive/15 text-destructive dark:text-red-300 dark:bg-red-400/15",
};

function statusLabel(status: unknown): string {
  return String(status ?? "").replace(/_/g, " ") || "—";
}

function claimantName(data: SurveyData): string {
  return [data.firstName, data.lastName].filter(Boolean).join(" ") || "—";
}

export function RecordsView({ schema }: { schema: SurveyJSON }) {
  const [records, setRecords] = useState<ClaimRecord[]>(() =>
    insuranceClaimSeed.map((r) => ({ ...r, data: { ...r.data } })),
  );
  const [editor, setEditor] = useState<Editor | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ClaimRecord | null>(null);

  const open = useCallback(
    (mode: EditorMode, record: ClaimRecord | null) =>
      setEditor((prev) => ({ mode, record, key: (prev?.key ?? 0) + 1 })),
    [],
  );

  const handleComplete = useCallback(
    (data: SurveyData) => {
      const saved: SurveyData = { ...data };
      const fromField = String(saved.claimNumber ?? "").trim();
      const id =
        editor?.mode === "edit" && editor.record
          ? editor.record.id
          : fromField ||
            `CLM-2026-${String(records.length + 1).padStart(4, "0")}`;

      setRecords((prev) => {
        if (editor?.mode === "edit" && editor.record) {
          const existing = editor.record.id;
          return prev.map((r) =>
            r.id === existing ? { id: existing, data: saved } : r,
          );
        }
        return [...prev, { id, data: { ...saved, claimNumber: id } }];
      });

      setEditor((prev) => ({
        mode: "view",
        record: { id, data: { ...saved, claimNumber: id } },
        key: (prev?.key ?? 0) + 1,
      }));
    },
    [editor, records.length],
  );

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    setRecords((prev) => prev.filter((r) => r.id !== deleteTarget.id));
    setEditor((prev) => (prev?.record?.id === deleteTarget.id ? null : prev));
    setDeleteTarget(null);
  }, [deleteTarget]);

  const editorTitle = useMemo(() => {
    if (!editor) return "Form";
    if (editor.mode === "create") return "New claim";
    if (editor.mode === "edit") return `Edit ${editor.record?.id ?? ""}`;
    return `View ${editor.record?.id ?? ""}`;
  }, [editor]);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => open("create", null)}>
          <PlusIcon /> New claim
        </Button>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[7fr_5fr]">
        <Card className="overflow-hidden py-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Claim #</TableHead>
                <TableHead>Claimant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-muted-foreground py-10 text-center"
                  >
                    No records. Create a new claim to get started.
                  </TableCell>
                </TableRow>
              )}
              {records.map((record) => {
                const active = editor?.record?.id === record.id;
                return (
                  <TableRow
                    key={record.id}
                    data-state={active ? "selected" : undefined}
                  >
                    <TableCell className="font-mono">{record.id}</TableCell>
                    <TableCell>{claimantName(record.data)}</TableCell>
                    <TableCell className="capitalize">
                      {String(record.data.claimType ?? "—")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={cn(
                          "capitalize",
                          STATUS_BADGE[String(record.data.status)],
                        )}
                      >
                        {statusLabel(record.data.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {typeof record.data.amountClaimed === "number"
                        ? currency.format(record.data.amountClaimed)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => open("view", record)}
                        >
                          View
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => open("edit", record)}
                        >
                          Edit
                        </Button>
                        <Button size="sm" variant="ghost" asChild>
                          <Link href="/records/configure">Config</Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(record)}
                        >
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>

        <div className="lg:sticky lg:top-20">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-base font-semibold">{editorTitle}</h2>
            {editor && (
              <div className="flex gap-2">
                {editor.mode === "view" && editor.record && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => open("edit", editor.record)}
                  >
                    Edit
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={() => setEditor(null)}>
                  Close
                </Button>
              </div>
            )}
          </div>
          {editor ? (
            <SurveyForm
              key={editor.key}
              schema={schema}
              data={editor.record?.data}
              mode={editor.mode === "view" ? "display" : "edit"}
              onComplete={editor.mode === "view" ? undefined : handleComplete}
            />
          ) : (
            <div className="border p-6">
              <p className="text-muted-foreground py-6 text-center">
                Select a record to view or edit, or create a new claim.
              </p>
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete claim?</DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              <span className="font-mono">{deleteTarget?.id}</span>
              {deleteTarget ? ` (${claimantName(deleteTarget.data)})` : ""}. This
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
