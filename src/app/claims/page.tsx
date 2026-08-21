import { getNavItem, medicalFormSample } from "@/schemas";
import { getSurveyJson, isCustomized } from "@/lib/schema-store";
import { PageHeader } from "@/components/PageHeader";
import { SurveyForm } from "@/components/SurveyForm";

const nav = getNavItem("claims");

export default async function ClaimsPage() {
  const [json, customized] = await Promise.all([
    getSurveyJson(nav.schemaId),
    isCustomized(nav.schemaId),
  ]);

  return (
    <div className="mx-auto w-full max-w-3xl">
      <PageHeader
        title={nav.label}
        description={nav.description}
        configureHref={`${nav.path}/configure`}
        customized={customized}
      />
      <SurveyForm
        schema={json}
        completedMessage="Thank you. Your intake form has been submitted."
        prefillData={medicalFormSample}
      />
    </div>
  );
}
