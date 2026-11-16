// Save Responses: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/save-response.ts (POST /api/responses).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import SaveResponse from "./client";

export const generateMetadata = () => exampleMetadata("save-response");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("save-response", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Send completed form responses to your backend and store them as JSON. The server returns the saved response&apos;s ID to confirm success.</p>}
      tryThis={<>
        <li>Enter your email and a message. Both fields are required.</li>
        <li>Press <strong>Send message</strong>. The completion screen shows <strong>Sending your message...</strong> until the server confirms the save, then displays the response&apos;s ID.</li>
        <li>Open <strong>Requests</strong> and expand <code>POST /api/responses</code> to inspect the request body and the server&apos;s response. Then open <strong>Data</strong> to find the saved record with the same ID.</li>
        <li>If saving fails, an error message appears. Press <strong>Try again</strong> to resend your answers.</li>
        <li>Press <strong>Start over</strong> to clear the form and submit another response.</li>
      </>}
      actions={<StartOver />}
    >
      <SaveResponse />
    </ExampleLayout>
  );
}
