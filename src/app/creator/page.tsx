import SurveyCreatorComponent from "@/components/SurveyCreator";

// import dynamic from 'next/dynamic';
// const SurveyComponent = dynamic(() => import("@/components/Survey"), { ssr: false });


export default function SurveyCreator() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-between p-24">
      <SurveyCreatorComponent/>
    </div>
  );
}
