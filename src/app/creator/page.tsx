import dynamic from "next/dynamic";

const SurveyCreatorComponent = dynamic(() => import('@/components/SurveyCreator'), {
  ssr: false,
})

export default function SurveyCreator() {
  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <SurveyCreatorComponent />
    </div>
  );
}
