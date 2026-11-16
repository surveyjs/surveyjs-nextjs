// Demo only: everything around the examples on an example page, ported from shared/client/host.js with its DOM
// contract unchanged: the requests log, the "What the server stored" panel, the notes and read-outs, the demo-user
// cookie, the invite links and the relay URLs. None of this is part of an integration. React mounts the form and
// Creator (host.js's mountSurvey / mountCreator aren't ported); everything else finds page elements by id,
// data- attributes and <template> slots, and never sets CSS classes.
//
// The fetch / XMLHttpRequest / WebSocket wrappers are installed when this module is first imported in the browser,
// before any example code runs: every example client component imports it first. It reads the page and its
// config lazily: Next.js's scripts can run before the browser has parsed the whole page.
import { setLicenseKey } from "survey-core";

type RelayConfig = { url: string | null; port: number };
export type PageConfig = {
  slug?: string;
  version?: string;
  licenseKey?: string | null;
  demoUser?: string;
  user?: { key: string; name: string; plan: string; isEditor: boolean } | null;
  relay?: { fill: RelayConfig; edit: RelayConfig };
  demoMode?: boolean;
  sandboxId?: string | null;
  switches?: { validateResponses: boolean; lintDefinitions: boolean };
  definition?: Record<string, unknown>;
  definitionV2?: Record<string, unknown>;
  [key: string]: unknown;
};

declare global {
  interface Window {
    SURVEYJS_PAGE?: PageConfig;
  }
}

const browser = typeof window !== "undefined";
let config: PageConfig | undefined;

/** The page config the server rendered into window.SURVEYJS_PAGE; the first call applies the licence key. */
export function getPage(): PageConfig {
  if (!config && browser && window.SURVEYJS_PAGE) {
    config = window.SURVEYJS_PAGE;
    if (config.licenseKey) setLicenseKey(config.licenseKey);
  }
  return config ?? {};
}

// ---------------------------------------------------------------------------------------------
// Requests log: wraps fetch, XMLHttpRequest (choicesByUrl uses XHR) and WebSocket

const REQUEST_HEADERS = ["authorization"];
const RESPONSE_HEADERS = ["x-demo-cache", "cache-control", "content-type"];
const storedListeners = new Set<(stored: Record<string, unknown>) => void>();
const requestListeners = new Set<(request: { method: string; url: string; status: number }) => void>();
let storedQuery: Record<string, unknown> = {};
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

/**
 * The demo's own requests (the Data panel, shared files, other origins) are hidden by default. So are Next.js's
 * own: its files under /_next/, React Server Component requests (the RSC header, ?_rsc=) and the development
 * server's hot-reload WebSocket, so "exactly one POST" stays true on screen.
 */
function isDemoRequest(url: string, headers?: Record<string, string>) {
  const u = new URL(url, location.href);
  return u.origin !== location.origin || u.pathname.startsWith("/demo/") || u.pathname.startsWith("/shared/")
    || u.pathname.startsWith("/_next/") || u.searchParams.has("_rsc") || headers?.rsc !== undefined;
}

/** Clone the page's <template id="…"> and put each value into its data-field="<key>" slots as text. */
export function fill(template: string, values: Record<string, unknown>): HTMLElement | null {
  const tpl = document.getElementById(template) as HTMLTemplateElement | null;
  if (!tpl) return null;
  const node = tpl.content.firstElementChild!.cloneNode(true) as HTMLElement;
  for (const [key, value] of Object.entries(values)) {
    const slots = node.matches(`[data-field="${key}"]`) ? [node] : node.querySelectorAll(`[data-field="${key}"]`);
    for (const slot of slots) slot.textContent = value === undefined || value === null ? "" : String(value);
  }
  return node;
}

// Request and response bodies, only when the page's #request-row template has both slots
// (data-field="request-body" and "response-body"). Without them none of this runs: no clone, no
// extra reads. Capture never touches what the caller sends or receives: a response is read through
// a clone, at most BODY_LIMIT bytes, in a detached task, and any failure only writes
// "(body unavailable)" into the slot.
const BODY_LIMIT = 64 * 1024;
let captureBodies: boolean | undefined;
/** Read from the template the first time it matters, once the page is parsed. */
function capturesBodies() {
  if (captureBodies === undefined) {
    const rowTemplate = (document.getElementById("request-row") as HTMLTemplateElement | null)?.content;
    captureBodies = Boolean(rowTemplate?.querySelector('[data-field="request-body"]') && rowTemplate?.querySelector('[data-field="response-body"]'));
  }
  return captureBodies;
}

const sizeOf = (bytes: number) => `${bytes} bytes`;
const cut = (text: string) => (text.length > BODY_LIMIT ? { text: text.slice(0, BODY_LIMIT), truncated: true } : { text, truncated: false });

/** For display only: two-space JSON when the whole body was read and parses, else the text as it is. */
function display(text: string, truncated: boolean, json: boolean) {
  if (truncated) return `${text}\n… (truncated)`;
  if (json) {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      // not JSON after all
    }
  }
  return text;
}

/** The request body as sent, read synchronously from what the caller passed, never consuming it. */
function describeRequestBody(body: unknown, input?: unknown) {
  if (body === undefined || body === null) return typeof Request !== "undefined" && input instanceof Request && input.body ? "(not shown)" : "(no body)";
  if (typeof body === "string") {
    const { text, truncated } = cut(body);
    return display(text, truncated, /^\s*[[{]/.test(text));
  }
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof FormData) {
    return [...body.entries()]
      .map(([name, value]) => (typeof value === "string" ? `${name}: ${value}` : `${name}: ${value.name} (${value.type || "unknown type"}, ${sizeOf(value.size)})`))
      .join("\n");
  }
  if (body instanceof Blob) return `(${body.type || "unknown type"}, ${sizeOf(body.size)})`;
  return "(not shown)";
}

const isJsonType = (type: string) => /^application\/json$|\+json$/.test(type);
const isTextType = (type: string) => type.startsWith("text/") || isJsonType(type);

/** Reads at most BODY_LIMIT bytes of a stream, then cancels it. Cancels it on any error too. */
async function readLimited(stream: ReadableStream<Uint8Array>) {
  let reader: ReadableStreamDefaultReader<Uint8Array>;
  try {
    reader = stream.getReader();
  } catch (error) {
    stream.cancel().catch(() => {});   // never leave a clone unread: the browser would buffer the whole body
    throw error;
  }
  const decoder = new TextDecoder();
  let text = "";
  let bytes = 0;
  let done = false;
  try {
    while (bytes < BODY_LIMIT) {
      const chunk = await reader.read();
      if (chunk.done) {
        done = true;
        break;
      }
      const part = chunk.value.subarray(0, BODY_LIMIT - bytes);
      bytes += part.byteLength;
      text += decoder.decode(part, { stream: true });
    }
    return { text: text + decoder.decode(), truncated: !done };
  } finally {
    if (!done) reader.cancel().catch(() => {});
  }
}

type Entry = { finish(status: number, getHeader?: (name: string) => string | null): void; body(name: string, text: string): void };

function captureResponse(entry: Entry, response: Response) {
  try {
    if (response.status === 204 || response.status === 304 || !response.body) return entry.body("response-body", "(no content)");
    const type = (response.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const header = response.headers.get("content-length");
    const length = header === null ? null : Number(header);
    if (!isTextType(type) || (length !== null && !(length <= BODY_LIMIT))) {
      return entry.body("response-body", `(${type || "unknown type"}, ${length !== null && Number.isFinite(length) ? sizeOf(length) : "size unknown"})`);
    }
    const clone = response.clone();
    readLimited(clone.body!)
      .then(({ text, truncated }) => entry.body("response-body", display(text, truncated, isJsonType(type))))
      .catch(() => entry.body("response-body", "(body unavailable)"));
  } catch {
    entry.body("response-body", "(body unavailable)");
  }
}

function captureXhrResponse(entry: Entry, xhr: XMLHttpRequest) {
  try {
    if (xhr.status === 0) return entry.body("response-body", "(no response)");
    if (xhr.status === 204 || xhr.status === 304) return entry.body("response-body", "(no content)");
    if (xhr.responseType !== "" && xhr.responseType !== "text") return entry.body("response-body", `(${xhr.responseType}, size unknown)`);
    const type = (xhr.getResponseHeader("content-type") ?? "").split(";")[0].trim().toLowerCase();
    const { text, truncated } = cut(xhr.responseText);
    entry.body("response-body", display(text, truncated, isJsonType(type)));
  } catch {
    entry.body("response-body", "(body unavailable)");
  }
}

function updateRequestsEmptyState() {
  const empty = document.getElementById("requests-empty");
  if (empty) empty.hidden = Boolean(document.querySelector("#requests > li:not([hidden])"));
}

const showDemoRequests = () => (document.getElementById("show-demo-requests") as HTMLInputElement | null)?.checked ?? false;

function startEntry(method: string, url: string, requestHeaders: Record<string, string> = {}): Entry {
  const started = performance.now();
  const u = new URL(url, location.href);
  const demo = isDemoRequest(url, requestHeaders);
  const shown = u.origin === location.origin ? u.pathname + u.search : u.href;
  const headers = REQUEST_HEADERS.filter((h) => requestHeaders[h]).map((h) => `${h.replace(/\b\w/g, (c) => c.toUpperCase())}: ${requestHeaders[h]}`);
  const row = fill("request-row", { method: method.toUpperCase(), url: shown, status: "…", time: "", headers: headers.join(" · ") });
  const list = document.getElementById("requests");
  if (row && list) {
    row.dataset.demo = String(demo);
    row.dataset.state = "pending";
    row.hidden = demo && !showDemoRequests();
    list.prepend(row);
    updateRequestsEmptyState();
  }
  return {
    finish(status, getHeader) {
      const extra = RESPONSE_HEADERS
        .map((h) => [h, getHeader?.(h)] as const)
        .filter(([h, v]) => v && !(h === "content-type" && /json|html/.test(v)) && !(h === "cache-control" && !/max-age=[1-9]/.test(v)))
        .map(([h, v]) => `${h.replace(/(^|-)\w/g, (c) => c.toUpperCase())}: ${v}`);
      if (row) {
        row.querySelector('[data-field="status"]')!.textContent = status === 0 ? "failed" : String(status);
        row.querySelector('[data-field="time"]')!.textContent = `${Math.round(performance.now() - started)} ms`;
        row.querySelector('[data-field="headers"]')!.textContent = [...headers, ...extra].join(" · ");
        row.dataset.state = status >= 100 && status < 400 ? "ok" : "error";
      }
      if (!demo) {
        scheduleStoredRefresh();
        for (const listener of requestListeners) listener({ method: method.toUpperCase(), url: u.pathname + u.search, status });
      }
    },
    /** Write a body slot of the row (only called when bodies are captured). Never throws. */
    body(name, text) {
      try {
        const slot = row?.querySelector(`[data-field="${name}"]`);
        if (slot) slot.textContent = text;
      } catch {
        // the log is optional
      }
    },
  };
}

/** Called after each non-demo request completes with { method, url, status }. Returns a function that stops it. */
export function onRequest(callback: (request: { method: string; url: string; status: number }) => void) {
  requestListeners.add(callback);
  return () => void requestListeners.delete(callback);
}

/** Add a line to the requests log for something that isn't an HTTP request (a WebSocket, a download). */
export function logEvent(method: string, url: string, status: number, getHeader?: (name: string) => string | null) {
  startEntry(method, url, {}).finish(status, getHeader);
}

function installWrappers() {
  const nativeFetch = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = typeof input === "string" || input instanceof URL ? String(input) : input.url;
    const method = init.method ?? (typeof input === "object" && "method" in input ? input.method : "GET");
    const headers = Object.fromEntries(new Headers(init.headers ?? (input instanceof Request ? input.headers : undefined)));
    const entry = startEntry(method, url, headers);
    if (capturesBodies()) {
      try {
        entry.body("request-body", describeRequestBody(init.body, input));
      } catch {
        entry.body("request-body", "(body unavailable)");
      }
    }
    try {
      const response = await nativeFetch(input, init);
      entry.finish(response.status, (h) => response.headers.get(h));
      if (capturesBodies()) captureResponse(entry, response);   // synchronous up to the clone; the reading is detached
      return response;
    } catch (error) {
      entry.finish(0);
      if (capturesBodies()) entry.body("response-body", "(no response)");
      throw error;
    }
  };

  type DemoXhr = XMLHttpRequest & { __demo?: { method: string; url: string; headers: Record<string, string> } };
  const xhrOpen = XMLHttpRequest.prototype.open;
  const xhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
  const xhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (this: DemoXhr, method: string, url: string | URL, ...rest: unknown[]) {
    this.__demo = { method, url: String(url), headers: {} };
    return (xhrOpen as (...args: unknown[]) => void).call(this, method, url, ...rest);
  } as typeof XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.setRequestHeader = function (this: DemoXhr, name: string, value: string) {
    if (this.__demo) this.__demo.headers[name.toLowerCase()] = value;
    return xhrSetHeader.call(this, name, value);
  };
  XMLHttpRequest.prototype.send = function (this: DemoXhr, body?: Document | XMLHttpRequestBodyInit | null) {
    if (this.__demo) {
      const entry = startEntry(this.__demo.method, this.__demo.url, this.__demo.headers);
      if (capturesBodies()) {
        try {
          entry.body("request-body", describeRequestBody(body));
        } catch {
          entry.body("request-body", "(body unavailable)");
        }
      }
      this.addEventListener("loadend", () => {
        entry.finish(this.status, (h) => this.getResponseHeader(h));
        if (capturesBodies()) captureXhrResponse(entry, this);
      }, { once: true });
    }
    return xhrSend.call(this, body);
  };

  const NativeWebSocket = window.WebSocket;
  window.WebSocket = class extends NativeWebSocket {
    constructor(url: string | URL, protocols?: string | string[]) {
      super(url, protocols);
      const shown = String(url).replace(/^wss?:\/\/[^/]+/, "");
      this.addEventListener("open", () => logEvent("WS", shown, 101), { once: true });
      this.addEventListener("close", (e) => logEvent("WS", `${shown} (closed)`, e.code === 1000 || e.code === 1005 ? 200 : 0), { once: true });
    }
  };
}

if (browser) installWrappers();

// ---------------------------------------------------------------------------------------------
// What the server stored: refreshed 300 ms after a non-demo request completes

function scheduleStoredRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refreshStored, 300);
}

/** Extra query parameters for GET /demo/stored/:slug, e.g. { id: 12 } or { key: "support" }. */
export function setStoredQuery(query: Record<string, unknown>) {
  storedQuery = query;
  scheduleStoredRefresh();
}

/** Called with the stored JSON after each refresh, for example-specific checks. Returns a function that stops it. */
export function onStored(callback: (stored: Record<string, unknown>) => void) {
  storedListeners.add(callback);
  return () => void storedListeners.delete(callback);
}

export async function refreshStored() {
  const panel = document.getElementById("stored");
  const { slug } = getPage();
  if (!panel || !slug) return;
  const query = new URLSearchParams(Object.entries(storedQuery)
    .filter(([, v]) => v !== undefined && v !== null && v !== "").map(([k, v]) => [k, String(v)]));
  const response = await fetch(`/demo/stored/${slug}${query.size ? `?${query}` : ""}`);
  if (!response.ok) return;
  const stored = (await response.json()) as Record<string, unknown>;
  panel.replaceChildren(...Object.entries(stored).map(([title, value]) =>
    fill("stored-section", { title, json: typeof value === "string" ? value : JSON.stringify(value, null, 2) })).filter((node) => node !== null));
  const status = document.getElementById("stored-updated");
  if (status) status.textContent = `Updated at ${new Date().toLocaleTimeString()}`;
  for (const listener of storedListeners) listener(stored);
}

// ---------------------------------------------------------------------------------------------
// Notes, the demo-user switch, relay URLs and invite links

/** Show a short message next to the form ("identical: yes", "403 Forbidden"…). kind: info | ok | error */
export function note(text: string, kind: "info" | "ok" | "error" = "info") {
  const list = document.getElementById("notes");
  const item = fill("note", { text });
  if (!list || !item) return;
  item.dataset.kind = kind;
  list.prepend(item);
  list.hidden = false;
}

/** Replace the contents of an element marked data-show="<name>" with text. */
export function show(name: string, text: string) {
  for (const el of document.querySelectorAll(`[data-show="${name}"]`)) el.textContent = text;
}

// The demo user is a cookie (alice, bob or none), so all tabs share it. A page signs in as its
// own user and only some pages offer a switch: each tab sets the cookie back to its user when
// it gets focus, so its requests keep going out as that user.
export const setDemoUser = (key: string) => {
  document.cookie = `demo_user=${key}; path=/; max-age=31536000; samesite=lax`;
};

/** Display name for collaboration: the demo user's name plus a per-window number, so two windows differ. */
const windowNumber = Math.floor(Math.random() * 90) + 10;
export function participantName() {
  return `${getPage().user?.name ?? "Guest"} · ${windowNumber}`;
}

/** The relays: RELAY_URL / EDIT_RELAY_URL, or the page's own origin (the server renders it when they are unset). */
export function relayUrl(relay: "fill" | "edit", path: string) {
  const { relay: relays } = getPage();
  const settings = relay === "edit" ? relays?.edit : relays?.fill;
  const base = settings?.url || `${location.protocol === "https:" ? "wss" : "ws"}://${location.hostname}:${settings?.port}`;
  return base.replace(/\/$/, "") + path;
}

/** The page's own URL; in demo mode with ?join=<sandbox id>, so a collaborator shares this sandbox. */
export function inviteLink() {
  const url = new URL(location.href);
  const { sandboxId } = getPage();
  if (sandboxId) url.searchParams.set("join", sandboxId);
  else url.searchParams.delete("join");
  return url.href;
}

let started = false;

/**
 * Bind the page's own controls and fill the Data panel, once per page (the example layout calls it after hydration;
 * Strict Mode's second effect run finds it started). The listeners live as long as the page.
 */
export function startHost() {
  if (started || !browser) return;
  started = true;
  const page = getPage();

  document.getElementById("show-demo-requests")?.addEventListener("change", (e) => {
    for (const row of document.querySelectorAll<HTMLElement>('#requests [data-demo="true"]')) row.hidden = !(e.target as HTMLInputElement).checked;
    updateRequestsEmptyState();
  });
  document.getElementById("clear-requests")?.addEventListener("click", () => {
    document.getElementById("requests")?.replaceChildren();
    updateRequestsEmptyState();
  });

  // Return from a saved form to the editor that opened it
  document.getElementById("back-to-editor")?.addEventListener("click", (event) => {
    try {
      if (!window.opener || window.opener.closed || window.opener.location.origin !== location.origin) return;
      window.opener.focus();
      window.close();
      event.preventDefault();
    } catch { /* Follow the link if the original editor is no longer accessible */ }
  });

  if (page.demoUser) {
    addEventListener("focus", () => setDemoUser(page.demoUser!));
    addEventListener("pageshow", () => setDemoUser(page.demoUser!));
  }
  document.getElementById("demo-user")?.addEventListener("change", (e) => {
    const select = e.target as HTMLSelectElement;
    setDemoUser(select.value);
    const resetQuery = select.dataset.resetQuery;
    if (!resetQuery) return location.reload();
    const url = new URL(location.href);
    url.searchParams.delete(resetQuery);
    location.assign(url);
  });

  for (const link of document.querySelectorAll<HTMLAnchorElement | HTMLInputElement>("[data-invite-link]")) {
    if (link instanceof HTMLInputElement) link.value = inviteLink();
    else link.href = inviteLink();
  }
  document.querySelector<HTMLElement>("[data-copy-invite]")?.addEventListener("click", async (e) => {
    const link = document.querySelector<HTMLInputElement>("input[data-invite-link]")?.value ?? inviteLink();
    await navigator.clipboard?.writeText(link);
    (e.currentTarget as HTMLElement).dataset.copied = "true";
  });

  void refreshStored();
}
