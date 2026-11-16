// Load Choices from Web: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/choices-from-web.ts (GET /api/offices and GET /api/countries; the save is save-response's).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import ChoicesFromWeb from "./client";

export const generateMetadata = () => exampleMetadata("choices-from-web");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("choices-from-web", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Load choice lists from APIs and update them when related answers change. For example, changing a region reloads the office list with matching options from your backend.</p>}
      tryThis={<>
        <li>Select an <strong>Office</strong>, then change the <strong>Region</strong>. The previous office selection is cleared, and the backend supplies offices in the new region.</li>
        <li>Choose <strong>Your country</strong> from a separate list served by Next.js. The backend caches the list and uses bundled choices if the external service is unavailable.</li>
        <li>Press <strong>Complete</strong> to save your answers, then open <strong>Data</strong> to inspect the stored office ID and country code.</li>
        <li>Open <strong>Requests</strong> to inspect the office and country lookups, including the example authorization header.</li>
        <li>Press <strong>Start over</strong> to reset the form.</li>
      </>}
      actions={<StartOver />}
    >
      <ChoicesFromWeb />
    </ExampleLayout>
  );
}
