import dynamic from "next/dynamic";

const DashboardDatatables = dynamic(() => import('@/components/DashboardDatatables'), {
  ssr: false,
})

export default function SurveyDatatables() {
  return (
    <div className="flex min-h-screen flex-col items-center p-8">
      <DashboardDatatables />
    </div>
  );
}
