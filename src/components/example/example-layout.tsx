// Demo only: the frame around every example page (shared/ui/page-tabs.js). A sticky header, then two columns:
// a side panel with Description (what to try), Requests and Data (what the server got and kept), and the main
// column with Demo (the action row and the component) and Code (the code that ran). From 768px the panel is docked
// on the left; narrower, it opens as a full-screen sheet. The explanation is in the docs; the integration code is
// in the example's files.
//
// A Server Component: React renders it once and never again, so shared/ui/page-tabs.js and src/demo/host.ts can own
// the tabs, the panel, the counters and the logs from the DOM, as on every platform. The tabs and the sheet are plain
// elements with shadcn's classes, not shadcn's Tabs and Sheet: those keep their own state, which page-tabs.js owns here.
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { cn } from "@/lib/utils";
import { scriptJson } from "@/lib/script-json";
import type { ExampleData } from "../../server/demo/pages.ts";
import { ExampleScripts } from "./example-scripts";
import { Template } from "./template";

/** The tab buttons of both columns: shadcn's line tabs, as plain buttons for page-tabs.js */
const tabClass = "relative flex h-11 shrink-0 cursor-pointer items-center gap-2 whitespace-nowrap border-0 bg-transparent px-3.5 text-[15px] font-semibold text-muted-foreground transition-colors [font-family:inherit] after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-transparent hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-selected:text-foreground aria-selected:after:bg-primary";
const PANEL_TABS: [string, string][] = [["description", "Description"], ["requests", "Requests"], ["stored", "Data"]];
const MAIN_TABS: [string, string][] = [["demo", "Demo"], ["code", "Code"]];

export type ExampleLayoutProps = {
  data: ExampleData;
  /** survey (default), creator or dashboard: the SurveyJS styles come with the page's client component */
  description: ReactNode;
  tryThis: ReactNode;
  about?: ReactNode;
  banner?: ReactNode;
  /** The page's own controls in the action row (the action row also shows when the page offers a user switch) */
  actions?: ReactNode;
  /** Replaces the Demo user switch (load-definition-variables-data's Customer, resume-progress's Respondent) */
  userControl?: ReactNode;
  /** Replaces the default <div id="form">: Creator, the Dashboard and server-pdf's list fill the card */
  form?: ReactNode;
  /** The client component: it renders into #form when the page keeps the default form slot */
  children?: ReactNode;
  readouts?: ReactNode;
  /** The example's own <template>s (relational-storage's mapping, lint-definition's findings) */
  templates?: ReactNode;
  joinFailed?: boolean;
  /** Extra inline config next to window.SURVEYJS_PAGE (Option A's window.FORM_DEFINITION and FORM_VARIABLES) */
  inlineScript?: string;
};

export function ExampleLayout({ data, description, tryThis, about, banner, actions, userControl, form, children, readouts, templates, joinFailed, inlineScript }: ExampleLayoutProps) {
  const { step, page, users, labels } = data;
  const showActions = users.length > 1 || actions !== undefined;
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <script dangerouslySetInnerHTML={{ __html: `window.SURVEYJS_PAGE = ${scriptJson(page)};${inlineScript ?? ""}` }} />
      <header id="page-header" className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3 px-4 py-2.5 md:px-5 lg:px-6">
          <a href="/" className="flex shrink-0 items-center gap-2 font-semibold text-gray-900 no-underline">
            <Badge className="h-auto rounded px-1.5 py-0.5 text-sm font-bold">SurveyJS</Badge>
            <span className="max-lg:hidden">{data.title}</span>
          </a>
          <span aria-hidden="true" className="text-gray-300 max-lg:hidden">/</span>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-2">
            <h1 className="min-w-0 max-w-full truncate text-base font-semibold text-gray-900">{step.title}</h1>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn("h-auto rounded-lg px-2 py-1 text-xs font-semibold", data.commercial ? "bg-sjs-yellow-10 text-sjs-yellow" : "bg-sjs-10 text-sjs")}>{data.commercial ? "Commercial" : "MIT"}</Badge>
              {data.needsAi && <Badge className="h-auto rounded-lg bg-sjs-violet-10 px-2 py-1 text-xs font-semibold text-sjs-violet">AI Provider Required</Badge>}
            </div>
          </div>
        </div>

        {joinFailed && (
          <div className="border-t border-amber-200 bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-900 sm:px-6">
            <strong>That invite link has expired, so you have a fresh copy of the demo data.</strong>
          </div>
        )}
      </header>

      <div className="flex">
        {/* THE SIDE PANEL: docked from 768px (open by default), a full-screen sheet below (closed by default).
            Its three tab panels scroll inside it. */}
        <aside id="side-panel" aria-label="Description, requests and stored data"
               className="box-border flex flex-col bg-background max-md:fixed max-md:inset-0 max-md:z-50 max-md:hidden max-md:data-[sheet]:flex max-md:data-[sheet]:animate-in max-md:data-[sheet]:fade-in-0 md:sticky md:top-[var(--header-h)] md:h-[calc(100dvh-var(--header-h))] md:w-[320px] md:shrink-0 md:self-start md:border-r lg:w-[400px]">
          <div className="flex h-10 shrink-0 items-center justify-end px-2 md:hidden">
            <button type="button" id="panel-close" aria-label="Close the panel" className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "text-gray-600")}>
              <svg aria-hidden="true" className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="6" y1="6" x2="18" y2="18" /><line x1="18" y1="6" x2="6" y2="18" /></svg>
            </button>
          </div>

          {/* The tabs never wrap: the row scrolls, and page-tabs.js sets data-fade-start / data-fade-end where tabs are cut
              and shows the scrollbar's thumb */}
          <div className="relative shrink-0 border-b">
            <div id="panel-tabs" role="tablist" aria-label="Description, requests and stored data"
                 className="flex scroll-px-4 items-stretch gap-3 overflow-x-auto px-4 py-2 [scrollbar-width:none] md:px-5 lg:px-6 data-[fade-start]:[mask-image:linear-gradient(90deg,transparent,#000_16px)] data-[fade-end]:[mask-image:linear-gradient(270deg,transparent,#000_16px)] data-[fade-start]:data-[fade-end]:[mask-image:linear-gradient(90deg,transparent,#000_16px,#000_calc(100%-16px),transparent)]">
              {PANEL_TABS.map(([key, label], i) => (
                <button key={key} type="button" role="tab" id={`panel-tab-${key}`} data-panel-tab={key} aria-controls={`panel-${key}`} aria-selected={i === 0 ? "true" : "false"} tabIndex={i === 0 ? 0 : -1} className={tabClass}>
                  {label}
                  {key === "requests" && <span id="requests-count" hidden data-kind="ok" className="box-border inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-sjs-15 px-[5px] py-px text-sm/4 font-semibold whitespace-nowrap text-sjs tabular-nums data-[kind=error]:bg-sjs-red-15 data-[kind=error]:text-sjs-red"></span>}
                  {key === "stored" && <span id="stored-dot" hidden className="size-1.5 rounded-full bg-primary"></span>}
                </button>
              ))}
            </div>
            {/* A 4px round thumb 4px in from the sides, with no track; page-tabs.js sizes and moves it */}
            <div id="panel-tabs-thumb" aria-hidden="true" hidden
                 className="absolute bottom-0 left-1 h-2 cursor-pointer touch-none before:absolute before:inset-x-0 before:top-0.5 before:h-1 before:rounded-full before:bg-sjs-scrollbar before:content-['']"></div>
          </div>

          {/* src/demo/host.ts fills #notes, #requests and #stored by id and by the templates below, also while hidden */}
          <div id="hood" className="flex min-h-0 flex-1 flex-col">
            {/* DESCRIPTION: the reading matter */}
            <div id="panel-description" role="tabpanel" aria-labelledby="panel-tab-description" className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-12 pt-8 md:px-5 lg:px-6">
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-gray-900 sm:text-3xl">{step.title}</h2>
                <div className="space-y-2">{description}</div>
                <p><a className="text-sjs-dark underline" href={data.stepDocs} target="_blank">Documentation</a></p>
              </div>

              <Card className="gap-3 p-5">
                <h3 className="text-sm font-bold tracking-wide text-gray-600 uppercase">Try this</h3>
                <ol id="try" className="m-0 list-decimal space-y-2 pl-5 text-[15px] [&_a]:text-sjs-dark [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:text-[13px]">
                  {tryThis}
                </ol>
              </Card>

              {about !== undefined && <div className="space-y-2 text-sm text-gray-600">{about}</div>}

              {data.commercial && (
                <p className="text-sm text-gray-600">SurveyJS commercial products require a developer license for production use. See <a className="text-sjs-dark underline" href="https://surveyjs.io/licensing" target="_blank" rel="noopener">SurveyJS Licensing</a> for details.</p>
              )}

              {/* Which checkout answered: from git at start, or SURVEYJS_BUILD at deploy (README: Run a branch or a PR) */}
              {data.build && <p className="text-xs text-gray-400">{`Running ${data.build}`}</p>}
            </div>

            {/* REQUESTS: read-outs and notes (bounded, the newest note on top), then the log, which scrolls */}
            <section id="panel-requests" role="tabpanel" aria-labelledby="panel-tab-requests" hidden className="flex min-h-0 flex-1 flex-col text-sm">
              {/* Hidden until the first note: page-tabs.js shows it then (lint-definition's findings come with one) */}
              <div id="readouts" hidden className="max-h-[10rem] shrink-0 space-y-1.5 overflow-y-auto border-b p-3 max-sm:max-h-[8rem]">
                {readouts}
                <ul id="notes" hidden className="m-0 list-none space-y-1 p-0 text-sm"></ul>
              </div>
              <div className="flex shrink-0 items-center justify-end gap-3 border-b border-gray-100 px-4 py-1.5 text-xs text-gray-500">
                <label className="flex items-center gap-1"><input id="show-demo-requests" type="checkbox" className="accent-primary" />Show demo requests</label>
                <button id="clear-requests" type="button" className={cn(buttonVariants({ variant: "link", size: "xs" }), "h-auto px-0 text-xs text-gray-500 underline")}>Clear</button>
              </div>
              <p id="requests-empty" className="px-4 py-3 text-sm text-gray-400">No requests</p>
              <ol id="requests" className="m-0 min-h-0 flex-1 list-none divide-y divide-gray-100 overflow-y-auto p-0 font-mono text-xs"></ol>
            </section>

            {/* DATA: what the server stored, which scrolls */}
            <section id="panel-stored" role="tabpanel" aria-labelledby="panel-tab-stored" hidden className="flex min-h-0 flex-1 flex-col text-sm">
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-gray-100 px-4 py-1.5 text-xs text-gray-500">
                <span>What the server stored</span>
                <span id="stored-updated" className="text-gray-400"></span>
              </div>
              <div id="stored" className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4"></div>
            </section>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          {/* The panel's toggle, then Demo and Code. Sticky under the header; the page scrolls under it. */}
          <div id="main-tabs" className="sticky top-[var(--header-h)] z-30 flex items-center gap-6 border-b bg-background/95 px-4 py-2 backdrop-blur lg:px-6">
            <button type="button" id="panel-toggle" aria-controls="side-panel" aria-expanded="true" aria-label="Hide the panel"
                    className={cn(buttonVariants({ variant: "outline", size: "icon-lg" }), "relative size-[42px] rounded-lg p-2")}>
              <svg aria-hidden="true" className="size-6" width="24" height="24" viewBox="0 0 24 24" fill="none"><path fillRule="evenodd" clipRule="evenodd" fill="#505050" d="M19 2.25C20.5188 2.25 21.75 3.48122 21.75 5V19C21.75 20.5188 20.5188 21.75 19 21.75H5C3.48122 21.75 2.25 20.5188 2.25 19V5C2.25 3.48122 3.48122 2.25 5 2.25H19ZM9.75 20.25H19C19.6904 20.25 20.25 19.6904 20.25 19V5C20.25 4.30964 19.6904 3.75 19 3.75H9.75V20.25ZM5 3.75C4.30964 3.75 3.75 4.30964 3.75 5V19C3.75 19.6904 4.30964 20.25 5 20.25H8.25V3.75H5Z" /></svg>
              {/* At 36,0 of the button's outer box: the offsets are from inside its 1px border */}
              <span id="panel-dot" hidden className="absolute -top-px left-[35px] size-1.5 rounded-full bg-primary ring-2 ring-background"></span>
            </button>
            <div id="page-tabs" role="tablist" aria-label="Step views" className="flex min-w-0 items-stretch gap-3">
              {MAIN_TABS.map(([key, label], i) => (
                <button key={key} type="button" role="tab" id={`tab-${key}`} data-tab={key} aria-controls={`panel-${key}`} aria-selected={i === 0 ? "true" : "false"} tabIndex={i === 0 ? 0 : -1} className={tabClass}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* DEMO: setup warnings, the action row and the component, the column's width minus the gutter */}
          <div id="panel-demo" role="tabpanel" aria-labelledby="tab-demo" className="space-y-3 p-4 lg:p-6">
            {banner}

            {showActions && (
              <div id="actions" className="flex flex-wrap items-center gap-2 text-sm">
                {users.length > 1 && (userControl ?? (
                  <label className="flex items-center gap-2">
                    <span className="text-gray-600">Demo user</span>
                    <NativeSelect id="demo-user" defaultValue={data.demoUser} className="bg-background">
                      {users.map((key) => <NativeSelectOption key={key} value={key}>{labels[key]}</NativeSelectOption>)}
                    </NativeSelect>
                  </label>
                ))}
                {actions}
              </div>
            )}

            <Card id="component" className="gap-0 py-0 shadow-xs">
              {/* The form's padding is the card's: src/styles/survey-overrides.css zeroes SurveyJS's own side padding.
                  Creator, the Dashboard and server-pdf's list replace this slot and fill the card. */}
              {form ?? <div id="form" className="p-4 sm:p-6">{children}</div>}
            </Card>
          </div>

          {/* CODE: the example's regions at the column's width; it scrolls with the page */}
          <div id="panel-code" role="tabpanel" aria-labelledby="tab-code" hidden className="p-4 text-sm lg:p-6">
            <div className="grid gap-4">
              {data.codeDefinitions.map((definition) => (
                <details key={definition.path} data-definition-code="" className="min-w-0 overflow-hidden rounded-lg border border-gray-800 bg-[#0d1117]">
                  <summary className="cursor-pointer px-4 py-3 text-xs text-gray-300 hover:bg-gray-800/60 focus-visible:outline-2 focus-visible:outline-sjs">
                    <span className="inline-flex w-[calc(100%_-_1rem)] flex-wrap items-center justify-between gap-2 align-middle">
                      <span className="[overflow-wrap:anywhere]"><span className="font-semibold text-white">JSON definition</span> · <code>{definition.path}</code></span>
                      <a className="text-sjs underline" href={definition.url} target="_blank">View on GitHub</a>
                    </span>
                  </summary>
                  <pre className="m-0 overflow-x-auto border-t border-gray-800 p-0 text-[12.5px] leading-relaxed"><code className="language-json block !bg-transparent p-4">{definition.code}</code></pre>
                </details>
              ))}
              {data.codePanel.map((region) => (
                <details key={region.id} data-code-section="" open className="min-w-0 overflow-hidden rounded-lg border border-gray-800 bg-[#0d1117]">
                  <summary className="cursor-pointer px-4 py-2 text-xs text-gray-300 hover:bg-gray-800/60 focus-visible:outline-2 focus-visible:outline-sjs">
                    <span className="inline-flex w-[calc(100%_-_1rem)] flex-wrap items-center justify-between gap-2 align-middle">
                      <span className="[overflow-wrap:anywhere]">
                        <span className="font-semibold text-white">{region.role === "client" ? "Client" : "Server"}</span> · <code>{region.path}</code> · <code>sjs:{region.id}</code>
                      </span>
                      <a className="text-sjs underline" href={region.url} target="_blank">View on GitHub</a>
                    </span>
                  </summary>
                  <pre className="m-0 overflow-x-auto border-t border-gray-800 p-0 text-[12.5px] leading-relaxed"><code className={`language-${region.language} block !bg-transparent p-4`}>{region.code}</code></pre>
                </details>
              ))}
            </div>
          </div>
        </main>
      </div>

      {/* Rows that src/demo/host.ts clones and fills by data-field. The two body slots switch on its body capture. */}
      <Template id="request-row" html={`
        <li class="data-[demo=true]:bg-gray-50 data-[demo=true]:text-gray-400 data-[state=error]:bg-red-50">
          <button type="button" data-row-toggle aria-expanded="false"
                  class="group grid w-full cursor-pointer grid-cols-[0.875rem_3.5rem_minmax(0,1fr)_auto] items-center gap-x-2 border-0 bg-transparent px-4 py-1.5 text-left font-mono text-xs [color:inherit] hover:bg-black/[0.03]">
            <svg aria-hidden="true" class="size-3.5 transition-transform group-aria-expanded:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 6 15 12 9 18"></polyline></svg>
            <span data-field="method" class="font-semibold"></span>
            <span data-field="url" class="truncate"></span>
            <span class="text-right"><span data-field="status" class="font-semibold"></span> <span data-field="time" class="text-gray-400"></span></span>
            <span data-field="headers" class="col-span-3 col-start-2 truncate text-[11px] text-sjs-dark empty:hidden"></span>
          </button>
          <div data-row-bodies hidden class="grid gap-3 pb-3 pl-10 pr-4">
            <div class="min-w-0">
              <p class="mb-1 font-sans text-[11px] font-bold tracking-wide text-gray-500 uppercase">Request body</p>
              <pre data-field="request-body" class="m-0 max-h-80 overflow-auto rounded border bg-background p-2 font-mono text-xs leading-snug text-gray-800 empty:before:text-gray-400 empty:before:content-['(none)']"></pre>
            </div>
            <div class="min-w-0">
              <p class="mb-1 font-sans text-[11px] font-bold tracking-wide text-gray-500 uppercase">Response</p>
              <pre data-field="response-body" class="m-0 max-h-80 overflow-auto rounded border bg-background p-2 font-mono text-xs leading-snug text-gray-800 empty:before:text-gray-400 empty:before:content-['(none)']"></pre>
            </div>
          </div>
        </li>`} />
      <Template id="stored-section" html={`
        <div>
          <h3 data-field="title" class="mb-1 text-xs font-semibold tracking-wide text-gray-500 uppercase"></h3>
          <pre data-field="json" class="m-0 overflow-x-auto rounded bg-muted p-2 font-mono text-[11.5px] leading-snug text-gray-800"></pre>
        </div>`} />
      <Template id="note" html={`
        <li data-field="text" class="rounded-md border px-3 py-1.5 data-[kind=error]:border-destructive/30 data-[kind=error]:bg-destructive/5 data-[kind=error]:text-red-800 data-[kind=info]:bg-background data-[kind=ok]:border-primary/40 data-[kind=ok]:bg-sjs-10 data-[kind=ok]:text-emerald-900"></li>`} />
      {/* The example's own rows, cloned the same way (relational-storage's mapping, lint-definition's findings) */}
      {templates}

      <ExampleScripts />
    </div>
  );
}
