// Analyze Results with Dashboard: the example page and its texts. The SurveyJS code is in client.tsx, the server
// code in src/server/routes/dashboard.ts (GET /api/responses; the GET /api/forms/:id is load-definition-variables-data's).
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import DashboardResults from "./client";

export const generateMetadata = () => exampleMetadata("dashboard");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("dashboard", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Load a form schema and collected responses from your backend to build an interactive Dashboard. Explore the results with built-in date filters, chart selection, and cross-filtering.</p>}
      tryThis={<>
        <li>Use Dashboard&apos;s date panel to choose a preset or enter a date range. The response count and charts update for the selected period.</li>
        <li>Click a bar under <strong>Where did you hear about us?</strong> to filter the other charts to that group. Press <strong>Reset Filter</strong> to include everyone again.</li>
        <li>Change a chart type or sort order to explore the same answers in a different way.</li>
        <li>Open <strong>Requests</strong> to inspect the form schema and responses, including their submission dates. Date filtering happens in Dashboard after the responses are loaded. <strong>Data</strong> shows the total number of stored responses.</li>
      </>}
      form={<>
        <div id="dashboard-notice" className="flex flex-wrap items-center gap-3 border-b p-4 text-sm">
          <p data-show="dashboard-status" role="status" aria-live="polite" className="m-0 flex-1 font-semibold">Loading responses...</p>
          <button id="retry-dashboard" type="button" hidden className={button}>Try again</button>
        </div>
        <div id="dashboard" hidden aria-busy="true" className="min-h-96 p-2"></div>
        <DashboardResults />
      </>}
    />
  );
}
