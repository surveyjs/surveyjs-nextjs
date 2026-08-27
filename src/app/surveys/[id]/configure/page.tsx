import { SurveyWorkspace } from "@/components/surveys/SurveyWorkspace";
import { seedSurveys } from "@/demo/seed";

export function generateStaticParams() {
  return seedSurveys.map((survey) => ({ id: survey.id }));
}

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SurveyWorkspace surveyId={id} tab="configure" />;
}
