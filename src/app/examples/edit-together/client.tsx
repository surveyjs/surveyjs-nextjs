"use client";
// Edit Forms Together: Survey Creator with the collaboration plugin, synchronized through the edit relay's room for
// the form (shared/client/edit-together.js in React). The schema saves separately from the room's edit log.
import { getPage, inviteLink, participantName, relayUrl, setStoredQuery } from "@/demo/host";   // first: the requests log wraps fetch and WebSocket before the example runs
import "@/styles/creator.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { createSchemaSaver, responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { CollaborationPlugin, type IJournalRecord, type IPresencePeerEntry } from "survey-creator-core/collaboration";
import { SurveyCreator } from "survey-creator-react";

type InitMessage = { type: "init"; clientId: string; seed: Record<string, unknown>; log: IJournalRecord[] };
type RelayMessage = InitMessage
  | { type: "record"; payload: IJournalRecord }
  | { type: "presence-sync"; peers: IPresencePeerEntry[] }
  | { type: "presence"; peer: IPresencePeerEntry }
  | { type: "presence-leave"; clientId: string };

export default function EditTogether() {
  // A reconnect builds a new Creator: the key mounts a fresh component for it
  const [state, setState] = useState<{ view: View; key: number }>({ view: null, key: 0 });
  useMountTask(() => start((view) => setState((current) => ({ view, key: current.key + 1 }))));
  return <SurveyJsView key={state.key} view={state.view} />;
}

function start(render: (view: View) => void) {
  const page = getPage();
  const formId = (page.formId as string | undefined) ?? "support-team";
  const userName = participantName();
  const editor = document.getElementById("creator")!;
  const reconnect = document.getElementById("reconnect")!;
  const retrySave = document.getElementById("retry-save") as HTMLButtonElement;
  const download = document.getElementById("download-local")!;
  const formSelector = document.getElementById("shared-form") as HTMLSelectElement;
  const errorMessage = document.getElementById("creator-error")!;
  // Every listener below goes when the component unmounts: the WebSocket's, the page's and the controls'
  const listeners = new AbortController();
  const { signal } = listeners;
  let ws: WebSocket | undefined;
  let creator!: SurveyCreator;
  let collab!: CollaborationPlugin;
  let saver!: ReturnType<typeof createSchemaSaver>;
  let localCopy: unknown;
  let ready = false;
  setStoredQuery({ room: formId, key: formId });

  function sharedFormLink() {
    const url = new URL(inviteLink());
    url.searchParams.set("form", formId);
    return url.href;
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-invite-link]")) link.href = sharedFormLink();
  // The form picker (#shared-form) navigates through the page's inline script, bound before hydration

  function showError(message: string | null) {
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
  }

  function connected() { return ready && ws?.readyState === WebSocket.OPEN; }
  function send(message: object) { if (connected()) ws!.send(JSON.stringify(message)); }

  // #region sjs:edit-together.save
  // Save the synchronized schema separately from the room's temporary edit log
  function configureSaving() {
    saver = createSchemaSaver(() => creator.JSON, async json => {
      if (!connected()) throw new Error("Reconnect before saving the shared form.");
      const response = await fetch(`/api/forms/${formId}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: json
      });
      if (!response.ok) throw await responseError(response, "Couldn't save the form schema. Please try again.");
    }, ({ state, error }) => {
      showError(state === "error" ? error : "");
      retrySave.hidden = state !== "error";
      formSelector.disabled = state === "saving";
    });
    creator.saveSurveyFunc = async (saveNo: number, callback: (saveNo: number, success: boolean) => void) => {
      const saved = await saver.save();
      callback(saveNo, saved);
      // Creator says "not saved" in the callback; show the server's reason after it
      if (!saved) creator.notify(saver.error ?? "", "error");
    };
    creator.onModified.add(() => { if (ready && !collab.isApplying) saver.changed(); });
  }
  // #endregion

  // #region sjs:edit-together.client
  // Rebuild the shared form from its saved schema and ordered edit log
  function initialize(message: InitMessage) {
    creator?.dispose();
    creator = new SurveyCreator({ showTranslationTab: true });
    creator.JSON = message.seed;
    collab = new CollaborationPlugin(creator, { roomId: formId, getInviteLink: sharedFormLink });
    creator.addPlugin("collaboration", collab);
    collab.setClientId(message.clientId);
    configureSaving();
    saver.markSaved();
    if (message.log.length) collab.apply(message.log);
    const append = (_: unknown, { record }: { record: IJournalRecord }) => send({ type: "append", payload: record });
    collab.onRecordAdded.add(append);
    collab.onRecordChanged.add(append);
    collab.onStateChanged.add(() => send({ type: "presence", state: collab.getState() }));
  }
  // #endregion

  // Demo only: Show Version History lists the room's log and this window's edits, one entry per
  // change: a record that updates an earlier change (same seq, op and target) replaces it
  function trackHistory(log: IJournalRecord[]) {
    const history = new Map<string, IJournalRecord>();
    function addHistory(records: IJournalRecord[]) {
      for (const record of records) history.set(`${record.seq}:${record.op}:${(record.payload as { target?: string } | undefined)?.target ?? ""}`, record);
      collab.setHistory([...history.values()]);
    }
    addHistory(log);
    const local = (_: unknown, { record }: { record: IJournalRecord }) => addHistory([record]);
    collab.onRecordAdded.add(local);
    collab.onRecordChanged.add(local);
    return addHistory;
  }

  function connect() {
    if (ws && [WebSocket.CONNECTING, WebSocket.OPEN].includes(ws.readyState as 0 | 1)) return;
    ready = false;
    editor.inert = true;
    reconnect.hidden = true;
    retrySave.disabled = true;
    showError("");
    collab?.setStatus("connecting");
    const socket = ws = new WebSocket(relayUrl("edit", `/ws/forms/${formId}?name=${encodeURIComponent(userName)}`));
    let addHistory: (records: IJournalRecord[]) => void = () => {};
    socket.addEventListener("message", event => {
      const message = JSON.parse(event.data) as RelayMessage;
      if (message.type === "init") {
        initialize(message);
        addHistory = trackHistory(message.log);
        ready = true;
        saver.changed();
        if (saver.dirty) creator.setModified({ type: "COLLABORATION" });
        render({ creator });
        editor.hidden = false;
        editor.inert = false;
        retrySave.disabled = false;
        collab.setStatus("connected");
        send({ type: "presence", state: collab.getState() });
      } else if (ready) {
        if (message.type === "record") { collab.apply(message.payload); addHistory([message.payload]); saver.changed(); creator.setModified({ type: "COLLABORATION" }); }
        if (message.type === "presence-sync") collab.setPeers(message.peers);
        if (message.type === "presence") collab.upsertPeer(message.peer);
        if (message.type === "presence-leave") collab.removePeer(message.clientId);
      }
    }, { signal });
    socket.addEventListener("close", () => {
      ready = false;
      editor.inert = true;
      retrySave.disabled = true;
      if (creator) { localCopy = structuredClone(creator.JSON); download.hidden = false; }
      collab?.clearPeers();
      collab?.setStatus("closed");
      reconnect.hidden = !page.user?.isEditor;
      showError(page.user?.isEditor
        ? "Disconnected. Reconnect to load the current shared form. Download a local copy to keep this window's edits."
        : "Editor access is required to join this session.");
    }, { signal });
  }
  retrySave.addEventListener("click", () => creator.saveSurvey(), { signal });
  reconnect.addEventListener("click", connect, { signal });
  download.addEventListener("click", () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(localCopy, null, 2)], { type: "application/json" }));
    const link = Object.assign(document.createElement("a"), { href: url, download: "shared-form-local-copy.json" });
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }, { signal });
  window.addEventListener("pagehide", () => ws?.close(), { signal });
  connect();

  return () => {
    listeners.abort();   // first, so closing the socket below doesn't report a disconnect
    ws?.close();
    creator?.dispose();
  };
}
