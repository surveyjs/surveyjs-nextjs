// Extract Responses from Documents: the example page and its texts. The page config's definition is the stored
// work-order form. The SurveyJS code is in client.tsx, the server code in src/server/routes/extract-from-paper.ts
// (GET /api/work-orders/blank.pdf, POST /api/work-orders/extract; the POST /api/responses is save-response's).
import { ExampleLayout } from "@/components/example/example-layout";
import { bannerClass } from "@/components/example/service-banner";
import { StartOver } from "@/components/example/start-over";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import config from "../../../server/config.ts";
import ExtractFromPaper from "./client";

export const generateMetadata = () => exampleMetadata("extract-from-paper");

const button = "h-9 gap-1.5 px-3 font-semibold";

/** The extraction provider, chosen as src/server/integration/ai-provider.ts chooses it: SURVEYJS_AI_PROVIDER, else the one whose key is set */
function extractionProvider() {
  const { provider, openaiApiKey, anthropicApiKey } = config.extraction;
  return provider?.toLowerCase() ?? (openaiApiKey ? "openai" : anthropicApiKey ? "anthropic" : undefined);
}

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("extract-from-paper", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Extract answers from completed work orders using a predefined form schema. Review the extracted answers alongside the source document, correct any mistakes, and save the response.</p>}
      banner={extractionProvider() === undefined && (
        <p className={bannerClass}>
          <strong>Document extraction is unavailable.</strong> Set <code>SURVEYJS_AI_PROVIDER</code> (<code>openai</code>, <code>anthropic</code> or <code>ollama</code>) in <code>settings.env</code>
          and its key (<code>OPENAI_API_KEY</code> or <code>ANTHROPIC_API_KEY</code>) in <code>.env</code>, or <code>SURVEYJS_OLLAMA_BASE_URL</code> in <code>settings.env</code> for Ollama, then restart the app.
        </p>
      )}
      tryThis={<>
        <li>Press <strong>Use the sample scan</strong> to extract answers from a completed work order.</li>
        <li>To try your own work order, press <strong>Download blank work order</strong> and complete the PDF, or print it and fill it in by hand. Choose <strong>Upload completed work order</strong> to upload the PDF or a scan or photo. PDF, PNG, JPEG, WebP, and GIF files up to 5 MB are supported.</li>
        <li>Compare the answers with the document preview and correct any mistakes. Low-confidence answers are marked <strong>Review this answer</strong>; blank fields remain unanswered.</li>
        <li>Select <strong>I have reviewed these answers</strong>, then press <strong>Save reviewed response</strong>. Extraction creates a draft; saving sends the reviewed answers to your backend and confirms the response ID.</li>
        <li>If extraction is unavailable, enter the answers directly in the form. Press <strong>Start over</strong> to clear the draft or cancel extraction.</li>
      </>}
      about={<p>OpenAI and Anthropic configurations send the document to that provider for extraction. Ollama processes it on the configured Ollama server.</p>}
      actions={<>
        <button id="sample-scan" type="button" className={cn(buttonVariants(), button)}>Use the sample scan</button>
        <button id="download-work-order" type="button" className={cn(buttonVariants({ variant: "outline" }), button, "disabled:cursor-wait")}>Download blank work order</button>
        <label className={cn(buttonVariants({ variant: "outline" }), button, "cursor-pointer has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 has-[:disabled]:cursor-wait has-[:disabled]:opacity-50")}>
          Upload completed work order<input id="own-scan" type="file" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" className="sr-only" />
        </label>
        <StartOver />
        <span data-show="extract-status" hidden role="status" aria-live="polite" className="text-gray-700"></span>
        <p id="work-order-download-error" hidden role="alert" className="m-0 basis-full text-red-700"></p>
      </>}
      form={<>
        <div id="extract-details" hidden className="border-b p-4 sm:p-6">
          <dl className="m-0 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-muted-foreground">Source file</dt><dd data-show="extract-source" className="m-0 mt-1 break-words font-semibold"></dd></div>
            <div><dt className="text-muted-foreground">Document ID</dt><dd data-show="extract-id" className="m-0 mt-1 break-words font-semibold"></dd></div>
            <div><dt className="text-muted-foreground">Answers to review</dt><dd data-show="extract-review-count" className="m-0 mt-1 font-semibold"></dd></div>
          </dl>
          <p className="m-0 mt-3 text-sm text-muted-foreground">Review the draft before submitting.</p>
        </div>
        <div id="review-layout" data-preview="false" className="grid min-w-0 data-[preview=true]:xl:grid-cols-2">
          <div id="scan-preview" hidden className="min-w-0 border-b p-4 xl:border-b-0 xl:border-r">
            <p className="m-0 mb-3 text-sm font-semibold">Source document · <a id="open-document" target="_blank" rel="noopener" className="text-sjs-dark underline">Open document</a></p>
            {/* The scan is a blob: URL set in the browser, which next/image can't optimise */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img id="scan-image" alt="Uploaded work order" hidden className="h-auto w-full rounded border" />
            <iframe id="scan-pdf" title="Uploaded work order PDF" hidden className="h-[640px] w-full rounded border"></iframe>
          </div>
          <div id="form" className="min-w-0 p-4 sm:p-6">
            <ExtractFromPaper definition={data.page.definition} />
          </div>
        </div>
      </>}
    />
  );
}
