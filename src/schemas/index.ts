export type { SurveyJSON, SurveyData, SurveyMode, SchemaDefinition } from "./types";

export { checkoutJson, checkoutSchema } from "./checkout";
export { insuranceClaimJson, insuranceClaimSchema } from "./insurance-claim";
export { medicalFormJson, medicalFormSchema } from "./medical-form";

export { medicalFormSample } from "./data/medical-form-seed";
export { checkoutSample } from "./data/checkout-seed";
export { insuranceClaimSeed, type ClaimRecord } from "./data/insurance-claim-seed";

export {
  createSurveyModel,
  type CreateSurveyModelOptions,
  type SchemaInput,
} from "./createSurveyModel";

import { checkoutSchema } from "./checkout";
import { insuranceClaimSchema } from "./insurance-claim";
import { medicalFormSchema } from "./medical-form";
import type { SchemaDefinition } from "./types";

export const schemaRegistry: Record<string, SchemaDefinition> = {
  [checkoutSchema.id]: checkoutSchema,
  [insuranceClaimSchema.id]: insuranceClaimSchema,
  [medicalFormSchema.id]: medicalFormSchema,
};

export function getSchemaDefinition(id: string): SchemaDefinition {
  const schema = schemaRegistry[id];
  if (!schema) throw new Error(`Unknown schema id: ${id}`);
  return schema;
}
