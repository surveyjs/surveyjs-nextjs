# SurveyJS + Next.js: the backend integration examples

This is the Next.js code behind [Integrate SurveyJS with Next.js](https://surveyjs.io/documentation/backend-integration-nextjs), as a Next.js 16 App Router application you can run example by example. Each example of that page has a page here that runs the real SurveyJS component against these route handlers, with a short "Try this" list, a live request log, a "What the server stored" panel and the code that just ran. SurveyJS has no backend of its own, so treat these as starting points for your own app.

- SurveyJS demos: [app.demos.surveyjs.io](https://app.demos.surveyjs.io)
- The same examples for other platforms: [Node.js (Express)](https://github.com/surveyjs/surveyjs-nodejs), [PHP (Laravel)](https://github.com/surveyjs/surveyjs-php-laravel), [ASP.NET Core](https://github.com/surveyjs/surveyjs-aspnet-core), [Python (Flask)](https://github.com/surveyjs/surveyjs-python-flask)

## Run it

You need Node.js 24 or later, and nothing else: no Docker, no database server, no other service (see [Prerequisites](#prerequisites)).

```bash
git clone https://github.com/surveyjs/surveyjs-nextjs.git
cd surveyjs-nextjs
npm ci            # or npm install
npm run setup     # creates .env (from .env.example), storage/ and the SQLite database with the demo data
npm run dev       # http://127.0.0.1:8000, Next.js in development mode
```

For production, build first and start the built app:

```bash
npm run build
npm start         # http://127.0.0.1:8000, production mode
```

`npm run dev` and `npm start` both run `node server.ts` (a [custom server](#why-a-custom-server)), which also creates and seeds a missing database, so `npm run setup` only makes the first run explicit. Don't run `next dev` or `next start` directly: they would move to another port on their own if 8000 is busy, and they have no relays.

- In development, Next.js reloads `src/app/` and `src/components/` as you edit them. A change to `server.ts`, `src/server/relay/` or `.env` needs a restart (`Ctrl+C`, then `npm run dev`).
- **Fill Forms Together** and **Edit Forms Together** use WebSocket relays that run inside the app, on its port (`/ws/rooms/<id>` and `/ws/forms/<id>`). There is nothing else to start.
- **Run Server-Side Workflows** (validate, lint, PDF, extract) run inside the app too, with the SurveyJS libraries (see [Server-side workflows in process](#server-side-workflows-in-process)). Set `VALIDATE_RESPONSES=true` and `LINT_DEFINITIONS=true` in `.env` to switch Validate Responses and Lint JSON Schemas on, and an AI provider for Extract Responses from Documents.
- The tests: `npm test` (`node --test`: the route handlers called with `new Request(…)` and the relays, a few seconds, no browser and no network), `npm run contract` (builds, then runs the shared contract test against a fresh database; `npm run contract -- --smoke` for the smoke test, `-- --no-build` to reuse the last build), `npm run e2e:ci` (the shared Playwright specs and this repo's own, in production mode, after `npm run build`) and `npm run e2e:dev` (the same specs against the development server, which is where React reports its warnings).

`npm run dev` and `npm start` check that nothing answers on the port first, then print the folder they serve, its `<branch>@<commit>` and the mode:

```text
Serving C:\src\surveyjs-nextjs (main@1a2b3c4) on http://127.0.0.1:8000 (development)
```

### Prerequisites

- Node.js 24 or later (26 LTS recommended). Node runs `server.ts` as it is, with its built-in type stripping: no `tsx`, no build step for the server. `npm ci` on Node 22 or older stops with npm's own `EBADENGINE` error naming the version (`engines` in `package.json`, `engine-strict` in `.npmrc`), and `node server.ts` says which version to install.
- `sharp`, which the extractor uses to find a document's QR code, installs a prebuilt binary: no build tools are needed. `.npmrc` sets `ignore-scripts=true`, so no package runs an install script.

On Windows:

- Install Node.js 26 LTS from [nodejs.org](https://nodejs.org) or with `winget install OpenJS.NodeJS.LTS`.
- After installing, restart your editor, not only its terminal: VS Code's terminals inherit VS Code's environment. To refresh the current PowerShell terminal instead:

  ```powershell
  $env:Path = [Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [Environment]::GetEnvironmentVariable('Path','User')
  node --version
  ```

- npm runs scripts in `cmd`, so `VAR=value npm run dev` doesn't work there (and the scripts never set variables inline: `server.ts` takes `--dev` and `--production`). Set a variable for one run like this, or put it in `.env`:

  ```powershell
  $env:APP_PORT=8001; npm run dev
  ```

  ```bash
  APP_PORT=8001 npm run dev
  ```

On Windows, a second server can bind a port another server already listens on (one on `0.0.0.0`, one on `127.0.0.1`) while the first keeps answering. So `npm run dev` and `npm start` connect to the port first and stop with "Port 8000 is already in use. Another copy of this app (another checkout or branch?) may be running. Stop it, or set APP_PORT." The contract test's AI stub uses a free port of its own (`AI_STUB_PORT`, default 3020, when you start it by hand).

### Stop everything

`Ctrl+C` in the terminal: the app closes the relays (code 1001), the connections, Next.js (and its development workers) and the databases, and the port is free at once. To find a server left running in another terminal or checkout:

```powershell
Get-NetTCPConnection -LocalPort 8000 -State Listen | Select-Object OwningProcess
Stop-Process -Id <OwningProcess>
```

```bash
lsof -i :8000
kill <PID>
```

With Docker, `docker compose down`.

### Run a branch or a PR

- Check the branch out in its own folder, with `git worktree add ../surveyjs-nextjs-pr <branch>` (for a pull request, `git fetch origin pull/<number>/head:pr-<number>` first) or a second clone, and run `npm ci` there. `node_modules/`, `.next/`, `.env` and `storage/` belong to each checkout.
- Run one checkout on the default port at a time: stop the other one first, or start the second with `APP_PORT=8001` (PowerShell: `$env:APP_PORT=8001; npm run dev`), or put `APP_PORT=8001` in its `.env`.
- Next.js runs one development server per folder: a second `npm run dev` in the same checkout stops with Next.js's own "You can access the existing server at …" message, whatever its port. Production copies (`npm start`) can share a checkout on different ports.
- The page says which checkout answered: "Running `<branch>@<commit>`" under the catalog's footer buttons and at the end of every example's Description panel.

## Docker

```bash
docker compose up --build    # http://127.0.0.1:8000
```

The image (`Dockerfile`) builds on `node:26-slim` in two stages: `npm ci` and `npm run build`, then a runtime stage with `npm ci --omit=dev`, the `.next/` build, `server.ts`, `src/` (the Code tab reads the example files at request time) and `shared/`. It runs as the image's `node` user with `NODE_ENV=production` and starts with `node server.ts` (not `npm start`, which doesn't pass `SIGTERM` on). It creates and seeds the database on its first start. Its one volume, `/app/storage`, holds the database, the uploads, the visitor sandboxes and the relay snapshots. Logs go to stdout and stderr (`docker compose logs`). One process handles every visitor: extraction and translation wait on the network without blocking anyone, and linting, validation and PDFs take milliseconds each (measured in a route handler: 20–30 ms for a claim PDF, under 3 ms to lint the largest seeded form).

### Behind a proxy

`requestOrigin()` in `src/server/integration/http.ts` reads `X-Forwarded-Proto` and `X-Forwarded-Host` (else `Host`) from any proxy, so behind a TLS proxy the canonical links, the relays' `wss://` URLs and the `Secure` cookie flag use the scheme the visitor sees. Next.js has no `trust proxy` setting of its own: in your own production, accept those headers only from your proxy's addresses and don't publish the app's port. The relays are on the app's own host and port, so the proxy needs no extra route, only WebSocket upgrades passed through. For Traefik, next to your entry point and TLS labels:

```yaml
services:
  app:
    labels:
      - traefik.http.routers.surveyjs.rule=Host(`example.com`)
      - traefik.http.services.surveyjs.loadbalancer.server.port=8000
```

Traefik passes WebSocket upgrades (`/ws/rooms/…`, `/ws/forms/…` and, in development, Next.js's hot reload) on by default. `RELAY_URL` and `EDIT_RELAY_URL` are only needed when `/ws/` is served from another origin.

### Where it can run

Docker, or any Node.js host with a persistent disk and WebSockets. Not Vercel: the app needs a writable disk for SQLite and the uploads, WebSockets for the relays and a long-running process for the custom server, which serverless functions don't provide.

## Configuration

`npm run setup` copies `.env.example` to `.env`. `server.ts` loads it with Node's own `process.loadEnvFile()` (no `dotenv`) before it starts Next.js; variables set in the shell win. `src/server/config.ts` reads every setting once, and no other file reads `process.env`. Nothing is `NEXT_PUBLIC_*`: the pages get what they need from the server-rendered page config, so changing a setting needs a restart, never a rebuild. Switches accept `1`, `true`, `on` or `yes`.

| Variable | Default | What it does |
|---|---|---|
| `APP_PORT` | `8000` | Where the app listens. Wins over `PORT`. |
| `PORT` | unset | Set by Azure App Service and Heroku; used when `APP_PORT` isn't. |
| `APP_HOST` | `127.0.0.1` (`0.0.0.0` when `PORT` is set) | The address the app binds. |
| `NODE_ENV` | from the script | `npm run dev` is development, `npm start` production; `node server.ts` alone follows `NODE_ENV` (production when unset). |
| `DATA_DIR` | `storage` | The database, uploads, sandboxes and relay snapshots. |
| `SURVEYJS_LICENSE_KEY` | empty | Sent to every page in its config (`setLicenseKey()` in `src/demo/host.ts`) and set on the server, so it covers server PDFs too. Without it, the commercial components show a licence banner. |
| `VALIDATE_RESPONSES` | `false` | Validate Responses: `src/server/routes/validate-response.ts` replaces `save-response.ts` (`src/app/api/responses/route.ts`). |
| `LINT_DEFINITIONS` | `false` | Lint JSON Schemas: `src/server/routes/lint-definition.ts` replaces the PUT in `creator-load-save.ts` (`src/app/api/forms/[id]/route.ts`). |
| `SURVEYJS_AI_PROVIDER`, `SURVEYJS_AI_MODEL`, `SURVEYJS_OLLAMA_BASE_URL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY` | empty | Extract Responses from Documents: the extractor's provider (`openai`, `anthropic` or `ollama`), chosen as SurveyJS Server chooses it. Without `SURVEYJS_AI_PROVIDER`, the provider whose key is set. |
| `AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL` | OpenAI, empty, `gpt-4o-mini` | Translate with AI: any OpenAI-compatible `/chat/completions` endpoint. Without a key, `/api/translate` answers `501`. |
| `RELAY_URL`, `EDIT_RELAY_URL` | empty | The relays' origin when a proxy serves `/ws/` elsewhere, for example `wss://example.com`. Empty: the page's own origin. |
| `DEMO_MODE` | `false` | The hosted demo's visitor sandboxes (below). |
| `SURVEYJS_BUILD` | from git | The `<branch>@<commit>` the pages show as "Running …". Hosted demos set it at deploy. |
| `SURVEYJS_DOCS`, `SURVEYJS_GITHUB` | the Next.js docs page, this repository | Where the pages link. |

There is no `SURVEYJS_SERVICE_URL`: Run Server-Side Workflows don't call a service here.

## The examples

<!-- steps:start (generated by `npm run readme` from surveyjs-integration.json) -->
| Example | Run | Server | Client | Page | Licence |
|---|---|---|---|---|---|
| [Save Responses](https://surveyjs.io/documentation/backend-integration-nextjs#save-responses) | `/examples/save-response` | [`src/server/routes/save-response.ts`](src/server/routes/save-response.ts) | [`src/app/examples/save-response/client.tsx`](src/app/examples/save-response/client.tsx) | [`src/app/examples/save-response/page.tsx`](src/app/examples/save-response/page.tsx) | MIT |
| [Load JSON Schemas, Variables, and Answers](https://surveyjs.io/documentation/backend-integration-nextjs#load-json-schemas-variables-and-answers) | `/examples/load-definition-variables-data` | [`src/server/routes/load-definition-variables-data.ts`](src/server/routes/load-definition-variables-data.ts) | [`src/app/examples/load-definition-variables-data/client.tsx`](src/app/examples/load-definition-variables-data/client.tsx) | [`src/app/examples/load-definition-variables-data/page.tsx`](src/app/examples/load-definition-variables-data/page.tsx) | MIT |
| [Resume Progress](https://surveyjs.io/documentation/backend-integration-nextjs#resume-progress) | `/examples/resume-progress` | [`src/server/routes/resume-progress.ts`](src/server/routes/resume-progress.ts) | [`src/app/examples/resume-progress/client.tsx`](src/app/examples/resume-progress/client.tsx) | [`src/app/examples/resume-progress/page.tsx`](src/app/examples/resume-progress/page.tsx) | MIT |
| [Store Files Separately](https://surveyjs.io/documentation/backend-integration-nextjs#store-files-separately) | `/examples/store-files` | [`src/server/routes/store-files.ts`](src/server/routes/store-files.ts) | [`src/app/examples/store-files/client.tsx`](src/app/examples/store-files/client.tsx) | [`src/app/examples/store-files/page.tsx`](src/app/examples/store-files/page.tsx) | MIT |
| [Load Choices from Web](https://surveyjs.io/documentation/backend-integration-nextjs#load-choices-from-web) | `/examples/choices-from-web` | [`src/server/routes/choices-from-web.ts`](src/server/routes/choices-from-web.ts) | [`src/app/examples/choices-from-web/client.tsx`](src/app/examples/choices-from-web/client.tsx) | [`src/app/examples/choices-from-web/page.tsx`](src/app/examples/choices-from-web/page.tsx) | MIT |
| [Async Calculations and Validation](https://surveyjs.io/documentation/backend-integration-nextjs#async-calculations-and-validation) | `/examples/async-functions` | [`src/server/routes/async-functions.ts`](src/server/routes/async-functions.ts) | [`src/app/examples/async-functions/client.tsx`](src/app/examples/async-functions/client.tsx) | [`src/app/examples/async-functions/page.tsx`](src/app/examples/async-functions/page.tsx) | MIT |
| [Use Relational Storage](https://surveyjs.io/documentation/backend-integration-nextjs#use-relational-storage) | `/examples/relational-storage` | [`src/server/routes/relational-storage.ts`](src/server/routes/relational-storage.ts) | [`src/app/examples/relational-storage/client.tsx`](src/app/examples/relational-storage/client.tsx) | [`src/app/examples/relational-storage/page.tsx`](src/app/examples/relational-storage/page.tsx) | MIT |
| [Fill Forms Together](https://surveyjs.io/documentation/backend-integration-nextjs#fill-forms-together) | `/examples/fill-together` | [`src/server/relay/fill-relay.ts`](src/server/relay/fill-relay.ts) | [`src/app/examples/fill-together/client.tsx`](src/app/examples/fill-together/client.tsx) | [`src/app/examples/fill-together/page.tsx`](src/app/examples/fill-together/page.tsx) | MIT |
| [Analyze Results with Dashboard](https://surveyjs.io/documentation/backend-integration-nextjs#analyze-results-with-dashboard) | `/examples/dashboard` | [`src/server/routes/dashboard.ts`](src/server/routes/dashboard.ts) | [`src/app/examples/dashboard/client.tsx`](src/app/examples/dashboard/client.tsx) | [`src/app/examples/dashboard/page.tsx`](src/app/examples/dashboard/page.tsx) | Commercial client |
| [Load and Save Form JSON Schemas](https://surveyjs.io/documentation/backend-integration-nextjs#load-and-save-form-json-schemas) | `/examples/creator-load-save` | [`src/server/routes/creator-load-save.ts`](src/server/routes/creator-load-save.ts) | [`src/app/examples/creator-load-save/client.tsx`](src/app/examples/creator-load-save/client.tsx) | [`src/app/examples/creator-load-save/page.tsx`](src/app/examples/creator-load-save/page.tsx) | Commercial client |
| [Upload Files](https://surveyjs.io/documentation/backend-integration-nextjs#upload-files) | `/examples/creator-uploads` | [`src/server/routes/store-files.ts`](src/server/routes/store-files.ts) | [`src/app/examples/creator-uploads/client.tsx`](src/app/examples/creator-uploads/client.tsx) | [`src/app/examples/creator-uploads/page.tsx`](src/app/examples/creator-uploads/page.tsx) | Commercial client |
| [Translate with AI](https://surveyjs.io/documentation/backend-integration-nextjs#translate-with-ai) | `/examples/ai-translation` | [`src/server/routes/ai-translation.ts`](src/server/routes/ai-translation.ts) | [`src/app/examples/ai-translation/client.tsx`](src/app/examples/ai-translation/client.tsx) | [`src/app/examples/ai-translation/page.tsx`](src/app/examples/ai-translation/page.tsx) | Commercial client, needs an AI provider |
| [Variable Presets](https://surveyjs.io/documentation/backend-integration-nextjs#variable-presets) | `/examples/variable-presets` | [`src/server/routes/variable-presets.ts`](src/server/routes/variable-presets.ts) | [`src/app/examples/variable-presets/client.tsx`](src/app/examples/variable-presets/client.tsx) | [`src/app/examples/variable-presets/page.tsx`](src/app/examples/variable-presets/page.tsx) | Commercial client |
| [Edit Forms Together](https://surveyjs.io/documentation/backend-integration-nextjs#edit-forms-together) | `/examples/edit-together` | [`src/server/relay/edit-relay.ts`](src/server/relay/edit-relay.ts) | [`src/app/examples/edit-together/client.tsx`](src/app/examples/edit-together/client.tsx) | [`src/app/examples/edit-together/page.tsx`](src/app/examples/edit-together/page.tsx) | Commercial client |
| [Validate Responses](https://surveyjs.io/documentation/backend-integration-nextjs#validate-responses) | `/examples/validate-response` | [`src/server/routes/validate-response.ts`](src/server/routes/validate-response.ts) | [`src/app/examples/validate-response/client.tsx`](src/app/examples/validate-response/client.tsx) | [`src/app/examples/validate-response/page.tsx`](src/app/examples/validate-response/page.tsx) | MIT |
| [Lint JSON Schemas](https://surveyjs.io/documentation/backend-integration-nextjs#lint-json-schemas) | `/examples/lint-definition` | [`src/server/routes/lint-definition.ts`](src/server/routes/lint-definition.ts) | [`src/app/examples/lint-definition/client.tsx`](src/app/examples/lint-definition/client.tsx) | [`src/app/examples/lint-definition/page.tsx`](src/app/examples/lint-definition/page.tsx) | MIT |
| [Generate PDFs](https://surveyjs.io/documentation/backend-integration-nextjs#generate-pdfs) | `/examples/server-pdf` | [`src/server/routes/server-pdf.ts`](src/server/routes/server-pdf.ts) | [`src/app/examples/server-pdf/client.tsx`](src/app/examples/server-pdf/client.tsx) | [`src/app/examples/server-pdf/page.tsx`](src/app/examples/server-pdf/page.tsx) | Commercial |
| [Extract Responses from Documents](https://surveyjs.io/documentation/backend-integration-nextjs#extract-responses-from-documents) | `/examples/extract-from-paper` | [`src/server/routes/extract-from-paper.ts`](src/server/routes/extract-from-paper.ts) | [`src/app/examples/extract-from-paper/client.tsx`](src/app/examples/extract-from-paper/client.tsx) | [`src/app/examples/extract-from-paper/page.tsx`](src/app/examples/extract-from-paper/page.tsx) | MIT, needs an AI provider |
<!-- steps:end -->

## Where each example lives

Each example is a few files you can read on their own. The full explanation is in [the docs](https://surveyjs.io/documentation/backend-integration-nextjs).

- `src/server/routes/<slug>.ts`: the example's logic, the server code the docs show: one exported handler per endpoint, taking the Web `Request` and returning a `Response`. Each file matches [`surveyjs-nodejs`](https://github.com/surveyjs/surveyjs-nodejs)'s `routes/<slug>.js` line by line, with `Response.json(…, { status })` in place of `res.status().json()`.
- `src/app/api/**/route.ts`: the paths. Each file only delegates, `export const { GET, POST, … } = methods({ POST: route(saveResponse) })`: `route()` (in `src/server/integration/http.ts`) awaits Next.js's `params`, and answers errors as JSON `{ error }`; `methods()` gives every other method a JSON `405` with `Allow`. `src/app/api/responses/route.ts` and `src/app/api/forms/[id]/route.ts` pick `validate-response.ts` or `save-response.ts`, and `lint-definition.ts` or `creator-load-save.ts`, by the switches. `src/app/api/[...path]/route.ts` answers every unknown `/api` path with a JSON `404`.
- `src/app/examples/<slug>/page.tsx`: the example's page, a Server Component: its description, the "Try this" list and its controls. `src/app/examples/<slug>/client.tsx`: the example's client code (`"use client"`), the SurveyJS code the docs show in React, ported from `shared/client/<slug>.js` with the same behaviour.
- `src/server/relay/fill-relay.ts` and `edit-relay.ts`: the relays of Fill Forms Together and Edit Forms Together, with their rooms in `fill-room.ts` and `edit-room.ts`. `src/server/relay/index.ts` attaches them to the custom server's HTTP server.
- `src/server/integration/`: small helpers some handlers call, so the code the docs show stays about SurveyJS. They aren't demo code:
  - `stored-json.ts` (`save-response`, `relational-storage`, `validate-response`, the fill relay): inserts a response as one JSON document, with an ISO 8601 UTC `created_at`.
  - `surveyjs.ts` and `ai-provider.ts` (Run Server-Side Workflows): the linter options, the response errors, the PDF call, the extraction timeout and provider, and the logging.
  - `ai-translation.ts` (Translate with AI): the call to your OpenAI-compatible provider.
  - `http.ts`: `route()`, `readJson()`, `readFiles()`, errors with a status, the query string, the origin behind a proxy, and fetch with a timeout. `cache.ts`, `file-type.ts`: the countries cache, and file types by their first bytes.
- `src/server/db.ts` (`db(req)`, SQLite through `node:sqlite`) and `src/server/auth.ts` (`currentUser()`, `can()`, `canReadFile()`).

To copy an example, copy its handler file, its `route.ts` and the helpers it imports. The code the docs show is cut from these files between `// #region sjs:<slug>.server` (or `.client`) and `// #endregion`. `surveyjs-integration.json` lists every example's files and regions; `npm run check` verifies them, and `npm run contract` runs the shared contract test (`shared/contract-tests/run.mjs`) against a fresh database. Any of `better-sqlite3`, Prisma or Drizzle works just as well as `node:sqlite`; the examples use plain SQL so that a response stays visibly one JSON document.

`server.ts` and everything under `src/server/` is TypeScript that Node.js runs directly: erasable syntax only (`erasableSyntaxOnly` in `tsconfig.json`), and imports between these files by relative paths ending in `.ts`. The pages and components use the `@/` alias.

### Shared files

`shared/` holds what every platform repository uses byte for byte: the client modules, the form definitions, samples and seed data, the page UI (`shared/ui/`), and the contract, smoke and browser tests. It is a copy of [`surveyjs-php-laravel`](https://github.com/surveyjs/surveyjs-php-laravel)'s `shared/` at the commit in `shared/UPSTREAM`; `npm run check` compares it with `shared/SHA256SUMS`. Don't edit it here: send a fix to that repository, then copy `shared/` again. This app serves `shared/client/` under `/shared/`, like every platform, but its pages run the React ports in `src/app/examples/*/client.tsx`.

### Editing example descriptions

The text in an example's Description panel is the `description` prop in `src/app/examples/<slug>/page.tsx`. It can hold several paragraphs, links and other markup:

```tsx
description={<>
  <p>Your custom description.</p>
  <p>More details with <strong>formatting</strong>.</p>
</>}
```

The "Try this" list is the `tryThis` prop; the frame is `src/components/example/example-layout.tsx`. `/claim` renders the Load JSON Schemas, Variables, and Answers page itself, so its texts are in that example's `page.tsx` too. The catalog cards use `need` from `surveyjs-integration.json` for their "Use when" text.

### Storing JSON exactly as it arrives

A response, a definition, saved progress and variable presets are each one JSON document, stored as text and returned as stored.

- Route handlers get no body parser. `readJson()` in `src/server/integration/http.ts` reads the raw body with `await req.text()` and parses it with `JSON.parse`. It refuses a body over 12 MB with `413` (from `Content-Length` and while reading), answers `400` for text that isn't JSON, and hands any JSON value to the handler, so a top-level `null` or string gets the handler's own `400`. A body that isn't `application/json` gives `undefined`, which every handler treats as a wrong envelope.
- The handlers store `JSON.stringify(…)` of the parsed document and nothing else. They never copy it (spread, `Object.assign`, `structuredClone`): `JSON.parse` creates a `"__proto__"` key as an ordinary property, and a copy would turn it into the copy's prototype.
- `JSON.parse` keeps `{}`, `[{}]`, `null`, `""`, whitespace inside strings and non-ASCII text. `1.0` becomes `1`, because JavaScript has one number type; that only matters if you compare stored JSON as text.
- Uploads: `readFiles()` refuses a multipart body without `Content-Length` (`411`) or bigger than ten 5 MB files plus 1 MB before it calls `req.formData()`, which buffers the whole body; then it checks each file's size. Types come from the first bytes (`file-type.ts`), never from the client.
- `created_at` is ISO 8601 UTC without milliseconds (`2026-11-15T12:00:00Z`), so the dashboard's date filters are string comparisons; `src/server/integration/stored-json.ts` formats it.

## Server-side workflows in process

SurveyJS Server ([surveyjs/surveyjs-server](https://github.com/surveyjs/surveyjs-server)) runs the SurveyJS libraries on Node.js. Here the same libraries run inside the route handlers, following its source at `db1ac24`, so these handlers accept and reject what the service does:

- `src/server/routes/validate-response.ts`: `lintSurvey()` from `survey-core/linter` on the stored definition, then `new Model(definition)`, `setData(data, {})` and `validate()` from `survey-core`.
- `src/server/routes/lint-definition.ts`: `lintSurvey()` with the service's rule overrides.
- `src/server/routes/server-pdf.ts` and the blank work order in `src/server/routes/extract-from-paper.ts`: `new SurveyPDF(definition)` from `survey-pdf` (in `src/server/integration/surveyjs.ts`).
- `src/server/routes/extract-from-paper.ts`: `createExtractor()` and `extractFromImage()` from `ai-form-response-extractor`, with the provider from `src/server/integration/ai-provider.ts`.

A failure in the libraries is this app's own error (`500`); `502` and `504` are kept for the AI provider. `survey-core`, `survey-pdf`, the extractor and its provider SDKs are `serverExternalPackages` in `next.config.ts`, loaded from `node_modules`, so the handlers and `survey-pdf` share one `survey-core`; `src/server/integration/surveyjs.ts` calls `setLicenseKey()` there, so `SURVEYJS_LICENSE_KEY` covers server PDFs. When your backend isn't JavaScript, run the same code as a separate service: SurveyJS Server, which the [PHP](https://github.com/surveyjs/surveyjs-php-laravel) and [ASP.NET Core](https://github.com/surveyjs/surveyjs-aspnet-core) examples call over HTTP.

## Why a custom server

The relays need the HTTP server's `upgrade` event, which route handlers never get. So `server.ts` creates the HTTP server itself, hands every request to Next.js (`next({ dev })`, `getRequestHandler()`), attaches the two relays to its `upgrade` event (`/ws/…`; Next.js keeps handling its own hot-reload socket in development), checks the port, seeds the database and shuts everything down on `Ctrl+C`. Without Fill Forms Together and Edit Forms Together, `next start` would do. A custom server rules out Vercel and `output: "standalone"` (Next.js's documented limits for custom servers), which this app couldn't use anyway: it needs a disk and long-running WebSockets.

One process runs two module graphs: `server.ts` loads `src/server/` through Node.js, and the route handlers load it again through Next.js's bundle. What both must share (the open SQLite handles, so a pruned sandbox can be closed and deleted; the AI-call counts; the countries cache) lives on `globalThis` under a registered symbol (`src/server/process-state.ts`).

`src/proxy.ts` (Next.js 16's name for middleware) does the demo's page work that a Server Component can't: setting the `demo_sid` and `demo_user` cookies and answering edit-together's `400`. It matches pages only: Next.js buffers the body of every request a proxy sees (up to 10 MB, and cuts it there), so API requests never pass through it.

## How data works in the demo

Locally, everyone shares one SQLite database, `storage/database.sqlite` (delete `storage/` to start over).

On the hosted demo (`DEMO_MODE=true`), each visitor gets a private copy of the seeded database and uploads folder, chosen by a `demo_sid` cookie, and kept until it has been unused for 24 hours (an hourly timer in `server.ts`). The "Open a second window" link in Fill Forms Together and Edit Forms Together carries that id (`?join=`), so whoever opens it works in the same copy and the same relay rooms. The demo also caps uploads at 5 MB and the AI examples at 20 calls per visitor per day, counted in this process: with several processes, keep the counts in a shared store. None of this is in the example code.

## Front end

- **shadcn/ui.** The pages are React Server Components built from [shadcn/ui](https://ui.shadcn.com) in the `base-nova` style (`components.json`). The components in `src/components/ui/` are generated by the CLI, as it writes them:

  ```bash
  npx shadcn add button badge card table native-select
  ```

  Where a component's markup would change an element the shared page scripts rely on (the tabs, the side panel's sheet, the `<template>`s the requests log clones), the page keeps the reference's element and takes the component's classes.
- **The brand.** `src/app/globals.css` imports Tailwind CSS v4 (with Preflight, which shadcn needs), `tw-animate-css`, `shadcn/tailwind.css` and `shared/ui/theme.css` (the SurveyJS design tokens, the same on every platform), then sets shadcn's tokens to the SurveyJS brand: `--primary` and `--ring` are `#19b394`, `--destructive` is the SurveyJS red, `--foreground` the reference's text colour, `--font-sans` Lato. Light mode only.
- **SurveyJS styles.** The forms, Creator and the Dashboard use the SurveyJS shadcn adapter (`survey-core/themes/adapters/shadcn-base-nova.css`), so they read the same tokens. `src/styles/form.css`, `creator.css` and `dashboard.css` import the SurveyJS styles of each page type; `src/styles/survey-overrides.css` holds this app's layout tweaks. No page calls `applyTheme()`: its inline styles would override the adapter.
- **Fonts.** Lato from `shared/ui/fonts.css` with four preload links (`src/app/layout.tsx`), so the family is named `Lato` as on every platform. `next/font/local` is the idiomatic alternative in your own app; it renames the family, which the shared tests check.
- **Page scripts.** `shared/ui/page-tabs.js` (the tabs, the side panel, the counters) and `shared/ui/code-highlight.js` (highlight.js on the Code tab) load unchanged through the bundler, after hydration, on markup React never re-renders. `src/demo/host.ts` is the demo half of `shared/client/host.js` in TypeScript: the requests log, the Data panel, the notes and the demo-user cookie. It marks Next.js's own requests (`/_next/`, React Server Component requests, the hot-reload socket) as demo requests, hidden behind **Show demo requests**.
- **React.** The forms render on the server: a `'use client'` component imports `Survey` from `survey-react-ui` and creates the model from the definition the page passes it, during render (a `useState` initializer), so the page's HTML already contains the form. Element ids come from each survey's own id generator, so the server and the browser give the same ids. Where the model needs the browser first (a draft or a definition fetched from the API, a record the relay sends), the component creates it on the client and renders `Survey` the same way. Creator renders in the browser: the start-up work creates it, and the page renders `SurveyCreatorComponent` from a direct import, as any React app does. The Dashboard renders in the browser only: `survey-analytics` touches `document` when it is imported, so the start-up work loads it with a dynamic `import()`. The start-up work (the page's buttons, the requests, the sockets) runs once per mount, after Strict Mode's second mount in development (`src/lib/use-mount-task.ts`), so each request goes out once. Links between pages are plain `<a>`: every page is a full load with a fresh requests log.

## Not on the App Router?

The handlers only use the Web `Request`, the database and a `Response`, so they port in a few lines. Save Responses as a Pages Router API route, `pages/api/responses.ts`. Its built-in body parser keeps `{}` and whitespace, but has a 1 MB default limit; raise it for Creator definitions:

```ts
import type { NextApiRequest, NextApiResponse } from "next";
import { db } from "../../lib/db";

export const config = { api: { bodyParser: { sizeLimit: "12mb" } } };

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.setHeader("Allow", "POST").status(405).json({ error: "Method not allowed" });
  const { formId, data } = req.body ?? {};
  if (formId == null || data == null) return res.status(400).json({ error: "Expected { formId, data }" });

  const { lastInsertRowid } = db.prepare("INSERT INTO responses (form_id, data, created_at) VALUES (?, ?, ?)")
    .run(formId, JSON.stringify(data), new Date().toISOString().replace(/\.\d{3}Z$/, "Z"));
  res.status(201).json({ id: Number(lastInsertRowid) });
}
```

## Disclaimer

These examples must not be used as a real service as they are. They don't cover authentication, authorization, user management, access levels and other security aspects of a real survey service. The places where real checks go are marked:

- `currentUser(req)`, `can(user, "edit-forms")` and `canReadFile(user, file)` in `src/server/auth.ts`: who is signed in, who may save definitions and presets, and who may read an uploaded file.
- `src/server/demo/users.ts`: the demo-user switch stands in for your session or token check (Auth.js, a JWT). The relays check the same cookie in `src/server/relay/index.ts`.

When you copy an example into your app, leave out the demo-only code: `src/server/demo/` (and its calls in `route()`, `server.ts` and `src/server/relay/index.ts`), `src/demo/`, the demo parts of `src/proxy.ts` (all of it, in fact: it only sets the demo cookies and answers edit-together's `400`), `src/components/example/`, `src/lib/page-request.ts` and `example-page.ts`, `shared/ui/` (the page frame, its tabs and highlighting, the fonts and site images), and `src/server/relay/room-key.ts`'s sandbox keys.

## Licence

The code in this repository is available under the [MIT licence](LICENSE).

The examples use SurveyJS Form Library, which is MIT-licensed as well. The examples marked "Commercial" in the Licence column above also use SurveyJS Survey Creator, Dashboard or PDF Generator, which are commercial products. You can integrate them and evaluate their functionality without a licence. Production use requires a developer licence for each developer who works with the SurveyJS APIs or implements the integration. See the [SurveyJS Licensing FAQ](https://surveyjs.io/faq#licensing) and the [End-User License Agreement](https://surveyjs.io/Developer-License-Agreement.pdf).
