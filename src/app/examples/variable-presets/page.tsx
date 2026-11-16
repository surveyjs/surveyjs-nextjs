// Variable Presets: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/variable-presets.ts (GET and PUT /api/variable-presets/:formId).
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import VariablePresets from "./client";

export const generateMetadata = () => exampleMetadata("variable-presets");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("variable-presets", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Test conditional logic with saved sets of sample variables in the Preview tab. Switch between scenarios, such as basic and premium subscription plans, to check which questions appear without changing the form schema.</p>}
      tryThis={<>
        <li>In <strong>Preview</strong>, switch from <strong>Basic</strong> to <strong>Premium</strong> using the variable preset selector at the bottom. The <code>customerTier</code> variable controls whether the <strong>Call me back within one hour</strong> from field appears.</li>
        <li>Click <strong>Manage presets</strong> and edit a preset&apos;s customer plan or add a scenario. Preset changes are saved automatically, through the same <code>can(currentUser(req), &quot;edit-forms&quot;)</code> check as <strong>Load and Save Form JSON Schemas</strong>.</li>
        <li>Reload the page to check that the edited presets were saved. Open <strong>Requests</strong> to inspect the requests that load and save presets.</li>
      </>}
      actions={<>
        <button id="retry-load" type="button" hidden className={button}>Retry loading</button>
        <button id="retry-presets" type="button" hidden className={button}>Try saving again</button>
        <p id="creator-error" hidden role="alert" className="m-0 basis-full text-sm text-destructive"></p>
      </>}
      form={
        <div id="creator" hidden inert className="h-[calc(100dvh_-_var(--header-h,3.5rem)_-_var(--tabs-h,3.5rem)_-_var(--demo-above,1rem)_-_1.5rem)] min-h-[640px]">
          <VariablePresets />
        </div>
      }
    />
  );
}
