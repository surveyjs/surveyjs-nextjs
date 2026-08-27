# SurveyJS Suite + Next.js Template

A working "My Surveys" workspace built on the full SurveyJS product suite in a Next.js App Router app: build a form, run it, chart the answers, export a PDF — all from one list, and all in the browser.

- [SurveyJS Form Library](https://surveyjs.io/form-library/documentation/overview) — renders the form, on the server
- [Survey Creator / Form Builder](https://surveyjs.io/survey-creator/documentation/overview) — the drag-and-drop editor
- [SurveyJS Dashboard](https://surveyjs.io/dashboard/documentation/overview) — charts over collected responses
- [SurveyJS PDF Generator](https://surveyjs.io/pdf-generator/documentation/overview) — a blank or filled-in form as a PDF document

The UI is [shadcn/ui](https://ui.shadcn.com), and the forms are themed through the SurveyJS shadcn adapter, so both sides read from the same design tokens.

## Deploy your own

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fsurveyjs%2Fsurveyjs-nextjs)

## Run the application

```bash
git clone https://github.com/surveyjs/surveyjs-nextjs.git
cd surveyjs-nextjs
npm i
npm run dev
```

Open http://localhost:3000/ in your browser.

## Pages

| Route | What it shows |
| --- | --- |
| `/` | Redirects to `/surveys`. |
| `/surveys` | The survey list: inline rename, created/updated dates, published state, active/archived, and a per-row menu — run, edit, results, PDF, clone, publish, copy id, archive, delete. |
| `/surveys/[id]/edit` | Survey Creator with the designer, JSON editor, theme and translation tabs. Autosaves. |
| `/surveys/[id]/run` | The survey itself, server-rendered. Submitting adds a response; "Save as PDF" exports what is currently filled in. |
| `/surveys/[id]/results` | The dashboard, charting every response for that survey. |

## No API, no database

There is no backend. The workspace — surveys, edits and responses — lives in
`localStorage`, so the demo can be handed to any number of visitors without a
server holding their state, and each of them gets their own copy.

The seed workspace is still rendered on the server: the list and the survey
pages arrive as HTML, and React swaps in the browser's own data right after
hydration via `useSyncExternalStore`. That is what keeps the pages
crawler-visible while the editing stays local — see
[src/demo/useWorkspace.ts](src/demo/useWorkspace.ts).

Demo responses are generated from each survey's own questions with a seeded PRNG
([src/demo/seed.ts](src/demo/seed.ts)), so the charts look the same on every
visit and in tests. "Reset demo data" on the list page restores the seed.

## What this template covers

- **Server-side rendering of a survey.** `survey-core` needs a DOM stub to render outside a browser — see [src/lib/survey-ssr-environment.ts](src/lib/survey-ssr-environment.ts). Everything else on the page is static or prerendered.
- **Client-only panes, on purpose.** The Creator and the Dashboard both reach for `window` while building their UI, so they are loaded with `next/dynamic` and `ssr: false` ([src/components/surveys/SurveyWorkspace.tsx](src/components/surveys/SurveyWorkspace.tsx)).
- **Creator wiring.** [CreatorPane.tsx](src/components/surveys/CreatorPane.tsx) builds one creator per survey and saves through `saveSurveyFunc`; the JSON is read from the store rather than passed as a prop, so a save never rebuilds the editor.
- **Dashboard wiring.** [ResultsPane.tsx](src/components/surveys/ResultsPane.tsx) feeds a `VisualizationPanel` with the questions of the current definition and the responses collected for it.
- **PDF on demand.** [src/lib/pdf-export.ts](src/lib/pdf-export.ts) imports `survey-pdf` lazily, so jsPDF and its fonts stay out of the bundle until someone asks for a file.
- **Theming.** The shadcn adapter (`survey-core/themes/adapters/shadcn-base-nova.css`) maps the form onto the app's design tokens; light/dark and radius changes apply to both at once. App-local tweaks live in [src/styles/](src/styles/).

## Project structure

```
src/
  app/
    surveys/page.tsx              The survey list
    surveys/[id]/edit             Creator
    surveys/[id]/run              Form Library
    surveys/[id]/results          Dashboard
  demo/
    types.ts                      Survey + response shapes
    seed.ts                       Seed workspace and the response generator
    store.ts                      localStorage store and every mutation
    useWorkspace.ts               useSyncExternalStore bindings
  components/
    surveys/                      List, row, workspace tabs and the three panes
    SurveyForm.tsx                Renders a model with survey-react-ui
    AdminShell.tsx, ThemeSwitcher.tsx
    ui/                           shadcn/ui primitives
  lib/
    survey-ssr-environment.ts     DOM stub that lets survey-core render on the server
    pdf-export.ts                 survey-pdf, imported on demand
  schemas/                        The form definitions used to seed the workspace
  styles/                         App-local overrides on top of the SurveyJS adapter
```

## Tests

Playwright end-to-end tests live in [e2e/](e2e/). They assert that the list and
the survey arrive in the server response, that the Creator and the Dashboard
mount, that a survey can be created, renamed and deleted, and that no route logs
a console error or warning — hydration mismatches included.

```bash
npm run e2e:ci    # against a production build
npm run e2e:dev   # against `next dev`, where React reports more warnings
npm run e2e:ui    # interactive runner
```

## License

Survey Creator, SurveyJS Dashboard and SurveyJS PDF Generator are commercial
products — see [LICENSE](LICENSE) and
[surveyjs.io/licenses](https://surveyjs.io/Licenses#SurveyCreator). The SurveyJS
Form Library is free and open-source (MIT).
