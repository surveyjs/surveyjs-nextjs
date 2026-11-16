// Edit Forms Together: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/relay/edit-relay.ts and edit-room.ts (WS /ws/forms/:formId, run by server.ts).
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { scriptJson } from "@/lib/script-json";
import { cn } from "@/lib/utils";
import { teamForms } from "../../../server/demo/pages.ts";
import EditTogether from "./client";

export const generateMetadata = () => exampleMetadata("edit-together");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { req, data, joinFailed } = await examplePage("edit-together", searchParams);
  // The collaborative forms, and the one in ?form (the proxy answered 400 "Invalid form ID" for an invalid one)
  const { forms, formId, known } = teamForms(req);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      inlineScript={`window.SURVEYJS_PAGE.formId = ${scriptJson(formId)};`}
      description={<p>Let multiple authors work on the same form in real time. Participants see each other&apos;s edits and cursors, with elements locked during editing to prevent conflicting changes.</p>}
      tryThis={<>
        <li>Select a form to edit, or choose <strong>New blank form</strong> to create one. Each form has its own collaboration session.</li>
        <li>Press <strong>Open a second window</strong>. Change a question title in one window and select a different question in the other to see shared edits and each author&apos;s selection.</li>
        <li>Open a third window to see the current form reconstructed from the saved schema and the session&apos;s edit log.</li>
        <li>Open the <strong>Collaboration</strong> menu and choose <strong>Show Version History</strong> to inspect the session&apos;s changes.</li>
        <li>Press <strong>Save Survey</strong> in either window to store the schema before switching forms. Shared edits are temporary until saved; after all windows close and the room expires, a new session starts from the saved version.</li>
      </>}
      about={data.demoMode ? <p>The invite link carries your sandbox ID: whoever opens it works in your copy of the demo data, in the same rooms.</p> : undefined}
      actions={<>
        <label className="flex items-center gap-2"><span className="text-gray-600">Form</span>
          <NativeSelect id="shared-form" defaultValue={formId} className="bg-background">
            {forms.map((form) => <NativeSelectOption key={form.id} value={form.id}>{form.label}</NativeSelectOption>)}
            <NativeSelectOption value="">New blank form</NativeSelectOption>
            {!known && <NativeSelectOption value={formId}>New form</NativeSelectOption>}
          </NativeSelect>
        </label>
        {/* The reference binds the picker as soon as the page is parsed: this works before hydration and before
            Creator loads. A blank form gets a new ID. */}
        <script dangerouslySetInnerHTML={{ __html: 'document.getElementById("shared-form").addEventListener("change", (e) => { const url = new URL(location.href); url.searchParams.set("form", e.target.value || `team-${crypto.randomUUID()}`); location.assign(url); });' }} />
        <a data-invite-link target="_blank" href="#" className={cn(buttonVariants(), "h-9 gap-1.5 px-3 font-semibold no-underline")}>
          Open a second window
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
        </a>
        <button id="reconnect" type="button" hidden className={button}>Reconnect</button>
        <button id="retry-save" type="button" hidden className={button}>Try saving again</button>
        <button id="download-local" type="button" hidden className={button}>Download local copy</button>
        <p id="creator-error" hidden role="alert" className="m-0 basis-full text-sm text-destructive"></p>
      </>}
      form={
        <div id="creator" hidden inert className="h-[calc(100dvh_-_var(--header-h,3.5rem)_-_var(--tabs-h,3.5rem)_-_var(--demo-above,1rem)_-_1.5rem)] min-h-[640px]">
          <EditTogether />
        </div>
      }
    />
  );
}
