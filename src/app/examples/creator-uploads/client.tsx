"use client";
// Upload Files in Creator: Survey Creator stores each uploaded image on the server and keeps only its URL in the
// schema (shared/client/creator-uploads.js in React). ?form renders the saved definition with the Form Library.
import { getPage, note } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/creator.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { createSchemaSaver, responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { Model } from "survey-core";

export default function CreatorUploads() {
  const [view, setView] = useState<View>(null);
  useMountTask((active) => start(setView, active));
  return <SurveyJsView view={view} />;
}

async function start(render: (view: View) => void, active: () => boolean) {
  const { SurveyCreator } = await import("survey-creator-react");   // Creator touches window when it is imported
  if (!active()) return;
  const page = getPage();
  const formId = "support-assets";
  const preview = new URLSearchParams(location.search).has("form");
  const creator = new SurveyCreator();
  const element = document.getElementById("creator")!;
  const retryLoad = document.getElementById("retry-load")!;
  const retrySave = document.getElementById("retry-save") as HTMLButtonElement;
  const openSaved = document.getElementById("open-saved-form");
  const restore = document.getElementById("restore-sample") as HTMLButtonElement | null;
  const errorMessage = document.getElementById("creator-error")!;
  let loaded = false;
  let uploads = 0;
  let busy = false;
  let saving = false;

  const saver = createSchemaSaver(() => creator.JSON, async json => {
    const response = await fetch(`/api/forms/${formId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: json });
    if (!response.ok) throw await responseError(response, "Couldn't save the form schema. Please try again.");
  }, ({ state, error }) => {
    if (!loaded || preview) return;
    saving = state === "saving";
    showError(state === "error" ? `${error} Your schema changes remain in the editor. Uploaded files are retained.` : "");
    retrySave.hidden = state !== "error";
    updateControls();
  });
  creator.saveSurveyFunc = (saveNo: number, callback: (saveNo: number, success: boolean) => void) => saver.save().then(saved => {
    callback(saveNo, saved);
    // Creator says "not saved" in the callback; show the server's reason after it
    if (!saved) creator.notify(saver.error ?? "", "error");
  });
  const modified = () => { if (loaded) saver.changed(); };
  creator.onModified.add(modified);

  // #region sjs:creator-uploads.client
  // Store each uploaded image separately and keep its URL in the form schema
  creator.onUploadFile.add(async (_, options) => {
    const label = options.propertyName === "logo" || options.elementType === "header" ? "Logo" : "Image";
    uploads++; updateControls();
    showError("");
    try {
      if (!options.files.length || options.files.some(file =>
        file.size > 5242880 || !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(file.type)))
        throw new Error("Choose a PNG, JPEG, WebP, or GIF image up to 5 MB.");
      const body = new FormData();
      options.files.forEach(file => body.append("files[]", file));
      const response = await fetch("/api/files", { method: "POST", body });
      const ids: unknown = response.ok ? await response.json() : null;
      if (!Array.isArray(ids) || ids.length !== options.files.length ||
        ids.some(id => typeof id !== "string" || !id))
        throw new Error(`Couldn't upload the ${label.toLowerCase()}. Please try again.`);
      options.callback("success", `/api/files/${encodeURIComponent(ids[0])}`);
      note(`${label} uploaded.`, "ok");
    } catch (error) {
      options.callback("error");
      showError((error as Error).message);
      note((error as Error).message, "error");
    } finally { uploads--; updateControls(); }
  });
  // #endregion

  function updateControls() {
    if (openSaved) openSaved.setAttribute("aria-disabled", String(!loaded || busy || uploads > 0));
    if (restore) restore.disabled = !loaded || busy || saving || uploads > 0;
    retrySave.disabled = busy || uploads > 0;
  }
  function setBusy(value: boolean) {
    busy = value;
    element.inert = value;
    updateControls();
  }
  function showError(message: string) {
    errorMessage.textContent = message;
    errorMessage.hidden = !message;
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
      loaded = true;
      saver.markSaved();
      if (preview) render({ survey: new Model(definition) });
      else { render({ creator }); creator.autoSaveEnabled = true; }
      element.hidden = false;
      element.inert = false;
    } catch (error) { showError((error as Error).message); retryLoad.hidden = false; }
    updateControls();
  }
  const saveAgain = () => creator.saveSurvey();
  const restoreSample = async () => {
    if (!loaded || busy || saving || uploads) return;
    setBusy(true);
    creator.autoSaveEnabled = false;
    try {
      creator.JSON = structuredClone(page.definition);
      await saver.save();
    } finally {
      creator.autoSaveEnabled = true;
      setBusy(false);
    }
  };
  const openSavedForm = async (event: Event) => {
    event.preventDefault();
    if (!loaded || busy || uploads) return;
    const tab = window.open("", "_blank");
    if (!tab) { showError("Allow pop-ups to open the saved form."); return; }
    setBusy(true);
    creator.saveSurvey();
    if (await saver.save()) tab.location.href = new URL("?form", location.href).href;
    else tab.close();
    setBusy(false);
  };
  retryLoad.addEventListener("click", loadDefinition);
  retrySave.addEventListener("click", saveAgain);
  restore?.addEventListener("click", restoreSample);
  openSaved?.addEventListener("click", openSavedForm);
  await loadDefinition();

  return () => {
    creator.onModified.remove(modified);
    retryLoad.removeEventListener("click", loadDefinition);
    retrySave.removeEventListener("click", saveAgain);
    restore?.removeEventListener("click", restoreSample);
    openSaved?.removeEventListener("click", openSavedForm);
    creator.autoSaveEnabled = false;
    creator.dispose();
  };
}
