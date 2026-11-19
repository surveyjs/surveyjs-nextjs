// Store Files Separately: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/store-files.ts (POST /api/files and GET /api/files/:id; the save is save-response's).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import StoreFiles from "./client";

export const generateMetadata = () => exampleMetadata("store-files");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("store-files", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Store uploaded files separately from form responses and save only file references with the answers. This keeps response documents small while allowing the form to retrieve uploaded files from the server for previews.</p>}
      tryThis={<>
        <li>Enter the purpose of an expense and add an image or PDF to <strong>Receipts</strong>. Each file can be up to 5 MB. The comparison above the form shows how file references reduce the response size.</li>
        <li>Press <strong>Submit expense report</strong>. The confirmation shows the saved response ID. Open <strong>Data</strong> to inspect the response&apos;s file references and the separate file records.</li>
        <li>Open <strong>Requests</strong> to inspect the upload and the preview requests. File previews are retrieved through a download endpoint that checks access.</li>
        <li>Press <strong>Start over</strong> to fill out another expense report.</li>
      </>}
      actions={<StartOver />}
      form={<>
        <div className="space-y-1 border-b px-4 py-3 text-sm sm:px-6">
          <p data-show="sizes" className="m-0 text-muted-foreground">Upload a file to compare response sizes.</p>
          <p data-show="file-status" role="status" aria-live="polite" className="m-0 text-muted-foreground"></p>
        </div>
        <div id="form" className="p-4 sm:p-6"><StoreFiles definition={data.page.definition} /></div>
      </>}
    />
  );
}
