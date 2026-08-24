import { getNavItem, getSchemaDefinition } from "@/schemas";
import { PageHeader } from "@/components/PageHeader";
import { RecordsView } from "@/components/RecordsView";

const nav = getNavItem("records");

export default function RecordsPage() {
  return (
    <div>
      <PageHeader
        title={nav.label}
        description={nav.description}
      />
      <RecordsView
        schema={getSchemaDefinition(nav.schemaId).json}
        schemaId={nav.schemaId}
      />
    </div>
  );
}
