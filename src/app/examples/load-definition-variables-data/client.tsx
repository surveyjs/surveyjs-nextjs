"use client";
// Load JSON Schemas, Variables, and Answers: the form from the page (Option A) or from the API (Option B)
// (shared/client/load-definition-variables-data.js in React), and the demo's save and read-outs.
import { note, onStored, setStoredQuery } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import { useMountTask } from "@/lib/use-mount-task";
import dynamic from "next/dynamic";
import { useState } from "react";
import { Model } from "survey-core";

const Survey = dynamic(() => import("survey-react-ui").then((m) => m.Survey), { ssr: false });

declare global {
  interface Window {
    FORM_DEFINITION?: Record<string, unknown>;
    FORM_VARIABLES?: Record<string, unknown>;
  }
}

// #region sjs:load-definition-variables-data.client
async function createSurvey(recordId: string) {
  if (window.FORM_DEFINITION) {
    // Option A: Use the schema and user variables embedded in the HTML response
    const survey = new Model(window.FORM_DEFINITION);
    survey.setVariables(window.FORM_VARIABLES ?? {});
    return survey;
  }
  // Option B: Load the definition, variables, and previous answers in one request
  const { definition, variables, data } =
    await fetch(`/api/forms/claim-request?record=${encodeURIComponent(recordId)}`).then(r => r.json());
  const survey = new Model(definition);
  survey.setVariables(variables);   // Variables are available in expressions such as {user.name} and are excluded from survey.data
  survey.data = data;               // Restore previously saved answers for editing
  return survey;
}
// #endregion

export default function LoadDefinitionVariablesData() {
  const [survey, setSurvey] = useState<Model | null>(null);
  useMountTask(async (active) => {
    const recordId = new URLSearchParams(location.search).get("record") ?? "";
    const created = await createSurvey(recordId);
    if (!active()) return;
    setSurvey(created);
    return demo(created);
  });
  return survey && <Survey model={survey} />;
}

/** Demo only: the save (Save Responses has it), the note that variables weren't stored, and Start over. */
function demo(survey: Model) {
  // Saving the finished response is in save-response: post survey.data, which holds answers only
  let savedResponseId: number | null = null;
  const save = async (sender: Model, options: { showSaveInProgress(text?: string): void; showSaveSuccess(text?: string): void; showSaveError(text?: string): void }) => {
    savedResponseId = null;
    sender.completedHtml = "<h3>Submitting your claim...</h3>";
    options.showSaveInProgress("Submitting your claim...");
    try {
      const response = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: "claim", data: sender.data })
      });
      if (!response.ok) throw new Error("Save failed");
      const { id } = await response.json();
      if (!Number.isInteger(id) || id < 1) throw new Error("Missing response ID");
      savedResponseId = id;
      setStoredQuery({ id });
      sender.completedHtml = `<h3>Your claim has been submitted.</h3><p>Response ID: ${id}</p>`;
      options.showSaveSuccess();
    } catch {
      sender.completedHtml = "<h3>Your claim hasn't been submitted.</h3>";
      options.showSaveError("Couldn't save the response. Please try again.");
    }
  };
  survey.onComplete.add(save);

  // Show that the stored response carries no variables
  const stopStored = onStored((stored) => {
    const row = (stored.responses as { id: number; data: Record<string, unknown> | null }[] | undefined)?.find((response) => response.id === savedResponseId);
    if (!row) return;
    savedResponseId = null;
    const keys = Object.keys(row.data ?? {});
    const leaked = keys.filter((key) => ["user", "plan", "variables"].includes(key));
    note(leaked.length
      ? `Response #${row.id} contains ${leaked.join(", ")}: variables were saved.`
      : `Response #${row.id} saved. Only submitted answers were stored; form variables were excluded.`, leaked.length ? "error" : "ok");
  });

  const startOver = document.getElementById("start-over") as HTMLButtonElement | null;
  survey.registerPropertyChangedHandlers(["completedState"], () => {
    if (startOver) startOver.disabled = survey.completedState === "saving";
  }, "demo");
  const restart = () => {
    savedResponseId = null;
    setStoredQuery({});
    survey.notifier.active = false;
    survey.clear(true, true);
    const records = document.getElementById("record") as HTMLSelectElement | null;
    if (records) records.value = "";
    const url = new URL(location.href);
    url.searchParams.delete("record");
    history.replaceState(history.state, "", url);
  };
  startOver?.addEventListener("click", restart);

  return () => {
    survey.onComplete.remove(save);
    stopStored();
    survey.unregisterPropertyChangedHandlers(["completedState"], "demo");
    startOver?.removeEventListener("click", restart);
  };
}
