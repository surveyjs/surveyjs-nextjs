# SurveyJS + Next.js Template

A working "My Forms" workspace built on the full SurveyJS product suite in a Next.js App Router app: build a form, run it, chart the answers, export a PDF — all from one list, and all in the browser.

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
| `/surveys` | The survey list: inline rename, created/updated dates, and a per-row menu — run, edit, results, PDF, clone, delete. |
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
[src/hooks/useWorkspace.ts](src/hooks/useWorkspace.ts).

Demo responses are generated from each survey's own questions with a seeded PRNG
([src/demo/seed.ts](src/demo/seed.ts)), so the charts look the same on every
visit and in tests. "Reset demo data" on the list page restores the seed.

## Storage

Every read and write of stored data goes through two files. Nothing else in the
app touches `localStorage`.

| File | Holds | API |
| --- | --- | --- |
| [src/storage/survey-json.ts](src/storage/survey-json.ts) | Survey definitions — the list and the JSON Survey Creator edits | `listSurveys()`, `findSurvey(id)`, `createSurvey()`, `cloneSurvey(id)`, `renameSurvey(id, name)`, `saveSurveyJson(id, json)`, `deleteSurvey(id)` |
| [src/storage/survey-results.ts](src/storage/survey-results.ts) | Submitted responses | `listResults(surveyId?)`, `submitResult(surveyId, data)`, `deleteResult(id)`, `deleteResultsFor(surveyId)` |

Two supporting files are not the seam:
[workspace-cache.ts](src/storage/workspace-cache.ts) is the localStorage cache
those two are written against, and [src/hooks/useWorkspace.ts](src/hooks/useWorkspace.ts)
is the React binding — it calls the seam, it does not contain it.

Every mutation is already `async`, even though the demo implementation is
synchronous, so replacing a body with a request changes no call site.

### Moving to a real backend

1. **Definitions.** Replace the bodies of `createSurvey`, `cloneSurvey`,
   `renameSurvey`, `saveSurveyJson` and `deleteSurvey` in
   [src/storage/survey-json.ts](src/storage/survey-json.ts) with calls to your
   API. The Creator already waits for the promise —
   [CreatorPane.tsx](src/components/surveys/CreatorPane.tsx) reports a rejected
   save back to the editor through `saveSurveyFunc`'s callback.
2. **Results.** Do the same for `submitResult`, `deleteResult` and
   `deleteResultsFor` in
   [src/storage/survey-results.ts](src/storage/survey-results.ts). `deleteSurvey`
   calls `deleteResultsFor` to imitate a cascading delete — drop that line once
   your endpoint cascades server-side.
3. **Reads.** `listSurveys` and `listResults` are synchronous because they feed
   `useSyncExternalStore`. To read them from an API, move the call into the
   server component that owns the route —
   [src/app/surveys/page.tsx](src/app/surveys/page.tsx) for the list,
   [src/app/surveys/[id]/results/page.tsx](src/app/surveys/%5Bid%5D/results/page.tsx)
   for the dashboard — `await` it there and pass the result down as a prop, then
   delete [src/hooks/useWorkspace.ts](src/hooks/useWorkspace.ts) and
   [src/storage/workspace-cache.ts](src/storage/workspace-cache.ts). The survey
   stays server-rendered either way.
4. **Seed data.** [src/demo/seed.ts](src/demo/seed.ts) and the "Reset demo data"
   button in [SurveysPage.tsx](src/components/surveys/SurveysPage.tsx) exist only
   to give a first-time visitor something to look at. Delete both once the data
   comes from a database.

### What moves into the database and what stays in code

| Stays in code | Moves to the database |
| --- | --- |
| `createSurveyModel` and the model options in [src/schemas/createSurveyModel.ts](src/schemas/createSurveyModel.ts) | The survey JSON now sitting in [src/schemas/](src/schemas/) — those definitions become rows |
| The seed definitions as *starter templates*, if you offer any | Survey names and the created/updated timestamps |
| The types in [src/storage/types.ts](src/storage/types.ts) — they describe your API payloads | Submitted responses, one row each |

## What this template covers

- **Server-side rendering of a survey.** `/surveys/[id]/run` renders the form into the HTML the server sends, before any JavaScript runs. Everything else on the page is static or prerendered.
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
  storage/
    survey-json.ts                Survey definitions — the seam you replace
    survey-results.ts             Submitted responses — the seam you replace
    workspace-cache.ts            localStorage cache behind both (demo-only)
    types.ts                      Survey + response shapes
  hooks/
    useWorkspace.ts               useSyncExternalStore bindings over the seam
  demo/
    seed.ts                       Seed surveys and the response generator
  components/
    surveys/                      List, row, workspace tabs and the three panes
    SurveyForm.tsx                Renders a model with survey-react-ui
    AdminShell.tsx, ThemeSwitcher.tsx
    ui/                           shadcn/ui primitives
  lib/
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
