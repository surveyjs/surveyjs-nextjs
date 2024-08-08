import dynamic from "next/dynamic";

const DashboardTabulator = dynamic(() => import('@/components/DashboardTabulator'), {
  ssr: false,
})

export default function SurveyTabulator() {
  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <DashboardTabulator />
    </div>
  );
}
