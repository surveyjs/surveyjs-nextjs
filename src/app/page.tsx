// Demo only: the catalog, rendered from surveyjs-integration.json, in the SurveyJS site's design
// (Figma General, page "Backend Integration examples page + demo"; desktop 1400, tablet 900, mobile 375), built from
// shadcn/ui's Badge and Button, and the card tokens (Card renders a div; the cards stay <article>).
import type { Metadata } from "next";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { SiteHeader } from "@/components/example/site-header";
import { pageRequest } from "@/lib/page-request";
import { cn } from "@/lib/utils";
import { readManifest } from "../server/demo/manifest.ts";
import { siteData, TITLE } from "../server/demo/pages.ts";

const SECTIONS: [string, string][] = [
  ["Run Forms", "SurveyJS Form Library displays forms in the browser. Start with a Next.js endpoint that saves submitted answers, then add the workflows your application needs."],
  ["Analyze Results with Dashboard", "SurveyJS Dashboard lets users analyze responses with interactive charts in the browser. Your Next.js backend supplies the saved responses."],
  ["Edit Forms in Survey Creator", "Survey Creator lets users build and edit forms in the browser. Your Next.js backend loads and saves form JSON schemas and checks that users have permission to make changes."],
  ["Run Server-Side Workflows", "Run SurveyJS workflows inside your Next.js application with the SurveyJS libraries: validate responses, check form schemas, generate PDFs, and extract answers from documents."],
];
/** Hero cards, by the section they link to: the label and the icon. */
const HERO_LINKS: [string, string, string][] = [
  ["Run Forms", "Run Forms", "preview"],
  ["Analyze Results with Dashboard", "Analyze Results with Dashboard", "graph"],
  ["Edit Forms in Survey Creator", "Edit Forms in Survey Creator", "embed-creator"],
  ["Run Server-Side Workflows", "Run Server-Side Workflows", "server"],
];
/** The footer's logos, by file (shared/ui/images/stack-*.svg) */
const STACK_LOGOS = ["nextjs", "nodejs", "aspnet", "php", "wordpress", "model", "postgresql", "mongodb", "python"];

const slug = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const solidUnderline = "underline [text-decoration-skip-ink:none] [text-underline-position:from-font]";
/** The content is sjs-content wide, the padding outside it: Preflight makes boxes border-box, the other platforms don't load it */
const column = "mx-auto box-content max-w-sjs-content px-4 md:px-6";
/** The licence badges: the manifest's licence reads "MIT", "Commercial" or "Commercial client", maybe ", needs an AI provider" */
const cardBadge = "h-auto rounded-lg px-3 py-1 text-base/6 font-semibold";
const LICENCE_BADGE: Record<string, string> = { MIT: "bg-sjs-10 text-sjs", Commercial: "bg-sjs-yellow-10 text-sjs-yellow" };
const cardButton = "h-auto px-6 py-3 text-base/6 font-semibold";
/** The footer's large buttons from tablets up */
const footerButton = "h-auto rounded-lg px-6 py-3 text-base/6 font-semibold md:px-12 md:py-5 md:text-2xl/6";

export async function generateMetadata(): Promise<Metadata> {
  const site = siteData(await pageRequest("/"));
  return { title: `${TITLE} · SurveyJS`, alternates: { canonical: site.canonical } };
}

export default async function Catalog() {
  const site = siteData(await pageRequest("/"));
  const manifest = readManifest();
  const groups = Object.groupBy(manifest.steps, (step) => step.section);

  return (
    <div className="min-h-screen bg-white text-sjs-fg">
      <SiteHeader header={site.header} />

      <main>
        <div className={`${column} pt-12 pb-12 text-center md:pt-16 xl:pt-24`}>
          <h1 className="mx-auto max-w-[880px] text-sjs-title-lg font-bold text-balance md:text-sjs-title-2xl">Build a Next.js Backend for&nbsp;Your SurveyJS Forms</h1>
          <p className="mt-6 mb-0 text-sjs-para-lg font-medium text-pretty text-sjs-fg-50">
            Learn how to connect SurveyJS components to a Next.js backend using route handlers.
            These working examples accompany the <a className={`${solidUnderline} text-inherit hover:text-sjs-fg`} href={site.docs} target="_blank">Next.js integration guide</a> and show the code behind each request.
            SurveyJS does not include a backend, so use these examples as a starting point for your application.
          </p>
        </div>

        {/* Phones: one column, tablets: two, desktops: one row */}
        <nav className={`${column} mt-2.5 grid gap-3 md:mt-0 md:grid-cols-2 xl:grid-cols-4`} aria-label="Sections">
          {HERO_LINKS.filter(([title]) => groups[title]).map(([title, label, icon]) => (
            <a key={title} className="flex flex-col items-start gap-6 rounded-3xl border border-sjs-line bg-white p-6 text-sjs-para-md text-sjs-fg no-underline hover:bg-sjs-back-gray" href={`#${slug(title)}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <span className="flex rounded-lg bg-sjs-10 p-2"><img src={`/shared/ui/images/icon-${icon}.svg`} width="24" height="24" alt="" /></span>
              <span className={solidUnderline}>{label}</span>
            </a>
          ))}
        </nav>

        <div className={`${column} pt-12 pb-12 md:pb-16 xl:pb-24`}>
          <a className="flex items-center gap-3 rounded-xl border border-sjs-line bg-white p-3 text-sjs-title-sm font-bold text-sjs-fg no-underline hover:bg-sjs-back-gray md:rounded-3xl md:py-6 md:pr-5 md:pl-6 md:text-sjs-para-lg" href={site.github} target="_blank">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shared/ui/images/icon-github.svg" width="40" height="40" alt="" />
            <span className="flex-1">View on GitHub</span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/shared/ui/images/icon-chevron.svg" width="40" height="40" alt="" />
          </a>
        </div>

        {SECTIONS.filter(([title]) => groups[title]).map(([title, intro], index) => (
          <section key={title} id={slug(title)} className={cn("border-t border-sjs-line pb-12 md:pb-16 xl:pb-24", index % 2 === 0 && "bg-sjs-back-gray")}>
            <div className={`${column} pt-16 pb-12 xl:pt-24`}>
              <h2 className="text-sjs-title-lg font-bold md:text-sjs-title-xl">{title}</h2>
              <p className="mt-3 mb-0 text-sjs-para-lg font-medium text-sjs-fg-50">{intro}</p>
            </div>
            <div className={`${column} grid gap-3 md:grid-cols-2`}>
              {groups[title]!.map((step) => {
                const licence = step.licence.startsWith("MIT") ? "MIT" : "Commercial";
                return (
                  // A card alone in its row takes the full width. Phones: stacked, full-width buttons
                  <article key={step.slug} className="flex flex-col gap-10 rounded-3xl bg-card p-4 text-card-foreground ring-1 ring-sjs-line md:p-6 md:odd:last:col-span-2">
                    <div className="flex flex-1 flex-col gap-6 p-2 md:p-0">
                      <div className="flex flex-wrap gap-3">
                        <Badge className={cn(cardBadge, LICENCE_BADGE[licence])}>{licence}</Badge>
                        {step.licence.includes("needs an AI provider") && <Badge className={cn(cardBadge, "bg-sjs-violet-10 text-sjs-violet")}>AI Provider Required</Badge>}
                      </div>
                      <div className="flex flex-col gap-3">
                        <h3 className="text-sjs-para-lg font-semibold">{step.title}</h3>
                        <p className="m-0 text-sjs-para-md text-sjs-fg-75"><strong>Use when: </strong>{step.need}</p>
                      </div>
                    </div>
                    <p className="m-0 flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
                      <a className={cn(buttonVariants(), cardButton, "bg-sjs-fg text-white hover:bg-gray-700")} href={step.page}>Run Example</a>
                      <a className={cn(buttonVariants({ variant: "outline" }), cardButton, "text-sjs-fg")} href={`${site.github}/blob/${manifest.branch}/${step.files.server ?? step.files.client}`} target="_blank">View Source ↗&#xFE0E;</a>
                      <a className={cn(buttonVariants({ variant: "outline" }), cardButton, "text-sjs-fg")} href={`${site.docs}#${step.anchor}`} target="_blank">Read Guide ↗&#xFE0E;</a>
                    </p>
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        {/* Phones and tablets: stacked, full-width buttons. Desktops: one row */}
        <div className="flex flex-col items-center gap-12 border-t border-sjs-line px-4 pt-16 pb-24 md:px-6 md:pt-24 md:pb-[120px] xl:pb-40">
          <div className="relative w-full max-w-sjs-content overflow-hidden py-4" aria-hidden="true">
            <div className="flex w-max animate-sjs-marquee gap-6 pr-6 motion-reduce:animate-none md:gap-12 md:pr-12">
              {[...STACK_LOGOS, ...STACK_LOGOS].map((logo, i) => (
                // Figma's cell: the ASP.NET art is shorter than it, the Python art smaller
                <span key={i} className="flex size-16 shrink-0 items-center justify-center md:size-20">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/shared/ui/images/stack-${logo}.svg`} className={cn("h-auto", logo === "python" ? "w-[91.7%]" : "w-full")} alt="" />
                </span>
              ))}
            </div>
            <div className="absolute inset-y-0 left-0 w-16 bg-linear-to-r from-white to-transparent md:w-20"></div>
            <div className="absolute inset-y-0 right-0 w-16 bg-linear-to-l from-white to-transparent md:w-20"></div>
          </div>
          <div className="flex w-full flex-col items-center gap-12 md:gap-16">
            <p className="m-0 w-full max-w-sjs-content text-center text-sjs-para-lg font-medium">SurveyJS works with any backend, so you can build a complete survey management system using your preferred technologies. Let users create, edit, and run surveys, collect responses, and analyze results with interactive charts.</p>
            <div className="flex w-full max-w-sjs-content flex-col gap-3 xl:flex-row xl:justify-center xl:gap-8">
              <a className={cn(buttonVariants(), footerButton, "hover:bg-sjs-dim")} href="https://surveyjs.io/backend-integration/examples" target="_blank">More Backend Examples</a>
              <a className={cn(buttonVariants({ variant: "secondary" }), footerButton, "bg-sjs-15 text-sjs-fg hover:bg-sjs-15-dim")} href="https://surveyjs.io/use-cases" target="_blank">SurveyJS Use Cases</a>
            </div>
            {/* Which checkout answered: from git at start, or SURVEYJS_BUILD at deploy (README: Run a branch or a PR) */}
            {site.build && <p className="-mt-8 mb-0 text-xs text-gray-400 md:-mt-12">{`Running ${site.build}`}</p>}
          </div>
        </div>
      </main>
    </div>
  );
}
