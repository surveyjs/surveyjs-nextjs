import dynamic from "next/dynamic";

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
})

export default function SurveyDashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <Dashboard />
    </div>
  );
}
