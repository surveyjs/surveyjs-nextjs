// Upload Files in Creator: the example page and its texts. The SurveyJS code is in client.tsx, the server code in
// src/server/routes/store-files.ts (POST /api/files, GET /api/files/:id) and src/server/routes/creator-load-save.ts
// (PUT /api/forms/:id).
import { ExampleLayout } from "@/components/example/example-layout";
import { buttonVariants } from "@/components/ui/button";
import { exampleMetadata, examplePage, type SearchParams } from "@/lib/example-page";
import { cn } from "@/lib/utils";
import { formMode } from "../../../server/demo/pages.ts";
import CreatorUploads from "./client";

export const generateMetadata = () => exampleMetadata("creator-uploads");

const button = cn(buttonVariants({ variant: "outline" }), "h-9 px-3 font-semibold");

export default async function Page({ searchParams }: { searchParams: SearchParams }) {
  const { req, data, joinFailed } = await examplePage("creator-uploads", searchParams);
  // "Open saved form" (?form) renders the saved definition with the Form Library
  const preview = formMode(req);
  return (
    <ExampleLayout
      data={data}
      joinFailed={joinFailed}
      description={<p>Upload logos and images from Survey Creator to your server. Store the files separately and save only their URLs in the form&apos;s JSON schema to keep it small.</p>}
      tryThis={<>
        <li>In the Designer, click <strong>Add logo</strong> above the form title and choose an image. PNG, JPEG, WebP, and GIF files up to 5 MB are supported.</li>
        <li>Select the image above the <strong>Product</strong> question and upload a replacement using its image controls.</li>
        <li>Open <strong>Data</strong> to see the image URLs saved in the JSON schema as <code>logo</code> and <code>imageLink</code>. <strong>Requests</strong> shows the upload and save requests.</li>
        <li>Press <strong>Open saved form</strong> to view the form with its saved images.</li>
        <li>Press <strong>Restore sample</strong> to restore and save the original form schema.</li>
      </>}
      actions={<>
        {preview
          ? <a id="back-to-editor" href="?" className="text-sjs-dark underline">Back to editor</a>
          : <>
            <a id="open-saved-form" href="?form" target="_blank" aria-disabled="true" className={cn(button, "no-underline aria-disabled:opacity-50")}>Open saved form</a>
            <button id="restore-sample" type="button" disabled className={button}>Restore sample</button>
          </>}
        <button id="retry-load" type="button" hidden className={button}>Retry loading</button>
        <button id="retry-save" type="button" hidden className={button}>Try saving again</button>
        <p id="creator-error" hidden role="alert" className="m-0 basis-full text-sm text-destructive"></p>
      </>}
      form={
        // ?form renders a form here: it takes the form's padding instead of Creator's height
        <div id="creator" hidden inert className={preview ? "p-4 sm:p-6" : "h-[calc(100dvh_-_var(--header-h,3.5rem)_-_var(--tabs-h,3.5rem)_-_var(--demo-above,1rem)_-_1.5rem)] min-h-[640px]"}>
          <CreatorUploads />
        </div>
      }
    />
  );
}
