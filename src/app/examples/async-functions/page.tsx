// Async Calculations and Validation: the example page and its texts. The SurveyJS code is in client.tsx, the server
// code in src/server/routes/async-functions.ts (GET /api/customers/exists and GET /api/shipping).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import AsyncFunctions from "./client";

export const generateMetadata = () => exampleMetadata("async-functions");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("async-functions", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Use backend data in calculations and validation. The form requests the needed information and updates its calculations or error messages when the server responds.</p>}
      tryThis={<>
        <li>Enter <code>taken@example.com</code> and leave the field. The backend reports that the email is already registered. Try <code>new@example.com</code> to see an available email.</li>
        <li>Enter <code>10115</code>, <code>10999</code>, <code>80331</code>, or <code>SW1A 1AA</code> as the postcode. The shipping price appears when the backend returns a rate.</li>
        <li>Try <code>99999</code> to see an unsupported postcode. If a lookup fails, the status above the form explains the failure and offers <strong>Retry checks</strong>.</li>
        <li>Press <strong>Check details</strong> with an available email and supported postcode. The form completes only after its asynchronous validation passes. Open <strong>Requests</strong> to inspect the lookups.</li>
        <li>Press <strong>Start over</strong> to try other emails and postcodes in an empty form.</li>
      </>}
      actions={<StartOver />}
      form={<>
        <div className="space-y-3 border-b p-4 text-sm sm:px-6" role="status" aria-live="polite">
          <dl className="m-0 grid gap-3 sm:grid-cols-2">
            <div><dt className="font-semibold">Email availability</dt><dd data-show="email-status" className="m-0 mt-1 text-muted-foreground">Enter an email address.</dd></div>
            <div><dt className="font-semibold">Delivery estimate</dt><dd data-show="postcode-status" className="m-0 mt-1 text-muted-foreground">Enter a postcode.</dd></div>
          </dl>
          <button id="retry-checks" type="button" hidden className={cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold")}>Retry checks</button>
        </div>
        <div id="form" className="p-4 sm:p-6"><AsyncFunctions /></div>
      </>}
    />
  );
}
