"use client";
// Lint JSON Schemas: Survey Creator's Save sends the schema to the backend, which checks it and answers with errors
// (the save is rejected) or warnings (the save goes through) (shared/client/lint-definition.js in React).
import { fill, getPage, note } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/creator.css";
import { SurveyJsView, type View } from "@/components/example/surveyjs-view";
import { SurveyCreator } from "survey-creator-react";
import { responseError } from "@/demo/schema-saver";
import { useMountTask } from "@/lib/use-mount-task";
import { useState } from "react";

type Finding = { ruleId?: unknown; type?: unknown; path?: unknown; elementName?: unknown; message?: unknown; text?: unknown };
type LintReport = { errors?: Finding[]; warnings?: Finding[]; error?: string };
type SampleDefinition = { title: string; elements: { name: string; visibleIf?: string }[] };

export default function LintDefinition() {
  const [view, setView] = useState<View>(null);
  useMountTask(() => start(setView));
  return <SurveyJsView view={view} />;
}

async function start(render: (view: View) => void) {
  const page = getPage();
  const formId = "support-lint";
  const creator = new SurveyCreator({ showTranslationTab: true });
  const editor = document.getElementById("creator")!;
  const retry = document.getElementById("retry-load")!;
  const loadError = document.getElementById("creator-error")!;
  const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-lint]")];
  let saving = false;

  function reportFindings(report: LintReport) {
    const findings = [
      ...(report.errors ?? []).map(finding => ({ ...finding, severity: "Error" })),
      ...(report.warnings ?? []).map(finding => ({ ...finding, severity: "Warning" }))
    ];
    const text = (value: unknown) => typeof value === "string" ? value : JSON.stringify(value);
    document.getElementById("lint-findings")!.replaceChildren(...findings.map(finding => fill("lint-finding", {
      severity: finding.severity,
      rule: text(finding.ruleId ?? finding.type ?? "—"),
      location: text(finding.path ?? finding.elementName ?? "—"),
      message: text(finding.message ?? finding.text ?? "Check the schema"),
    })).filter(row => row !== null));
    // Findings always come with a note, and the page shows its read-outs once a note arrives
    document.getElementById("lint-report")!.hidden = !findings.length;
  }

  // #region sjs:lint-definition.client
  // Display the server's errors and warnings and return the actual save result to Creator
  async function saveDefinition(definition: unknown) {
    const response = await fetch(`/api/forms/${formId}`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(definition)
    });
    const report: LintReport = response.status === 204 ? {} : await response.json();
    reportFindings(report);
    if (response.status === 422 && Array.isArray(report.errors) && report.errors.length) {
      note("Form schema not saved. Fix the reported errors and retry.", "error");
      return false;
    }
    if (!response.ok) throw new Error(report.error || "Couldn't save the form schema. Please try again.");
    const count = report.warnings?.length ?? 0;
    note(count ? `Schema saved with ${count} warning${count === 1 ? "" : "s"}. Review the findings above.` : "Form schema saved successfully.", "ok");
    return true;
  }
  creator.saveSurveyFunc = async (saveNo: number, callback: (saveNo: number, success: boolean) => void) => callback(saveNo, await checkAndSave(creator.JSON));
  // #endregion

  async function checkAndSave(definition: unknown) {
    if (saving) return false;
    saving = true;
    editor.inert = true;
    for (const button of buttons) button.disabled = true;
    reportFindings({});
    try { return await saveDefinition(definition); }
    catch (error) {
      const message = error instanceof TypeError || error instanceof SyntaxError ? "Couldn't save the form schema. Please try again." : (error as Error).message;
      note(message, "error");
      return false;
    } finally {
      saving = false;
      editor.inert = false;
      for (const button of buttons) button.disabled = false;
    }
  }

  // These defects survive Creator's JSON loading; only its Save button submits the schema
  const cases: Record<string, string> = {
    "broken-reference": "{prodcut} = 'Survey Creator'",
    "invalid-expression": "{product} = ",
    "unreachable-condition": "{urgency} = 'Low' and {urgency} = 'Blocking'",
  };
  const loadSample = (event: Event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const sample = page.definition as SampleDefinition;
    const definition = structuredClone(sample);
    definition.title = `${sample.title}: ${button.textContent!.trim().toLowerCase()}`;
    definition.elements.find(question => question.name === "issue")!.visibleIf = cases[button.dataset.lint!];
    // A sample import can open Designer with its intended errors; ordinary tab changes still validate
    const openSample = (_: unknown, options: { tabName: string; allow: boolean }) => { if (options.tabName === "designer") options.allow = true; };
    creator.onActiveTabChanging.add(openSample);
    try { creator.switchTab("designer"); }
    finally { creator.onActiveTabChanging.remove(openSample); }
    creator.JSON = definition;
    creator.setModified({ type: "LOAD_SAMPLE" });
    reportFindings({});
  };
  for (const button of buttons) button.addEventListener("click", loadSample);

  async function load() {
    retry.hidden = true;
    loadError.hidden = true;
    loadError.textContent = "";
    for (const button of buttons) button.disabled = true;
    reportFindings({});
    try {
      const response = await fetch(`/api/forms/${formId}`);
      if (!response.ok) throw await responseError(response, "Couldn't load the form schema. Please try again.");
      const result = await response.json();
      if (!result.definition || typeof result.definition !== "object" || Array.isArray(result.definition)) throw new Error("The saved schema couldn't be loaded. Please try again.");
      creator.JSON = result.definition;
      render({ creator });
      editor.hidden = false;
      editor.inert = false;
      for (const button of buttons) button.disabled = false;
    } catch (error) {
      const message = error instanceof TypeError ? "Couldn't load the form schema. Please try again." : (error as Error).message;
      loadError.textContent = message;
      loadError.hidden = false;
      retry.hidden = false;
    }
  }
  retry.addEventListener("click", load);
  await load();

  return () => {
    retry.removeEventListener("click", load);
    for (const button of buttons) button.removeEventListener("click", loadSample);
    creator.dispose();
  };
}
