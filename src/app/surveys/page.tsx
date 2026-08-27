import type { Metadata } from "next";
import { SurveysPage } from "@/components/surveys/SurveysPage";

export const metadata: Metadata = {
  title: "My Forms — SurveyJS + Next.js",
  description:
    "Build, run, analyse and export surveys with the full SurveyJS product suite in a Next.js app.",
};

export default function Page() {
  return <SurveysPage />;
}
