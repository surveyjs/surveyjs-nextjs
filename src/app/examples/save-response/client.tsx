"use client";
// Save Responses: the form and its save call (shared/client/save-response.js in React), and the demo's read-outs.
import { note, onStored, show } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { Model } from "survey-core";

// The form renders in the browser only: SurveyJS numbers its elements as it creates them
const Survey = dynamic(() => import("survey-react-ui").then((m) => m.Survey), { ssr: false });

// #region sjs:save-response.client
const definition = {   // Define the form directly in the page - no database needed
  title: "Contact us", completeText: "Send message",
  elements: [
    { type: "text", name: "email", title: "Your email", inputType: "email", isRequired: true },
    { type: "comment", name: "message", title: "How can we help?", isRequired: true }
  ]
};
function createSurvey() {
  const survey = new Model(definition);
  // Save after completion; SurveyJS offers a retry action if saving fails
  survey.onComplete.add(async (sender, options) => {
    try {
      const response = await fetch("/api/responses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: "contact", data: sender.data })
      });
      const { id } = response.ok ? await response.json() : {};
      if (!Number.isInteger(id) || id < 1) throw new Error("Missing response ID");
      sender.setVariable("responseId", id);
      options.showSaveSuccess();
    } catch { options.showSaveError("We couldn't save your message. Please try again."); }
  });
  return survey;
}
// #endregion

export default function SaveResponse() {
  const [survey] = useState(createSurvey);   // one model per mount, never per render
  useEffect(() => demo(survey), [survey]);
  return <Survey model={survey} />;
}

/** Demo only: the completion screen while the message is sent, after it is saved and when saving fails; the Data check; Start over. */
function demo(survey: Model) {
  const sending = (sender: Model, options: { showSaveInProgress: (text?: string) => void }) => {
    sender.setVariable("responseId", null);
    sender.completedHtml = "<h3>Sending your message...</h3>";
    options.showSaveInProgress("Sending your message...");
  };
  survey.onComplete.add(sending);
  const completedHtml: Record<string, () => string> = {
    success: () => `<h3>Your message has been saved.</h3><p>Response ID: ${survey.getVariable("responseId")}</p>`,
    error: () => "<h3>Your message hasn't been saved.</h3>",
  };

  // Compare the posted body with what the server stored
  let posted: { formId: string; data: unknown } | null = null;
  const remember = (sender: Model) => {
    posted = { formId: "contact", data: sender.data };
    show("posted", JSON.stringify(posted, null, 2));
  };
  survey.onComplete.add(remember);
  const stopStored = onStored((stored) => {
    const row = (stored.responses as { id: number; data: unknown }[] | undefined)?.find((r) => r.id === survey.getVariable("responseId"));
    if (!posted || !row) return;
    const identical = JSON.stringify(row.data) === JSON.stringify(posted.data);
    show("identical", identical ? "identical ✓" : "different ✗");
    note(identical
      ? `Response #${row.id}: the server saved the submitted data without changes.`
      : `Response #${row.id}: the stored data differs from the posted data.`, identical ? "ok" : "error");
    posted = null;
  });

  const startOver = document.getElementById("start-over") as HTMLButtonElement | null;
  survey.registerPropertyChangedHandlers(["completedState"], () => {
    if (completedHtml[survey.completedState]) survey.completedHtml = completedHtml[survey.completedState]();
    if (startOver) startOver.disabled = survey.completedState === "saving";
  }, "demo");
  const restart = () => {
    posted = null;
    survey.notifier.active = false;
    survey.clear(true, true);
  };
  startOver?.addEventListener("click", restart);

  return () => {
    survey.onComplete.remove(sending);
    survey.onComplete.remove(remember);
    stopStored();
    survey.unregisterPropertyChangedHandlers(["completedState"], "demo");
    startOver?.removeEventListener("click", restart);
  };
}
