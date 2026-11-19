"use client";
// Translate with AI: Survey Creator's Translations tab asks the backend to machine-translate its strings
// (shared/client/ai-translation.js in React), and the translated schema saves automatically.
import { note } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/creator.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { SurveyCreator } from "survey-creator-react";
import { createSchemaSaver, responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import "survey-core/i18n";

export default function AiTranslation() {
  const [view, setView] = useState<View>(null);
  useMountTask(() => start(setView));
  return <SurveyJsView view={view} />;
}

async function start(render: (view: View) => void) {
  const formId = "support-translations";
  const creator = new SurveyCreator({ showTranslationTab: true, showLogicTab: false });
  const element = document.getElementById("creator")!;
  const retryLoad = document.getElementById("retry-load")!;
  const errorMessage = document.getElementById("creator-error")!;
  let loaded = false, saving = false;

  const saver = createSchemaSaver(() => creator.JSON, async json => {
    const response = await fetch(`/api/forms/${formId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: json });
    if (!response.ok) throw await responseError(response, "Couldn't save the translations. Please try again.");
  }, ({ state, error }) => {
    if (!loaded) return;
    saving = state === "saving";
    showError(state === "error" ? `${error} Your translations remain in the editor.` : "");
    updateControls();
  });
  creator.saveSurveyFunc = (saveNo: number, callback: (saveNo: number, success: boolean) => void) => saver.save().then(saved => {
    callback(saveNo, saved);
    // Creator says "not saved" in the callback; show the server's reason after it
    if (!saved) creator.notify(saver.error ?? "", "error");
  });
  const modified = () => { if (loaded) saver.changed(); };
  creator.onModified.add(modified);

  // #region sjs:ai-translation.client
  // Return translated strings in the original order, and always finish the callback
  creator.onMachineTranslate.add(async (_, options) => {
    showError("");
    try {
      const response = await fetch("/api/translate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ strings: options.strings, from: options.fromLocale, to: options.toLocale })
      });
      if (!response.ok) throw await responseError(response, "AI translation failed. Please try again.");
      const strings: unknown = await response.json();
      if (!Array.isArray(strings) || strings.length !== options.strings.length || strings.some(text => typeof text !== "string"))
        throw new Error("The translation provider returned an invalid result. Please try again.");
      options.callback(strings);
    } catch (error) {
      options.callback([]);
      showError(`${translationError(error)} Existing translations are kept.`);
      note((error as Error).message, "error");
    }
  });
  // #endregion

  function translationError(error: unknown) {
    return error instanceof TypeError ? "Couldn't reach the translation service. Please try again." : (error as Error).message;
  }

  function showError(message: string) {
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
  }

  function updateControls() {
    element.inert = !loaded || saving;
  }
  async function loadDefinition() {
    retryLoad.hidden = true;
    showError("");
    try {
      const response = await fetch(`/api/forms/${formId}`);
      if (!response.ok) throw await responseError(response, "Couldn't load the form schema. Please try again.");
      const { definition } = await response.json();
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) throw new Error("The server returned an invalid form schema.");
      creator.JSON = definition;
      render({ creator });
      creator.switchTab("translation");
      loaded = true;
      saver.markSaved();
      creator.autoSaveEnabled = true;
      element.hidden = false;
    } catch (error) { showError((error as Error).message); retryLoad.hidden = false; }
    updateControls();
  }
  retryLoad.addEventListener("click", loadDefinition);
  updateControls();
  await loadDefinition();

  return () => {
    creator.onModified.remove(modified);
    retryLoad.removeEventListener("click", loadDefinition);
    creator.autoSaveEnabled = false;
    creator.dispose();
  };
}
