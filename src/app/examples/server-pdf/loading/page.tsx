// Generate PDFs: the page Open PDF opens in a new tab while the server generates the document. The example's client
// code navigates the tab to the PDF once it arrives. A standalone page: no example layout, no client code.
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { pageRequest } from "@/lib/page-request";
import { siteData } from "../../../../server/demo/pages.ts";

export async function generateMetadata(): Promise<Metadata> {
  const site = siteData(await pageRequest("/examples/server-pdf/loading"));
  return { title: "Generating PDF · SurveyJS", alternates: { canonical: site.canonical } };
}

export default function PdfLoading() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <main className="box-border flex min-h-screen items-center justify-center p-6">
        <section role="status" aria-live="polite" className="box-border w-full max-w-sm rounded-xl bg-card p-8 text-center text-card-foreground shadow-sm ring-1 ring-foreground/10">
          <Badge className="h-auto rounded px-2 py-1 text-base font-bold">SurveyJS</Badge>
          <svg aria-hidden="true" className="mx-auto mt-8 block size-10 animate-spin text-sjs-dark motion-reduce:animate-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle className="opacity-20" cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 9 9" strokeLinecap="round" /></svg>
          <h1 className="mt-5 text-xl font-semibold">Generating the PDF...</h1>
          <p className="mb-0 mt-3 text-sm leading-6 text-muted-foreground">Your document will open here when it&apos;s ready.</p>
        </section>
      </main>
    </div>
  );
}
