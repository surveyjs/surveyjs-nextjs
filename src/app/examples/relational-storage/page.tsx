// Use Relational Storage: the example page and its texts. ?version picks the v1 or v2 definition (both are in the
// page config). The SurveyJS code is in client.tsx, the server code in src/server/routes/relational-storage.ts
// (POST /api/claims).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { Template } from "@/components/example/template";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import { definitionVersion } from "../../../server/demo/pages.ts";
import RelationalStorage from "./client";

export const generateMetadata = () => exampleMetadata("relational-storage");

const VERSIONS: [string, string][] = [["v1", "v1: Original form"], ["v2", "v2: Redesigned form"]];

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { req, data, joinFailed } = await examplePage("relational-storage", searchParams);
  const version = definitionVersion(req);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Copy answers into database columns for SQL queries, preserving the original JSON. Stable answer keys keep the mapping intact when questions are renamed, and the saved schema version helps interpret older responses.</p>}
      tryThis={<>
        <li>In <strong>JSON schema v1</strong>, enter an email and amount, then press <strong>Submit claim</strong>. The confirmation shows the saved response ID. Open <strong>Data</strong> to compare the original answers with the database columns.</li>
        <li>Switch <strong>JSON schema</strong> to <strong>v2</strong>. The mapping table shows new question names with the same answer keys and database columns. Submit another claim to see that the mapping still works.</li>
        <li>Inspect <strong>Data</strong>: each response keeps its schema version and original JSON, including answers that aren&apos;t copied into columns.</li>
        <li>Press <strong>Start over</strong> to submit another claim with the selected schema version.</li>
      </>}
      actions={<>
        <span className="text-gray-600">JSON schema</span>
        <span className="box-border inline-flex min-h-9 max-w-full items-stretch rounded-lg border bg-background p-0.5">
          {VERSIONS.map(([v, label]) => (
            <a key={v} data-definition-version href={`?version=${v}`} aria-current={version === v ? "page" : undefined}
               className={cn("flex items-center rounded-md px-2.5 py-1 no-underline aria-disabled:opacity-50", version === v ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-muted")}>{label}</a>
          ))}
        </span>
        <StartOver />
      </>}
      form={<>
        <section className="space-y-3 border-b p-4 sm:p-6">
          <h3 className="m-0 text-lg font-semibold">Answer mapping · {version}</h3>
          <p className="m-0 text-sm text-muted-foreground">The route handler copies the stable answer keys into these columns. Renaming a question doesn&apos;t change its answer key.</p>
          <Table className="text-left">
            <TableHeader className="bg-muted/50"><TableRow><TableHead>Question name</TableHead><TableHead>Answer key (valueName)</TableHead><TableHead>Database column</TableHead></TableRow></TableHeader>
            <TableBody id="mapping-rows"></TableBody>
          </Table>
          <p data-show="mapping-status" role="status" aria-live="polite" className="m-0 text-sm text-muted-foreground"></p>
        </section>
        <div id="form" className="p-4 sm:p-6"><RelationalStorage /></div>
      </>}
      templates={
        // TableRow and TableCell's classes, as HTML: a template's rows aren't hydrated
        <Template id="mapping-row" html={`
          <tr class="border-b transition-colors hover:bg-muted/50"><td data-field="question" class="p-2 align-middle font-mono text-xs whitespace-nowrap"></td><td data-field="value-name" class="p-2 align-middle font-mono text-xs whitespace-nowrap"></td><td data-field="column" class="p-2 align-middle font-mono text-xs whitespace-nowrap"></td></tr>`} />
      }
    />
  );
}
