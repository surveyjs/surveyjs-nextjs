"use client";
// Analyze Results with Dashboard: the feedback form's schema and responses in SurveyJS Dashboard
// (shared/client/dashboard.js in React). The Dashboard renders into the server-rendered #dashboard.
import { show } from "@/demo/host";   // first: the requests log wraps fetch before the example runs
import "@/styles/dashboard.css";
import { useMountTask } from "@/lib/use-mount-task";
import { Model } from "survey-core";
import type { Dashboard as AnalyticsDashboard } from "survey-analytics";

type Answers = Record<string, unknown>;

export default function DashboardResults() {
  useMountTask((active) => start(active));
  return null;
}

async function start(active: () => boolean) {
  const { Dashboard } = await import("survey-analytics");   // the Dashboard touches window when it is imported
  if (!active()) return;
  const container = document.getElementById("dashboard")!;
  const notice = document.getElementById("dashboard-notice")!;
  const retry = document.getElementById("retry-dashboard")!;
  let dashboard: AnalyticsDashboard | undefined;
  let schemaPromise: Promise<Answers> | null = null;
  let controller: AbortController | undefined;
  let revision = 0;

  async function loadSchema() {
    schemaPromise ??= fetch("/api/forms/feedback").then(async response => {
      if (!response.ok) throw new Error("Schema load failed");
      const { definition } = await response.json();
      if (!definition || typeof definition !== "object" || Array.isArray(definition)) throw new Error("Invalid schema");
      return definition as Answers;
    }).catch(error => { schemaPromise = null; throw error; });
    return schemaPromise;
  }

  // #region sjs:dashboard.client
  // Load answers with their submission dates for Dashboard's built-in date filter
  async function loadResults(signal: AbortSignal) {
    const query = new URLSearchParams({ formId: "feedback", includeCreatedAt: "1", limit: "5000" });
    const [definition, response] = await Promise.all([
      loadSchema(), fetch(`/api/responses?${query}`, { signal })
    ]);
    if (!response.ok) throw new Error("Responses load failed");
    const data: unknown = await response.json();
    if (!Array.isArray(data)) throw new Error("Invalid responses");
    return { definition, data: data.map((row: { data: Answers; createdAt: string }) => ({ ...row.data, createdAt: row.createdAt })) };
  }

  function renderResults(definition: Answers, data: Answers[]) {
    if (!dashboard) {
      const survey = new Model(definition);
      dashboard = new Dashboard({
        questions: survey.getAllQuestions(), data,
        dateFieldName: "createdAt", datePeriod: "last30days"
      });
      dashboard.render(container);
    } else {
      dashboard.updateData(data);
    }
  }
  // #endregion

  async function refresh() {
    const run = ++revision;
    controller?.abort();
    controller = new AbortController();
    container.hidden = true;
    container.setAttribute("aria-busy", "true");
    notice.hidden = false;
    retry.hidden = true;
    show("dashboard-status", "Loading responses...");
    try {
      const { definition, data } = await loadResults(controller.signal);
      if (run !== revision) return;
      container.hidden = false;
      renderResults(definition, data);
      notice.hidden = true;
    } catch (error) {
      if (run !== revision || (error as Error).name === "AbortError") return;
      container.hidden = true;
      show("dashboard-status", "Couldn't load the responses. Please try again.");
      retry.hidden = false;
    } finally {
      if (run === revision) container.setAttribute("aria-busy", "false");
    }
  }

  const stop = () => {
    revision++;
    controller?.abort();
    dashboard?.destroy();
    dashboard = undefined;
  };
  retry.addEventListener("click", refresh);
  addEventListener("pagehide", stop, { once: true });
  void refresh();

  return () => {
    retry.removeEventListener("click", refresh);
    removeEventListener("pagehide", stop);
    stop();
  };
}
