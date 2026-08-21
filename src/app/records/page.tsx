import { getNavItem } from "@/schemas";
import { getSurveyJson, isCustomized } from "@/lib/schema-store";
import { PageHeader } from "@/components/PageHeader";
import { RecordsView } from "@/components/RecordsView";

const nav = getNavItem("records");

export default async function RecordsPage() {
  const [json, customized] = await Promise.all([
    getSurveyJson(nav.schemaId),
    isCustomized(nav.schemaId),
  ]);

  return (
    <div>
      <PageHeader
        title={nav.label}
        description={nav.description}
        customized={customized}
      />
      <RecordsView schema={json} />
    </div>
  );
}
