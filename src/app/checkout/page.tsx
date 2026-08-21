import { checkoutSample, getNavItem } from "@/schemas";
import { getSurveyJson, isCustomized } from "@/lib/schema-store";
import { PageHeader } from "@/components/PageHeader";
import { SurveyForm } from "@/components/SurveyForm";

const nav = getNavItem("checkout");

export default async function CheckoutPage() {
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
      <SurveyForm schema={json} prefillData={checkoutSample} />
    </div>
  );
}
