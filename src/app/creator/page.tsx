import SurveyCreatorComponent from "@/components/SurveyCreator";

// import dynamic from 'next/dynamic';
// const SurveyComponent = dynamic(() => import("@/components/Survey"), { ssr: false });


export default function SurveyCreator() {
  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <SurveyCreatorComponent />
    </div>
  );
}
