"use client";
// Use Relational Storage: the v1 or v2 definition with its dbColumn metadata, saved to POST /api/claims
// (shared/client/relational-storage.js in React). The demo fills the mapping table and confirms the stored columns.
import { fill, getPage, note, onStored, setStoredQuery, show } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import type { CompleteEvent } from "survey-core";

type Version = "v1" | "v2";
type Definitions = Record<Version, Record<string, unknown> | undefined>;
type SaveClaim = (data: Record<string, unknown>, definitionVersion: Version) => Promise<{ id?: unknown } | null>;

// #region sjs:relational-storage.client
import { Model, Serializer } from "survey-core";

// Optional metadata describing the columns used by the server
Serializer.addProperty("question", { name: "dbColumn", category: "data" });

// Keep answer keys stable when question names change
function createSurvey(definitions: Definitions, definitionVersion: Version) {
  const survey = new Model(definitions[definitionVersion]);
  survey.completeText = "Submit claim";
  return survey;
}
// #endregion

// #region sjs:relational-storage.save
const saveClaim: SaveClaim = async function saveClaim(data, definitionVersion) {
  const response = await fetch("/api/claims", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, definitionVersion })
  });
  if (!response.ok) throw new Error("Save failed");
  return response.json();
};
// #endregion

export default function RelationalStorage() {
  const [view, setView] = useState<View>(null);
  useMountTask(() => start(setView));
  return <SurveyJsView view={view} />;
}

type StoredClaim = { response_id: number; customer_email: unknown; amount: unknown };
type StoredResponse = { id: number; definition_version: string };

function start(render: (view: View) => void) {
  const page = getPage();
  const definitionVersion: Version = new URLSearchParams(location.search).get("version") === "v2" ? "v2" : "v1";
  const definitions: Definitions = { v1: page.definition, v2: page.definitionV2 };
  let responseId: number | null = null;
  let awaitingReadback = false;
  const survey = createSurvey(definitions, definitionVersion);

  // Confirm the saved response ID before reporting that its columns were populated
  const save = async (sender: Model, options: CompleteEvent) => {
    responseId = null;
    awaitingReadback = false;
    sender.completedHtml = "<h3>Saving your claim...</h3>";
    options.showSaveInProgress();
    try {
      const result = await saveClaim(sender.data, definitionVersion);
      const id = result?.id;
      if (typeof id !== "number" || !Number.isInteger(id) || id < 1) throw new Error("Save failed");
      responseId = id;
      awaitingReadback = true;
      setStoredQuery({ id: responseId });
      sender.completedHtml = `<h3>Your claim has been saved.</h3><p>Response ID: ${responseId}</p>`;
      options.showSaveSuccess();
    } catch {
      sender.completedHtml = "<h3>Your claim hasn't been saved.</h3>";
      options.showSaveError("We couldn't save your claim. Please try again.");
    }
  };
  survey.onComplete.add(save);
  render({ survey });

  // Demo only: show the mapping directly from the selected definition
  const mapping = document.getElementById("mapping-rows")!;
  mapping.replaceChildren(...survey.getAllQuestions().filter(question => question.valueName)
    .map(question => fill("mapping-row", { question: question.name, "value-name": question.valueName, column: question.dbColumn }))
    .filter(row => row !== null));

  // Confirm only the response and claim returned for this successful submission
  const stopStored = onStored((stored) => {
    const claim = (stored.claims as StoredClaim[] | undefined)?.find(row => row.response_id === responseId);
    const response = (stored.responses as StoredResponse[] | undefined)?.find(row => row.id === responseId);
    if (!awaitingReadback || !claim || !response) return;
    awaitingReadback = false;
    const message = `Response #${response.id} (${response.definition_version}) saved. Database columns: customer_email = ${claim.customer_email}, amount = ${claim.amount}.`;
    show("mapping-status", message);
    note(message, "ok");
  });

  const startOver = document.getElementById("start-over") as HTMLButtonElement;
  const links = [...document.querySelectorAll<HTMLAnchorElement>("[data-definition-version]")];
  survey.registerPropertyChangedHandlers(["completedState"], () => {
    startOver.disabled = survey.completedState === "saving";
    for (const link of links) link.setAttribute("aria-disabled", String(startOver.disabled));
  }, "demo");
  const holdWhileSaving = (event: Event) => { if (survey.completedState === "saving") event.preventDefault(); };
  for (const link of links) link.addEventListener("click", holdWhileSaving);
  const restart = () => {
    responseId = null;
    awaitingReadback = false;
    survey.clear(true, true);
    survey.notifier.active = false;
    setStoredQuery({});
    show("mapping-status", "");
  };
  startOver.addEventListener("click", restart);

  return () => {
    survey.onComplete.remove(save);
    stopStored();
    survey.unregisterPropertyChangedHandlers(["completedState"], "demo");
    for (const link of links) link.removeEventListener("click", holdWhileSaving);
    startOver.removeEventListener("click", restart);
    mapping.replaceChildren();
  };
}
