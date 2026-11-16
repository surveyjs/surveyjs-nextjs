// GET /claim: Option A of Load JSON Schemas, Variables, and Answers. The same example page, with the definition and
// the user variables embedded as inline scripts (window.FORM_DEFINITION, window.FORM_VARIABLES): no /api/forms/
// request. The loader is in src/server/routes/load-definition-variables-data.ts, inside the example's .server region.
import { exampleMetadata, type SearchParams } from "@/lib/example-page";
import ExamplePage from "../examples/load-definition-variables-data/page";

export const generateMetadata = () => exampleMetadata("load-definition-variables-data", "/claim");

export default function Claim({ searchParams }: { searchParams: SearchParams }) {
  return <ExamplePage searchParams={searchParams} optionA />;
}
