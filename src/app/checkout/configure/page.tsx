import { getNavItem, getSchemaDefinition } from "@/schemas";
import { getSurveyJson, isCustomized } from "@/lib/schema-store";
import { SchemaEditor } from "@/components/SchemaEditor";

const nav = getNavItem("checkout");

export default async function ConfigurePage() {
  const [json, customized] = await Promise.all([
    getSurveyJson(nav.schemaId),
    isCustomized(nav.schemaId),
  ]);

  return (
    <SchemaEditor
      schemaId={nav.schemaId}
      title={nav.label}
      backHref={nav.path}
      initialSource={JSON.stringify(json, null, 2)}
      defaultSource={JSON.stringify(getSchemaDefinition(nav.schemaId).json, null, 2)}
      customized={customized}
    />
  );
}
