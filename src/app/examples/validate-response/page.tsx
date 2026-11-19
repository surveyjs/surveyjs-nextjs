// Validate Responses: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/validate-response.ts (POST /api/responses validates the answers against the form schema).
import { ExampleLayout } from "@/components/example/example-layout";
import { ServiceBanner } from "@/components/example/service-banner";
import { StartOver } from "@/components/example/start-over";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import ValidateResponse from "./client";

export const generateMetadata = () => exampleMetadata("validate-response");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");
const TAMPERED: [string, string][] = [["unknown-choice", "Unknown choice"], ["wrong-type", "Wrong type"], ["missing-required", "Missing required answer"]];

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("validate-response", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Validate submitted answers against the form schema before saving them. The backend checks required fields, value types, and allowed choices, even for requests that bypass the form&apos;s browser validation.</p>}
      banner={<ServiceBanner name="VALIDATE_RESPONSES" on={data.switches.validateResponses} />}
      tryThis={<>
        <li>Enter a claim or press <strong>Use sample answers</strong>, then <strong>Submit claim</strong>. The backend validates the answers before saving and returns the saved response ID.</li>
        <li>Press <strong>Unknown choice</strong>, <strong>Wrong type</strong>, or <strong>Missing required answer</strong> to send answers directly to the API and bypass browser validation. Inspect the submitted payload and the server&apos;s errors in <strong>Requests</strong>.</li>
        <li>Open <strong>Requests</strong> to compare accepted and rejected submissions. Rejected answers are not saved; <strong>Data</strong> shows the accepted response.</li>
      </>}
      actions={
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <StartOver />
            <button id="sample-answers" type="button" className={button}>Use sample answers</button>
          </div>
          <div role="group" aria-labelledby="tampered-response-label" className="flex flex-col gap-2 border-t pt-4">
            <span id="tampered-response-label" className="font-semibold text-gray-600">Send a tampered response</span>
            <div className="flex flex-wrap items-center gap-2">
              {TAMPERED.map(([key, label]) => <button key={key} type="button" data-tamper={key} className={button}>{label}</button>)}
            </div>
          </div>
        </div>
      }
    >
      <ValidateResponse definition={data.page.definition} />
    </ExampleLayout>
  );
}
