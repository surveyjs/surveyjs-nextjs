// Lint JSON Schemas: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/lint-definition.ts (PUT /api/forms/:id checks the schema before it saves it).
import { ExampleLayout } from "@/components/example/example-layout";
import { ServiceBanner } from "@/components/example/service-banner";
import { Template } from "@/components/example/template";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import LintDefinition from "./client";

export const generateMetadata = () => exampleMetadata("lint-definition");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");
const cell = "border-t px-3 py-2 align-top whitespace-normal";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("lint-definition", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Load a sample schema into Survey Creator, inspect or edit it, then save it to check for broken references and logic errors on the backend. Errors block saving; warnings allow the save and remain available for review.</p>}
      banner={<ServiceBanner name="LINT_DEFINITIONS" on={data.switches.lintDefinitions} />}
      tryThis={<>
        <li>Load <strong>Broken reference</strong> or <strong>Invalid expression</strong>. The survey title and the visibility condition on <strong>Describe the issue</strong> change. Loading a sample does not save it.</li>
        <li>In the <strong>Designer</strong> tab, press the <strong>Save</strong> button, then open <strong>Requests</strong> to inspect the submitted schema and the backend&apos;s findings. Errors block the save.</li>
        <li>Open the <strong>JSON Editor</strong> tab to inspect the JSON schema and fix the condition. Survey Creator&apos;s built-in linter highlights the defect. Once it is fixed, return to <strong>Designer</strong> and save again.</li>
        <li>Load <strong>Unreachable condition</strong>, then press <strong>Save</strong>. The backend saves the schema and returns a warning.</li>
      </>}
      actions={<>
        <button id="retry-load" type="button" hidden className={button}>Retry loading</button>
        <p id="creator-error" hidden role="alert" className="m-0 basis-full text-sm text-destructive"></p>
        <div role="group" aria-labelledby="sample-schema-label" className="flex w-full flex-col gap-2">
          <span id="sample-schema-label" className="font-semibold text-gray-600">Load a sample schema</span>
          <div className="flex flex-wrap items-center gap-2">
            {/* Disabled until client.tsx has loaded Creator and bound them: the reference binds them as soon as the page is parsed */}
            <button type="button" data-lint="broken-reference" disabled className={button}>Broken reference</button>
            <button type="button" data-lint="invalid-expression" disabled className={button}>Invalid expression</button>
            <button type="button" data-lint="unreachable-condition" disabled className={button}>Unreachable condition</button>
          </div>
        </div>
      </>}
      readouts={
        <div id="lint-report" hidden className="overflow-x-auto">
          <Table className="border-collapse text-left text-xs">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="h-auto px-3 py-2">Severity</TableHead>
                <TableHead className="h-auto px-3 py-2">Rule</TableHead>
                <TableHead className="h-auto px-3 py-2">Location</TableHead>
                <TableHead className="h-auto px-3 py-2">Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody id="lint-findings"></TableBody>
          </Table>
        </div>
      }
      form={
        <div id="creator" hidden inert className="h-[calc(100dvh_-_var(--header-h,3.5rem)_-_var(--tabs-h,3.5rem)_-_var(--demo-above,1rem)_-_1.5rem)] min-h-[640px]">
          <LintDefinition />
        </div>
      }
      templates={
        // A row of #lint-findings: TableRow and TableCell's markup, as HTML for the template
        <Template id="lint-finding" html={`
          <tr data-slot="table-row" class="transition-colors hover:bg-muted/50"><td data-field="severity" data-slot="table-cell" class="${cell}"></td><td data-field="rule" data-slot="table-cell" class="${cell}"></td><td data-field="location" data-slot="table-cell" class="${cell}"></td><td data-field="message" data-slot="table-cell" class="${cell}"></td></tr>`} />
      }
    />
  );
}
