"use client";
// Fill Forms Together: the shared job sheet over the fill relay's WebSocket (shared/client/fill-together.js in React).
// The plugin syncs answers and presence; the relay saves one response per session and confirms it to everyone.
import { getPage, inviteLink, note, relayUrl, setStoredQuery, show } from "@/demo/host";   // first: the requests log wraps fetch and WebSocket before the example runs
import "@/styles/form.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { Model, type CompleteEvent } from "survey-core";
import { CollaborationPlugin, type ICollabIn, type IInitMessage, type IPresencePeerEntry } from "survey-core/collaboration";

/** What the relay sends when a participant joins: the plugin's init message plus the room's seed, session and saved response */
type InitMessage = IInitMessage & {
  seed: Record<string, unknown>;
  sessionId: string;
  responseId: number | null;
  values: Record<string, unknown>;
  peers: IPresencePeerEntry[];
};
type RelayMessage = InitMessage
  | { type: "completed"; id: number; data: Record<string, unknown> }
  | { type: "save-error"; error: string }
  | Exclude<ICollabIn, IInitMessage>;

export default function FillTogether() {
  const [view, setView] = useState<View>(null);
  useMountTask(() => start(setView));
  return <SurveyJsView view={view} />;
}

function start(render: (view: View) => void) {
  const page = getPage();
  const params = new URLSearchParams(location.search);
  const recordId = params.get("record") ?? String(page.record ?? "new");
  const role = params.get("role") === "technician" ? "Technician" : "Dispatcher";
  const userName = `${role} (${page.user?.name ?? "Guest"})`;
  let ws!: WebSocket;
  let survey!: Model;
  let collab: CollaborationPlugin | undefined;
  let sessionId: string | undefined;
  let saveOptions: CompleteEvent | null = null;
  let completionOptions: CompleteEvent | undefined;
  let responseId: number | null = null;
  let ready = false;
  const reconnect = document.getElementById("reconnect") as HTMLButtonElement;
  const form = document.getElementById("form")!;
  const roleSelect = document.getElementById("participant-role") as HTMLSelectElement;
  const recordSelect = document.getElementById("record") as HTMLSelectElement;

  function partnerLink() {
    const url = new URL(inviteLink());
    url.searchParams.set("record", recordId);
    url.searchParams.set("role", role === "Dispatcher" ? "technician" : "dispatcher");
    return url.href;
  }
  for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-invite-link]")) {
    link.href = partnerLink();
  }
  roleSelect.value = role.toLowerCase();
  setStoredQuery({ room: recordId });

  function setLocked(locked: boolean) {
    form.inert = locked;
    form.setAttribute("aria-busy", String(locked));
    for (const select of [recordSelect, roleSelect]) select.disabled = locked;
  }
  function status(message: string, error = false) {
    show("connection-status", message);
    reconnect.hidden = !error;
    reconnect.disabled = false;
  }
  function confirmCompletion(id: number, data: Record<string, unknown>) {
    if (!Number.isInteger(id) || id < 1 || !survey) return;
    responseId = id;
    saveOptions = null;
    survey.data = data;
    if (survey.state !== "completed") survey.doComplete();
    else {
      survey.completedHtml = `<h3>The job sheet has been saved.</h3><p>Response ID: ${id}</p>`;
      completionOptions?.showSaveSuccess();
    }
    setLocked(false);
    setStoredQuery({ room: recordId, id });
    status(`Job sheet saved as response #${id}. Everyone in this session sees the same confirmation.`);
  }

  // #region sjs:fill-together.save
  // Ask the relay to save once and confirm the result to every participant
  function completeJobSheet(sender: Model, options: CompleteEvent) {
    completionOptions = options;
    if (responseId !== null) {
      sender.completedHtml = `<h3>The job sheet has been saved.</h3><p>Response ID: ${responseId}</p>`;
      return options.showSaveSuccess();
    }
    if (!ready || ws.readyState !== WebSocket.OPEN) {
      sender.completedHtml = "<h3>The job sheet hasn't been saved.</h3>";
      return options.showSaveError("Reconnect to the shared session, then try again.");
    }
    sender.completedHtml = "<h3>Saving the job sheet...</h3>";
    options.showSaveInProgress();
    saveOptions = options;
    setLocked(true);
    ws.send(JSON.stringify({ type: "complete", data: sender.data }));
  }
  // #endregion

  // #region sjs:fill-together.client
  // Transport the plugin's answer and presence messages over a WebSocket
  function applySharedState(message: InitMessage) {
    const draft = survey?.data;
    const previousSession = sessionId;
    if (!collab) {
      survey = new Model(message.seed);
      survey.completeText = "Finish job sheet";
      collab = new CollaborationPlugin(survey, { getInviteLink: partnerLink });
      collab.onEvent.add((_, { message }) => {
        if (ready && responseId === null && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message));
      });
      survey.onComplete.add(completeJobSheet);
      render({ survey });
    }
    sessionId = message.sessionId;
    ready = true;
    collab.apply(message);
    // Restore the local draft if an empty session replaces the disconnected one
    if (previousSession && previousSession !== sessionId && !message.responseId && !message.peers.length) survey.data = draft;
    form.hidden = false;
    document.getElementById("collaboration-loading")!.hidden = true;
    setLocked(false);
    if (message.responseId) confirmCompletion(message.responseId, message.values);
  }
  // #endregion

  const received = (event: MessageEvent<string>) => {
    const message = JSON.parse(event.data) as RelayMessage;
    if (message.type === "init") {
      applySharedState(message);
      if (!responseId) status(`Connected as ${role}. Answers are shared live until someone finishes the job sheet.`);
    } else if (message.type === "completed") {
      confirmCompletion(message.id, message.data);
    } else if (message.type === "save-error") {
      survey.completedHtml = "<h3>The job sheet hasn't been saved.</h3>";
      saveOptions?.showSaveError(message.error);
      saveOptions = null;
      setLocked(false);
      status(message.error);
    } else collab?.apply(message);
  };
  const closed = () => {
    ready = false;
    if (responseId) return;
    setLocked(true);
    collab?.apply({ type: "status", status: "closed" });
    if (saveOptions) {
      survey.completedHtml = "<h3>The job sheet hasn't been saved.</h3>";
      saveOptions.showSaveError("The connection was lost. Reconnect, then try again.");
      saveOptions = null;
    }
    status("Couldn't connect to the shared session. Check that the collaboration relay is running, then reconnect.", true);
    note("Collaboration disconnected. Reconnect to continue.", "error");
  };
  function connect() {
    if (ws && ([WebSocket.CONNECTING, WebSocket.OPEN] as number[]).includes(ws.readyState)) return;
    ready = false;
    setLocked(true);
    status("Connecting to the shared job sheet...");
    reconnect.disabled = true;
    collab?.apply({ type: "status", status: "connecting" });
    ws = new WebSocket(relayUrl("fill", `/ws/rooms/${encodeURIComponent(recordId)}?name=${encodeURIComponent(userName)}`));
    ws.addEventListener("message", received);
    ws.addEventListener("close", closed);
  }
  const changeRole = () => {
    const url = new URL(location.href);
    url.searchParams.set("role", roleSelect.value);
    location.assign(url);
  };
  const changeRecord = () => {
    const url = new URL(location.href);
    url.searchParams.set("record", recordSelect.value || `new-${crypto.randomUUID()}`);
    location.assign(url);
  };
  reconnect.addEventListener("click", connect);
  roleSelect.addEventListener("change", changeRole);
  recordSelect.addEventListener("change", changeRecord);
  connect();

  return () => {
    reconnect.removeEventListener("click", connect);
    roleSelect.removeEventListener("change", changeRole);
    recordSelect.removeEventListener("change", changeRecord);
    ws.removeEventListener("message", received);
    ws.removeEventListener("close", closed);
    ws.close();
    survey?.onComplete.remove(completeJobSheet);
    collab?.onEvent.clear();
    collab?.dispose();
  };
}
