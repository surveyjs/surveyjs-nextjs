"use client";
// Load Choices from Web: choicesByUrl loads the office and country lists, with an auth header on every request
// (shared/client/choices-from-web.js in React), then the answers are saved as in Save Responses.
import { setStoredQuery } from "@/demo/host";   // first: the requests log wraps fetch and XHR before the example runs
import "@/styles/form.css";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { Model, type CompleteEvent, type ValueChangedEvent } from "survey-core";
import { Survey } from "survey-react-ui";

// Demo only: a stand-in for the access token your app already has
const token = "demo-token";

// #region sjs:choices-from-web.client
// Use choicesByUrl in the form definition to load lists from API endpoints
//   "choicesByUrl": { "url": "/api/offices?region={region}", "valueName": "id", "titleName": "name" }
//   "choicesByUrl": { "url": "/api/countries", "valueName": "code", "titleName": "name" }
// SurveyJS replaces {region} with the selected region and reloads the office list when the region changes

// Optional: add your auth header to every choices request
import { settings } from "survey-core";
settings.web.onBeforeRequestChoices = (_, options) => {
  options.request?.setRequestHeader("Authorization", `Bearer ${token}`);
};
// #endregion

export default function ChoicesFromWeb({ definition }: { definition: Record<string, unknown> }) {
  const [survey] = useState(() => new Model(definition));   // one model per mount, never per render; the server renders it too
  useMountTask(() => start(survey));
  return <Survey model={survey} />;
}

function start(survey: Model) {
  // Clear the previous selection immediately, before the new office list arrives
  const clearOffice = (sender: Model, { name }: ValueChangedEvent) => {
    if (name === "region") sender.clearValue("office");
  };
  survey.onValueChanged.add(clearOffice);

  // Save the selected values when the respondent completes the form
  const save = async (sender: Model, options: CompleteEvent) => {
    sender.completedHtml = "<h3>Saving your response...</h3>";
    options.showSaveInProgress();
    try {
      const response = await fetch("/api/responses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId: "visit", data: sender.data })
      });
      if (!response.ok) throw new Error("Save failed");
      const { id } = await response.json();
      if (!Number.isInteger(id) || id < 1) throw new Error("Missing response ID");
      setStoredQuery({ id });
      sender.completedHtml = `<h3>Your response has been saved.</h3><p>Response ID: ${id}</p><p>Open <strong>Data</strong> to inspect the saved answers.</p>`;
      options.showSaveSuccess();
    } catch {
      sender.completedHtml = "<h3>Your response hasn't been saved.</h3>";
      options.showSaveError("We couldn't save your response. Please try again.");
    }
  };
  survey.onComplete.add(save);

  const startOver = document.getElementById("start-over") as HTMLButtonElement;
  survey.registerPropertyChangedHandlers(["completedState"], () => {
    startOver.disabled = survey.completedState === "saving";
  }, "demo");
  const restart = () => {
    survey.notifier.active = false;
    survey.clear(true, true);
    setStoredQuery({});
  };
  startOver.addEventListener("click", restart);

  return () => {
    survey.onValueChanged.remove(clearOffice);
    survey.onComplete.remove(save);
    survey.unregisterPropertyChangedHandlers(["completedState"], "demo");
    startOver.removeEventListener("click", restart);
  };
}
