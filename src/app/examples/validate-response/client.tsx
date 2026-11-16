"use client";
// Validate Responses: the claim form posts to POST /api/responses, which validates the answers against the form
// schema (shared/client/validate-response.js in React). The demo's buttons send tampered answers past the form.
import { getPage, note, setStoredQuery } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { Model, type CompleteEvent } from "survey-core";

/** One entry of the server's errors array (SurveyJS validation errors, serialized). */
type ValidationError = { path?: unknown; text?: string; message?: string; type?: string; locTextValue?: { values?: { default?: string } } };
type Answers = Record<string, unknown>;

export default function ValidateResponse() {
  const [view, setView] = useState<View>(null);
  useMountTask(() => start(setView));
  return <SurveyJsView view={view} />;
}

function start(render: (view: View) => void) {
  const survey = new Model(getPage().definition);
  survey.completeText = "Submit claim";
  render({ survey });
  const startOver = document.getElementById("start-over") as HTMLButtonElement;
  const sampleAnswers = document.getElementById("sample-answers") as HTMLButtonElement;
  const tamperButtons = [...document.querySelectorAll<HTMLButtonElement>("[data-tamper]")];
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-tamper], #sample-answers")];
  const valid: Answers = { customer_email: "ann@example.com", amount: 120, incident: "theft", details: "My bicycle was stolen from the garage" };
  const tampered: Record<string, Answers> = {
    "unknown-choice": { ...valid, incident: "meteor" },
    "wrong-type": { ...valid, amount: { much: true } },
    "missing-required": { amount: 120, incident: "theft" },
  };

  function describe(error: ValidationError) {
    const path = String(error.path ?? "").replace(/^\$\.?/, "");
    const question = survey.getAllQuestions().find(q => q.name === path || q.valueName === path);
    const detail = error.text || error.message || error.locTextValue?.values?.default || error.type || "Invalid answer";
    return `${question ? `${question.title}: ` : path ? `${path}: ` : ""}${detail}`;
  }
  function lock(locked: boolean) {
    for (const button of buttons) button.disabled = locked;
    startOver.disabled = locked;
  }

  // #region sjs:validate-response.request
  // Inspect the submitted payload and the server's validation errors in Requests
  async function submit(data: Answers) {
    const payload = { formId: "claim", data };
    const response = await fetch("/api/responses", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload)
    });
    const report = await response.json();
    if (response.status === 400 && Array.isArray(report.errors) && report.errors.length) {
      return { rejected: true, errors: report.errors as ValidationError[] };
    }
    if (!response.ok) throw new Error(report.error || "Couldn't validate the response. Please try again.");
    if (!Number.isInteger(report.id) || report.id < 1) throw new Error("The server didn't confirm a saved response. Please try again.");
    setStoredQuery({ id: report.id });
    return { id: report.id as number };
  }
  // #endregion

  // #region sjs:validate-response.client
  // Confirm a save only after the backend accepts the answers and returns a response ID
  const save = async (sender: Model, options: CompleteEvent) => {
    lock(true);
    sender.completedHtml = "<h3>Submitting your claim...</h3>";
    options.showSaveInProgress();
    try {
      const result = await submit(sender.data);
      if (result.rejected) throw new Error(result.errors.map(describe).join("; "));
      sender.completedHtml = `<h3>Your claim has been saved.</h3><p>Response ID: ${result.id}</p>`;
      options.showSaveSuccess();
    } catch (error) {
      sender.completedHtml = "<h3>Your claim hasn't been saved.</h3>";
      const message = error instanceof TypeError ? "Couldn't validate the response. Please try again." : (error as Error).message;
      options.showSaveError(message);
    } finally { lock(false); }
  };
  survey.onComplete.add(save);
  // #endregion

  const useSample = () => {
    survey.clear(true, true);
    survey.data = valid;
  };
  sampleAnswers.addEventListener("click", useSample);
  const restart = () => {
    survey.notifier.active = false;
    survey.clear(true, true);
    setStoredQuery({});
  };
  startOver.addEventListener("click", restart);
  const sendTampered = async (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    lock(true);
    try {
      const result = await submit(tampered[button.dataset.tamper!]);
      note(result.rejected ? "Invalid response rejected as expected. No data was saved."
        : `Invalid response was accepted and saved as #${result.id}.`, result.rejected ? "ok" : "error");
    } catch (error) {
      const message = error instanceof TypeError ? "Couldn't validate the response. Please try again." : (error as Error).message;
      note(message, "error");
    } finally { lock(false); }
  };
  for (const button of tamperButtons) button.addEventListener("click", sendTampered);

  return () => {
    survey.onComplete.remove(save);
    sampleAnswers.removeEventListener("click", useSample);
    startOver.removeEventListener("click", restart);
    for (const button of tamperButtons) button.removeEventListener("click", sendTampered);
  };
}
