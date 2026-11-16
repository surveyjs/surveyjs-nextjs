// Resume Progress: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/resume-progress.ts (GET, PUT and DELETE /api/progress/:formId; the submission is save-response's).
import { ExampleLayout } from "@/components/example/example-layout";
import { StartOver } from "@/components/example/start-over";
import { buttonVariants } from "@/components/ui/button";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import ResumeProgress from "./client";

export const generateMetadata = () => exampleMetadata("resume-progress");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("resume-progress", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Save answers and form state automatically for each respondent so they can return to the same page and field later. Restore a draft, continue filling out the form, and submit the completed response when ready.</p>}
      tryThis={<>
        <li>Fill in a few fields. Progress saves automatically, and the status above the form confirms each save.</li>
        <li>Move to another page or focus another field, then press <strong>Reload page</strong>. Your answers, page, and focused field are restored.</li>
        <li>Switch <strong>Respondent</strong> between Alice and Bob to try separate drafts for each person. The current draft is saved before switching.</li>
        <li>Open <strong>Requests</strong> to inspect the answers and UI state sent to <code>PUT /api/progress/onboarding</code>. Open <strong>Data</strong> to view the saved draft.</li>
        <li>Press <strong>Finish onboarding</strong> on the last page to submit the completed response and clear its saved draft.</li>
        <li>Press <strong>Start over</strong> to discard the draft and return to an empty first page.</li>
      </>}
      userControl={
        <label className="flex items-center gap-2">
          <span className="text-gray-600">Respondent</span>
          {/* Enabled once the draft is restored: client.tsx saves the draft before the switch reloads the page */}
          <NativeSelect id="demo-user" disabled defaultValue={data.demoUser} className="bg-background">
            <NativeSelectOption value="alice">Alice</NativeSelectOption>
            <NativeSelectOption value="bob">Bob</NativeSelectOption>
          </NativeSelect>
        </label>
      }
      actions={<>
        <button id="reload" type="button" disabled className={cn(buttonVariants({ variant: "outline" }), "h-9 gap-1.5 px-3 font-semibold")}>
          <svg aria-hidden="true" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 4 21 10 15 10" /><path d="M20.5 15a9 9 0 1 1-2.1-9.4L21 10" /></svg>
          Reload page
        </button>
        <StartOver initiallyDisabled />
        <div className="flex w-full items-center gap-2">
          <p data-show="saved" role="status" aria-live="polite" className="text-sm text-gray-700">Loading saved progress...</p>
          <button id="retry-progress" type="button" hidden className={cn(buttonVariants({ variant: "outline", size: "sm" }), "font-semibold")}>Retry</button>
        </div>
      </>}
      form={<div id="form" inert aria-busy="true" className="p-4 sm:p-6"><ResumeProgress /></div>}
    />
  );
}
