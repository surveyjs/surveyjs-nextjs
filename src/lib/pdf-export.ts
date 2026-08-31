import type { DemoSurvey } from "@/storage/types";
import type { SurveyData } from "@/schemas";

function fileNameFor(survey: DemoSurvey): string {
  const slug = survey.name.trim().replace(/[^\w-]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "survey"}.pdf`;
}

/**
 * Save a survey — blank, or filled in with a response — as a PDF.
 *
 * `survey-pdf` pulls in jsPDF and the whole font machinery, so it is imported
 * on demand: nothing of it reaches the bundle until someone asks for a file.
 */
export async function exportSurveyToPdf(
  survey: DemoSurvey,
  data?: SurveyData,
): Promise<void> {
  await import("@/lib/surveyjs-license");
  const { SurveyPDF } = await import("survey-pdf");
  const pdf = new SurveyPDF(survey.json, {
    fontSize: 12,
    margins: { left: 10, right: 10, top: 10, bot: 10 },
  });
  if (data) pdf.data = data;
  await pdf.save(fileNameFor(survey));
}
