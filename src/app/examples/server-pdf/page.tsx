// Generate PDFs: the example page and its texts, with the ten latest claims rendered by the server. The client code
// is in client.tsx, the server code in src/server/routes/server-pdf.ts (GET /api/claims/:id/pdf). Open PDF's tab
// shows ./loading/page.tsx until the PDF arrives.
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import { latestClaims } from "../../../server/demo/pages.ts";
import ServerPdf from "./client";

export const generateMetadata = () => exampleMetadata("server-pdf");

const pdfButton = "h-9 shrink-0 gap-2 px-3 font-semibold whitespace-nowrap disabled:cursor-wait";

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { req, data, joinFailed } = await examplePage("server-pdf", searchParams);
  const claims = latestClaims(req);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Generate PDFs on the server for archives, email attachments, or downloads. Use a form schema and optional saved answers to produce a document without opening a browser.</p>}
      tryThis={<>
        <li>Press <strong>Open PDF</strong> beside a claim to view the filled form in a new tab or <strong>Download PDF</strong> to save a copy.</li>
        <li>The backend generates the PDF from the form schema and saved answers. Open <strong>Requests</strong> to inspect the PDF request.</li>
        <li>Submit a claim in the <a href="/examples/relational-storage" target="_blank" rel="noopener">Use Relational Storage</a> demo, then reload this page to include it in the ten most recent claims.</li>
      </>}
      actions={<p id="pdf-feedback" hidden role="status" aria-live="polite" className="m-0 text-sm text-muted-foreground data-[kind=error]:text-red-700"></p>}
      form={<>
        <ul className="m-0 list-none divide-y p-0">
          {claims.length ? claims.map((claim) => (
            <li key={claim.id} data-claim-row className="px-4 py-4 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-3 lg:grid lg:grid-cols-[minmax(0,1fr)_auto]">
                <details className="min-w-0 flex-1 basis-64 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:grid lg:grid-cols-subgrid lg:[&::details-content]:col-span-2">
                  <summary className="cursor-pointer break-words py-2 font-semibold lg:col-start-1">Claim #{claim.id} · {claim.label}</summary>
                  <pre className="mt-3 max-h-56 overflow-auto rounded bg-muted p-3 text-xs">{claim.json}</pre>
                </details>
                <div className="flex flex-wrap gap-2 lg:col-start-2 lg:row-start-1">
                  <button type="button" data-claim={claim.id} data-action="open" className={cn(buttonVariants(), pdfButton)}>
                    Open PDF
                    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
                  </button>
                  <button type="button" data-claim={claim.id} data-action="download" className={cn(buttonVariants({ variant: "outline" }), pdfButton)}>
                    <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v12m-5-5 5 5 5-5M5 16v4h14v-4" /></svg>
                    Download PDF
                  </button>
                </div>
              </div>
            </li>
          )) : (
            <li className="px-4 py-3 text-sm text-muted-foreground">
              <span className="block">No claims</span>
              <a href="/examples/relational-storage" className="mt-2 inline-block text-sjs-dark underline">Submit a claim</a>
            </li>
          )}
        </ul>
        <ServerPdf />
      </>}
    />
  );
}
