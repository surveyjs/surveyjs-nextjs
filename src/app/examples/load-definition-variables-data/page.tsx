// Load JSON Schemas, Variables, and Answers: the example page and its texts. /claim (src/app/claim/page.tsx) renders
// this page with optionA: the definition and the variables embedded in the HTML. The SurveyJS code is in client.tsx,
// the server code in src/server/routes/load-definition-variables-data.ts (Option A's loader and GET /api/forms/:id).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { scriptJson } from "@/lib/script-json";
import { cn } from "@/lib/utils";
import { claimRecords } from "../../../server/demo/pages.ts";
import { loadClaimPage } from "../../../server/routes/load-definition-variables-data.ts";
import LoadDefinitionVariablesData from "./client";

export const generateMetadata = () => exampleMetadata("load-definition-variables-data");

const segment = "flex items-center rounded-md px-2.5 py-1 no-underline";

export default async function Page({ searchParams, optionA = false }: { searchParams: SearchParams; optionA?: boolean }) {
  const pathname = optionA ? "/claim" : "/examples/load-definition-variables-data";
  const { req, data, joinFailed } = await examplePage("load-definition-variables-data", searchParams, pathname);
  const { record, records } = claimRecords(req);
  // Option A: embed the schema and user variables as JSON escaped for an inline script
  const embedded = optionA ? loadClaimPage(req) : null;
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      inlineScript={embedded ? `window.FORM_DEFINITION = ${scriptJson(embedded.definition)};window.FORM_VARIABLES = ${scriptJson(embedded.variables)};` : undefined}
      description={<p>Load form schemas and user variables from your Next.js backend, either embedded in HTML or fetched from an API. Use variables to personalize form text and control question visibility, and restore saved answers through the API to prefill the form.</p>}
      tryThis={<>
        <li>Choose <strong>Schema embedded in HTML</strong> to receive the schema and user variables with the page, or <strong>Load from the API</strong> to fetch them and any saved answers in a separate request. You can inspect the API call in <strong>Requests</strong>.</li>
        <li>Switch <strong>Customer</strong> between Alice and Bob. User variables personalize the title with their name and plan and show priority handling only for the premium plan.</li>
        <li>When using <strong>Load from the API</strong>, you can select a <strong>Saved response</strong> to prefill the form with the customer&apos;s answers.</li>
        <li>Press <strong>Submit claim</strong> to save a new response. Open <strong>Data</strong> to inspect the saved answers; user variables are excluded.</li>
        <li>Press <strong>Start over</strong> to clear the form and the saved response selection.</li>
      </>}
      userControl={
        <label className="flex items-center gap-2">
          <span className="text-gray-600">Customer</span>
          <NativeSelect id="demo-user" data-reset-query="record" defaultValue={data.demoUser} className="bg-background">
            <NativeSelectOption value="alice">Alice (premium)</NativeSelectOption>
            <NativeSelectOption value="bob">Bob (basic)</NativeSelectOption>
          </NativeSelect>
        </label>
      }
      actions={<>
        <span className="box-border inline-flex min-h-9 max-w-full items-stretch rounded-lg border bg-background p-0.5" role="group" aria-label="Schema delivery">
          <a href="/claim" aria-current={optionA ? "page" : undefined} className={cn(segment, optionA ? "bg-primary text-primary-foreground" : "text-gray-700 hover:bg-muted")}>Schema embedded in HTML</a>
          <a href="/examples/load-definition-variables-data" aria-current={optionA ? undefined : "page"} className={cn(segment, optionA ? "text-gray-700 hover:bg-muted" : "bg-primary text-primary-foreground")}>Load from the API</a>
        </span>
        {!optionA && (
          <form method="get" className="flex items-center gap-2">
            <label htmlFor="record" className="text-gray-600">Saved response</label>
            <NativeSelect id="record" name="record" defaultValue={record} className="bg-background">
              <NativeSelectOption value="">New response</NativeSelectOption>
              {records.map((r) => <NativeSelectOption key={r.id} value={r.id}>{r.label}</NativeSelectOption>)}
            </NativeSelect>
            {/* The reference's onchange="this.form.submit()": it works as soon as the page is parsed, before hydration */}
            <script dangerouslySetInnerHTML={{ __html: 'document.getElementById("record").addEventListener("change", (e) => e.target.form.submit());' }} />
          </form>
        )}
        <StartOver />
      </>}
    >
      <LoadDefinitionVariablesData />
    </ExampleLayout>
  );
}
