// Load and Save Form JSON Schemas: the example page and its texts. The SurveyJS code is in client.tsx, the server
// code in src/server/routes/creator-load-save.ts (PUT /api/forms/:id; the GET is load-definition-variables-data's).
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import { formMode } from "../../../server/demo/pages.ts";
import CreatorLoadSave from "./client";

export const generateMetadata = () => exampleMetadata("creator-load-save");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { req, data, joinFailed } = await examplePage("creator-load-save", searchParams);
  // "Open saved form" (?form) renders the saved definition with the Form Library
  const preview = formMode(req);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Load form JSON schemas from your backend into Survey Creator and save changes automatically. The backend checks each user&apos;s permission to save, so users without save access can edit locally while the stored schema stays unchanged.</p>}
      tryThis={<>
        <li>As <strong>Alice</strong>, change the form title or a question in the Designer. The status above the editor confirms when the backend has saved your changes.</li>
        <li>Switch <strong>Demo user</strong> to <strong>Bob</strong> and edit the form. You can make changes locally, but the backend rejects attempts to save them.</li>
        <li>Press <strong>Open saved form</strong> to view the saved version in a new tab. Alice&apos;s pending changes are saved first; Bob opens the version already stored on the server.</li>
        <li>Open <strong>Requests</strong> to inspect the loaded schema and save requests. As Alice, you can press <strong>Restore sample</strong> to replace the saved schema with the original example.</li>
      </>}
      userControl={
        <label className="flex items-center gap-2">
          <span className="text-gray-600">Demo user</span>
          <NativeSelect id="demo-user" defaultValue={data.demoUser} className="bg-background">
            <NativeSelectOption value="alice">Alice (can save schemas)</NativeSelectOption>
            <NativeSelectOption value="bob">Bob (cannot save schemas)</NativeSelectOption>
          </NativeSelect>
        </label>
      }
      actions={preview
        ? <a id="back-to-editor" href="?" className="text-sjs-dark underline">Back to editor</a>
        : <>
          <a id="open-saved-form" aria-disabled="true" href="?form" target="_blank" className={cn(button, "gap-1.5 no-underline aria-disabled:opacity-50")}>
            Open saved form
            <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></svg>
          </a>
          <button id="restore-sample" type="button" disabled className={button}>Restore sample</button>
        </>}
      form={<>
        <div className="flex flex-wrap items-center gap-3 border-b p-4 text-sm">
          <p data-show="schema-status" role="status" aria-live="polite" className="m-0 flex-1 text-gray-700">Loading the saved form...</p>
          <button id="retry-load" type="button" hidden className={button}>Retry loading</button>
          <button id="retry-save" type="button" hidden className={button}>Try saving again</button>
        </div>
        {/* ?form renders a form here: it takes the form's padding instead of Creator's height */}
        <div id="creator" hidden inert className={preview ? "p-4 sm:p-6" : "h-[calc(100dvh_-_var(--header-h,3.5rem)_-_var(--tabs-h,3.5rem)_-_var(--demo-above,1rem)_-_1.5rem)] min-h-[640px]"}>
          <CreatorLoadSave />
        </div>
      </>}
    />
  );
}
