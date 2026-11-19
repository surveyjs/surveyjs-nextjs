"use client";
// Extract Responses from Documents: a scan becomes a draft response for review beside its preview, saved only after
// the reviewer confirms it (shared/client/extract-from-paper.js in React). The form is the stored work-order form.
import { note, setStoredQuery, show } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import { responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";
import { Model, type CompleteEvent, type CompletingEvent, type ValueChangedEvent } from "survey-core";
import { Survey } from "survey-react-ui";

type Definition = { pages?: { elements: Record<string, unknown>[] }[]; elements?: Record<string, unknown>[] };
type Confidence = { fieldName: string; confidence: number; flagged: boolean };
type ExtractionResult = { answers: Record<string, unknown>; confidence: Confidence[]; uniqueId?: string | null };

/** The stored work-order form, which the page reads on the server */
export default function ExtractFromPaper({ definition }: { definition: Record<string, unknown> }) {
  const [survey] = useState(() => createSurvey(definition));   // one model per mount, never per render; the server renders it too
  useMountTask(() => start(survey));
  return <Survey model={survey} />;
}

/** The work-order form with the reviewer's confirmation at the end */
function createSurvey(stored: Record<string, unknown>) {
  const definition = structuredClone(stored) as Definition;
  const lastPage = definition.pages?.at(-1) ?? definition;
  lastPage.elements ??= [];
  lastPage.elements.push({
    type: "checkbox", name: "review_confirmation", title: "Review confirmation", titleLocation: "hidden",
    choices: [{ value: "reviewed", text: "I have reviewed these answers" }],
    isRequired: true,
    requiredErrorText: "You need to confirm that you have reviewed the answers."
  });
  const survey = new Model(definition);
  survey.completeText = "Save reviewed response";
  return survey;
}

function start(survey: Model) {
  const reviewed = survey.getQuestionByName("review_confirmation");
  const form = document.getElementById("form")!;
  const sample = document.getElementById("sample-scan") as HTMLButtonElement;
  const ownScan = document.getElementById("own-scan") as HTMLInputElement;
  const startOver = document.getElementById("start-over") as HTMLButtonElement;
  const downloadBlank = document.getElementById("download-work-order") as HTMLButtonElement;
  const downloadError = document.getElementById("work-order-download-error")!;
  const descriptions = new Map<string, string>(survey.getAllQuestions().filter(q => q !== reviewed).map(q => [q.name, q.description]));
  const status = document.querySelector<HTMLElement>('[data-show="extract-status"]')!;
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];
  let controller: AbortController | undefined;
  let previewUrl: string | null = null;
  let revision = 0;
  let busy = false;
  let downloading = false;
  let blankPdfUrl: string | undefined;

  function lock(locked: boolean, saving = false) {
    busy = locked;
    for (const control of [sample, ownScan]) control.disabled = locked;
    downloadBlank.disabled = locked || downloading;
    startOver.disabled = saving;
    form.inert = locked;
    form.setAttribute("aria-busy", String(locked));
  }
  function clearReview() { reviewed.clearValue(); reviewed.clearErrors(); }
  function clearDescriptions() { for (const [name, description] of descriptions) survey.getQuestionByName(name).description = description; }
  function showStatus(message: string) { status.textContent = message; status.hidden = !message; }
  function preview(file: File) {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = URL.createObjectURL(file);
    const image = document.getElementById("scan-image") as HTMLImageElement;
    const pdf = document.getElementById("scan-pdf") as HTMLIFrameElement;
    image.hidden = file.type === "application/pdf";
    pdf.hidden = !image.hidden;
    if (image.hidden) { image.removeAttribute("src"); pdf.src = previewUrl; }
    else { pdf.removeAttribute("src"); image.src = previewUrl; }
    (document.getElementById("open-document") as HTMLAnchorElement).href = previewUrl;
    document.getElementById("scan-preview")!.hidden = false;
    document.getElementById("review-layout")!.dataset.preview = "true";
  }

  // #region sjs:extract-from-paper.client
  // Extract a draft without saving it and validate the response before replacing any answers
  async function extract(file: File, signal: AbortSignal): Promise<ExtractionResult> {
    const body = new FormData();
    body.append("scan", file);
    const response = await fetch("/api/work-orders/extract", { method: "POST", body, signal });
    if (!response.ok) throw await responseError(response, "Couldn't extract the answers. Try again or enter the answers directly in the form.");
    const result = await response.json();
    if (!result.answers || typeof result.answers !== "object" || Array.isArray(result.answers) || !Array.isArray(result.confidence)) {
      throw new Error("The extraction result couldn't be read. Try again or enter the answers directly in the form.");
    }
    return result;
  }
  // #endregion

  async function run(getFile: (signal: AbortSignal) => Promise<File>) {
    if (busy) return;
    const current = ++revision;
    controller?.abort();
    controller = new AbortController();
    const signal = controller.signal;
    lock(true);
    let file: File | undefined;
    try {
      showStatus("Loading the document...");
      file = await getFile(signal);
      if (!allowed.includes(file.type)) throw new Error("Choose a PDF, PNG, JPEG, WebP, or GIF document.");
      if (!file.size || file.size > 5 * 1024 * 1024) throw new Error("Choose a document of 5 MB or less.");
      showStatus(`Extracting answers from ${file.name}...`);
      const result = await extract(file, signal);
      if (current !== revision) return;
      survey.notifier.active = false;
      survey.clear(true, true);
      survey.data = result.answers;
      clearReview();
      clearDescriptions();
      const flagged = result.confidence.filter(c => c && c.flagged && typeof c.confidence === "number" && c.confidence >= 0 && c.confidence <= 1 && descriptions.has(c.fieldName));
      for (const item of flagged) {
        const question = survey.getQuestionByName(item.fieldName);
        question.description = `Review this answer (${Math.round(item.confidence * 100)}% confidence)`;
      }
      preview(file);
      showStatus("Draft ready for review");
      show("extract-source", file.name);
      show("extract-id", typeof result.uniqueId === "string" ? result.uniqueId : "Not detected");
      show("extract-review-count", String(flagged.length));
      document.getElementById("extract-details")!.hidden = false;
      note("Draft ready for review", "ok");
    } catch (error) {
      if (current !== revision || (error as Error).name === "AbortError") return;
      const message = error instanceof TypeError || error instanceof SyntaxError ? "Couldn't extract the answers. Try again or enter the answers directly in the form." : (error as Error).message;
      showStatus(message);
      if (!previewUrl && file && allowed.includes(file.type) && file.size <= 5 * 1024 * 1024) preview(file);
      note(message, "error");
    } finally { if (current === revision) lock(false); }
  }

  const valueChanged = (_: Model, options: ValueChangedEvent) => { if (options.name !== reviewed.name) clearReview(); };
  const completing = (_: Model, options: CompletingEvent) => { options.allow = !busy; };
  survey.onValueChanged.add(valueChanged);
  survey.onCompleting.add(completing);

  // #region sjs:extract-from-paper.save
  // Save only after human review and confirm the response ID returned by the backend
  survey.onComplete.add(async (sender: Model, options: CompleteEvent) => {
    lock(true, true);
    sender.completedHtml = "<h3>Saving the reviewed response...</h3>";
    options.showSaveInProgress();
    try {
      const data = Object.fromEntries(sender.getAllQuestions()
        .filter(q => q !== reviewed).map(q => [q.valueName || q.name, q.isEmpty() ? null : q.value]));
      const response = await fetch("/api/responses", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ formId: "work-order", data })
      });
      if (!response.ok) throw await responseError(response, "Couldn't save the reviewed response. Please try again.");
      const { id } = await response.json();
      if (!Number.isInteger(id) || id < 1) throw new Error("The server didn't confirm a saved response. Please try again.");
      setStoredQuery({ id });
      sender.completedHtml = `<h3>The reviewed response has been saved.</h3><p>Response ID: ${id}</p>`;
      showStatus(`Reviewed response #${id} saved.`);
      options.showSaveSuccess();
    } catch (error) {
      sender.completedHtml = "<h3>The reviewed response hasn't been saved.</h3>";
      options.showSaveError(error instanceof TypeError ? "Couldn't save the reviewed response. Please try again." : (error as Error).message);
    } finally { lock(false); }
  });
  // #endregion

  const loadSample = () => run(async signal => {
    const response = await fetch("/shared/samples/work-order-scan.png", { signal });
    if (!response.ok) throw new Error("Couldn't load the sample scan. Please try again.");
    return new File([await response.blob()], "work-order-scan.png", { type: "image/png" });
  });
  const download = async () => {
    downloading = true;
    downloadBlank.disabled = true;
    downloadBlank.textContent = "Preparing PDF...";
    downloadError.hidden = true;
    try {
      const response = await fetch("/api/work-orders/blank.pdf");
      if (!response.ok) throw await responseError(response, "Couldn't download the blank work order. Please try again.");
      if (!response.headers.get("content-type")?.startsWith("application/pdf")) throw new Error("The server didn't return a PDF. Please try again.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("The server returned an empty PDF. Please try again.");
      if (blankPdfUrl) URL.revokeObjectURL(blankPdfUrl);
      blankPdfUrl = URL.createObjectURL(blob);
      const link = Object.assign(document.createElement("a"), { href: blankPdfUrl, download: "work-order.pdf" });
      link.click();
      note("Blank work order downloaded.", "ok");
    } catch (error) {
      const message = error instanceof TypeError ? "Couldn't download the blank work order. Please try again." : (error as Error).message;
      downloadError.textContent = message;
      downloadError.hidden = false;
      note(message, "error");
    } finally {
      downloading = false;
      downloadBlank.disabled = busy;
      downloadBlank.textContent = "Download blank work order";
    }
  };
  const chosen = () => {
    const file = ownScan.files?.[0];
    ownScan.value = "";
    if (file) void run(async () => file);
  };
  const restart = () => {
    revision++;
    controller?.abort();
    lock(false);
    survey.notifier.active = false;
    survey.clear(true, true);
    clearDescriptions();
    clearReview();
    ownScan.value = "";
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = null;
    document.getElementById("scan-image")!.removeAttribute("src");
    document.getElementById("scan-pdf")!.removeAttribute("src");
    document.getElementById("open-document")!.removeAttribute("href");
    document.getElementById("scan-preview")!.hidden = true;
    document.getElementById("review-layout")!.dataset.preview = "false";
    document.getElementById("extract-details")!.hidden = true;
    showStatus("");
    for (const field of ["extract-source", "extract-id", "extract-review-count"]) show(field, "");
    setStoredQuery({});
  };
  const leave = () => {
    controller?.abort();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    if (blankPdfUrl) URL.revokeObjectURL(blankPdfUrl);
  };
  sample.addEventListener("click", loadSample);
  downloadBlank.addEventListener("click", download);
  ownScan.addEventListener("change", chosen);
  startOver.addEventListener("click", restart);
  window.addEventListener("pagehide", leave);
  if (ownScan.files?.length) chosen();   // a document chosen while the server-rendered page was still hydrating

  return () => {
    revision++;
    sample.removeEventListener("click", loadSample);
    downloadBlank.removeEventListener("click", download);
    ownScan.removeEventListener("change", chosen);
    startOver.removeEventListener("click", restart);
    window.removeEventListener("pagehide", leave);
    leave();
    survey.onValueChanged.remove(valueChanged);
    survey.onCompleting.remove(completing);
    survey.onComplete.clear();   // the save handler above
  };
}
