import { getNavItem, getSchemaDefinition } from "@/schemas";
import { SchemaEditor } from "@/components/SchemaEditor";

const nav = getNavItem("claims");

export default function ConfigurePage() {
  return (
    <SchemaEditor
      schemaId={nav.schemaId}
      title={nav.label}
      backHref={nav.path}
      defaultSource={JSON.stringify(getSchemaDefinition(nav.schemaId).json, null, 2)}
    />
  );
}
