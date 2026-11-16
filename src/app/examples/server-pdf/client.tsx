"use client";
// Generate PDFs: Open PDF and Download PDF on each server-rendered claim row (shared/client/server-pdf.js in React).
// The server renders the PDF; the browser only fetches it, opens it in a tab or saves it.
import { note, setStoredQuery } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/form.css";
import { responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";

type PdfAction = "open" | "download";
type PdfResult = { message: string; needsAction: boolean };

export default function ServerPdf() {
  useMountTask(() => start());
  return null;
}

function start() {
  const urls = new Map<string, string>();
  const feedback = document.getElementById("pdf-feedback")!;

  function showFeedback(message: string, kind = "info") {
    feedback.textContent = message;
    feedback.dataset.kind = kind;
    feedback.hidden = !message;
  }

  // shared/client/server-pdf.js names it usePdfUrl; in React a use… name means a hook
  function deliverPdf(id: string, action: PdfAction, url: string): PdfResult {
    const link = document.createElement("a");
    link.href = url;
    if (action === "download") link.download = `claim-${id}.pdf`;
    else { link.target = "_blank"; link.rel = "noopener"; }
    link.click();
    return { message: action === "download" ? "PDF ready. Download started." : "PDF opened in a new tab.", needsAction: false };
  }

  // #region sjs:server-pdf.client
  // Open a tab during the click and navigate only after the server returns a PDF
  async function generatePdf(id: string, action: PdfAction): Promise<PdfResult> {
    if (urls.has(id)) return deliverPdf(id, action, urls.get(id)!);
    const tab = action === "open" ? window.open("/examples/server-pdf/loading", "_blank") : null;
    try {
      const response = await fetch(`/api/claims/${id}/pdf`);
      if (!response.ok) throw await responseError(response, "Couldn't generate the PDF. Please try again.");
      if (!response.headers.get("content-type")?.startsWith("application/pdf")) throw new Error("The server didn't return a PDF. Please try again.");
      const blob = await response.blob();
      if (!blob.size) throw new Error("The server returned an empty PDF. Please try again.");
      const url = URL.createObjectURL(blob);
      urls.set(id, url);
      if (action === "download") return deliverPdf(id, action, url);
      const opened = tab && !tab.closed;
      if (opened) tab.location = url;
      return { message: opened ? "PDF opened in a new tab." : "PDF ready. Select Open PDF again or Download PDF.", needsAction: !opened };
    } catch (error) { tab?.close(); throw error; }
  }
  // #endregion

  const clicked = async (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const row = button.closest("[data-claim-row]")!;
    const buttons = row.querySelectorAll<HTMLButtonElement>("[data-claim]");
    const id = button.dataset.claim!;
    for (const item of buttons) item.disabled = true;
    showFeedback("Generating the PDF...");
    row.setAttribute("aria-busy", "true");
    setStoredQuery({ id });
    try {
      const result = await generatePdf(id, button.dataset.action as PdfAction);
      showFeedback(result.needsAction ? result.message : "");
      note(`Claim #${id}: ${result.message}`, "ok");
    } catch (error) {
      const message = error instanceof TypeError ? "Couldn't generate the PDF. Please try again." : (error as Error).message;
      showFeedback(message, "error");
      note(`Claim #${id}: ${message}`, "error");
    } finally {
      for (const item of buttons) item.disabled = false;
      row.setAttribute("aria-busy", "false");
    }
  };
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-claim]")];
  for (const button of buttons) button.addEventListener("click", clicked);
  const revoke = () => { for (const url of urls.values()) URL.revokeObjectURL(url); urls.clear(); };
  window.addEventListener("pagehide", revoke);

  return () => {
    for (const button of buttons) button.removeEventListener("click", clicked);
    window.removeEventListener("pagehide", revoke);
    revoke();
  };
}
