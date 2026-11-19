"use client";
// Variable Presets: Survey Creator's Preview tab switches between saved sets of sample variables, and edited presets
// save to the backend (shared/client/variable-presets.js in React).
import { getPage } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/creator.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { SurveyCreator } from "survey-creator-react";
import { createSchemaSaver, responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import type { TabTestPlugin } from "survey-creator-core";

type Preset = { name: string; variables: Record<string, unknown> };

export default function VariablePresets() {
  const [view, setView] = useState<View>(null);
  useMountTask(() => start(setView));
  return <SurveyJsView view={view} />;
}

async function start(render: (view: View) => void) {
  const page = getPage();
  const formId = "support";
  const element = document.getElementById("creator")!;
  const retryLoad = document.getElementById("retry-load")!;
  const retrySave = document.getElementById("retry-presets") as HTMLButtonElement;
  const errorMessage = document.getElementById("creator-error")!;
  let loaded = false;

  // #region sjs:variable-presets.client
  const creator = new SurveyCreator({
    variablePresets: {
      definition: {
        elements: [{
          type: "dropdown", name: "customerTier", title: "Customer plan",
          choices: [{ value: "basic", text: "Basic" }, { value: "premium", text: "Premium" }],
          isRequired: true
        }]
      },
      presets: []
    }
  });
  creator.onVariablePresetsChanged.add((_, options) => {
    // Switching scenarios changes only Preview; editing persists the preset list
    if (loaded && options.reason === "edit") { saver.changed(); saver.save(); }
  });
  // #endregion

  // #region sjs:variable-presets.save
  // Save the list, rather than wrapping it in another variablePresets configuration
  const saver = createSchemaSaver(() => creator.variablePresets.presets ?? [], async json => {
    const response = await fetch(`/api/variable-presets/${formId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: json
    });
    if (!response.ok) throw await responseError(response, "Couldn't save the presets. Please try again.");
  }, ({ state, error }) => {
    if (!loaded) return;
    showError(state === "error" ? `${error} Your preset edits remain in this editor.` : "");
    retrySave.hidden = state !== "error";
    retrySave.disabled = state === "saving";
    if (state === "error") creator.notify(error ?? "", "error");
  });
  // #endregion

  function showError(message: string) {
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
  }
  async function loadPresets() {
    retryLoad.hidden = true;
    showError("");
    try {
      const response = await fetch(`/api/variable-presets/${formId}`);
      if (!response.ok) throw await responseError(response, "Couldn't load the presets. Please try again.");
      const stored = (await response.json()) as Preset[] | { presets?: Preset[] } | null;
      const presets = Array.isArray(stored) ? stored : stored?.presets;
      if (!Array.isArray(presets) || presets.some(preset => !preset || typeof preset.name !== "string" || !preset.variables || typeof preset.variables !== "object" || Array.isArray(preset.variables))) throw new Error("The server returned invalid presets.");
      creator.variablePresets = { ...creator.variablePresets, presets };
      creator.JSON = page.definition;
      render({ creator });
      const manager = creator.getPlugin<TabTestPlugin>("preview").variablePresets;
      manager.active = presets.some(preset => preset.name === "Basic") ? "Basic" : presets[0]?.name ?? "";
      creator.switchTab("preview");
      loaded = true;
      saver.markSaved();
      element.hidden = false;
      element.inert = false;
    } catch (error) { showError((error as Error).message); retryLoad.hidden = false; }
  }
  const saveAgain = () => saver.save();
  retryLoad.addEventListener("click", loadPresets);
  retrySave.addEventListener("click", saveAgain);
  await loadPresets();

  return () => {
    retryLoad.removeEventListener("click", loadPresets);
    retrySave.removeEventListener("click", saveAgain);
    creator.dispose();
  };
}
