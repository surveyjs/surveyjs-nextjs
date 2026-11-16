// Translate with AI: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/ai-translation.ts (POST /api/translate; the form's GET and PUT are creator-load-save's).
import { ExampleLayout } from "@/components/example/example-layout";
import { bannerClass } from "@/components/example/service-banner";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import config from "../../../server/config.ts";
import AiTranslation from "./client";

export const generateMetadata = () => exampleMetadata("ai-translation");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { data, joinFailed } = await examplePage("ai-translation", searchParams);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Translate form text with AI and let authors review the results. Your backend sends titles, choices, and other text to your chosen provider, keeping its API key on the server.</p>}
      banner={!config.ai.apiKey && (
        <p className={bannerClass}>
          <strong>AI translation is unavailable.</strong> Configure <code>AI_API_KEY</code> in <code>.env</code> to enable it, then restart the app.
        </p>
      )}
      tryThis={<>
        <li>In the <strong>Translations</strong> tab, use <strong>Add Language</strong> to add another language. Click <strong>Auto-translate All</strong> beside a language, then again in the dialog to translate missing text.</li>
        <li>Review and edit the generated translations in the dialog, then click <strong>Apply</strong> to add them to the form. The sample already has a French title to demonstrate keeping existing translations.</li>
        <li>Changes are saved automatically after you click <strong>Apply</strong>. Reload the page to confirm the translations were saved.</li>
        <li>Open the <strong>Preview</strong> tab and use its language selector to view the translated form or compare it with the original.</li>
        <li>Open <strong>Requests</strong> to inspect the translation request and schema save.</li>
      </>}
      actions={<>
        <button id="retry-load" type="button" hidden className={button}>Retry loading</button>
        <p id="creator-error" hidden role="alert" className="m-0 basis-full text-sm text-destructive"></p>
      </>}
      form={
        <div id="creator" hidden inert className="h-[calc(100dvh_-_var(--header-h,3.5rem)_-_var(--tabs-h,3.5rem)_-_var(--demo-above,1rem)_-_1.5rem)] min-h-[640px]">
          <AiTranslation />
        </div>
      }
    />
  );
}
