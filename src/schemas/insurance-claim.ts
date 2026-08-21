import type { SchemaDefinition, SurveyJSON } from "./types";

/**
 * Insurance claim — the CRUD entity used by the Records list/detail pages.
 *
 * Rich field variety on purpose: text, masked input (claim no., phone, SSN),
 * dropdown, radiogroup, checkbox, date, currency-ish number, file upload, and
 * conditional panels (`visibleIf`) that appear based on claim type / injury.
 *
 * Representative V3 JSON — drop-in replaceable with a real CMS-1500 schema.
 */
export const insuranceClaimJson: SurveyJSON = {
  title: "Insurance Claim",
  description: "Create or edit a claim record.",
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  pages: [
    {
      name: "claim",
      elements: [
        {
          type: "panel",
          name: "claimMeta",
          title: "Claim",
          elements: [
            {
              type: "text",
              name: "claimNumber",
              title: "Claim number",
              isRequired: true,
              maskType: "pattern",
              maskSettings: { pattern: "CLM-9999-9999" },
              placeholder: "CLM-____-____",
            },
            {
              type: "dropdown",
              name: "status",
              title: "Status",
              isRequired: true,
              startWithNewLine: false,
              defaultValue: "draft",
              choices: [
                { value: "draft", text: "Draft" },
                { value: "submitted", text: "Submitted" },
                { value: "in_review", text: "In review" },
                { value: "approved", text: "Approved" },
                { value: "denied", text: "Denied" },
              ],
            },
            {
              type: "radiogroup",
              name: "claimType",
              title: "Claim type",
              isRequired: true,
              colCount: 3,
              choices: [
                { value: "medical", text: "Medical" },
                { value: "dental", text: "Dental" },
                { value: "vision", text: "Vision" },
              ],
            },
            {
              type: "text",
              name: "dateOfService",
              title: "Date of service",
              inputType: "date",
              isRequired: true,
            },
            {
              type: "text",
              name: "amountClaimed",
              title: "Amount claimed (USD)",
              inputType: "number",
              startWithNewLine: false,
              min: 0,
              placeholder: "0.00",
            },
          ],
        },
        {
          type: "panel",
          name: "claimant",
          title: "Claimant",
          elements: [
            { type: "text", name: "firstName", title: "First name", isRequired: true },
            {
              type: "text",
              name: "lastName",
              title: "Last name",
              isRequired: true,
              startWithNewLine: false,
            },
            {
              type: "text",
              name: "ssn",
              title: "SSN",
              maskType: "pattern",
              maskSettings: { pattern: "999-99-9999" },
              placeholder: "___-__-____",
            },
            {
              type: "text",
              name: "dateOfBirth",
              title: "Date of birth",
              inputType: "date",
              startWithNewLine: false,
            },
            {
              type: "text",
              name: "phone",
              title: "Phone",
              inputType: "tel",
              maskType: "pattern",
              maskSettings: { pattern: "+1 (999) 999-9999" },
            },
            {
              type: "text",
              name: "email",
              title: "Email",
              inputType: "email",
              startWithNewLine: false,
            },
          ],
        },
        {
          type: "panel",
          name: "injuryPanel",
          title: "Injury details",
          description: "Shown for medical claims.",
          visibleIf: "{claimType} = 'medical'",
          elements: [
            {
              type: "boolean",
              name: "workRelated",
              title: "Was this injury work-related?",
              defaultValue: false,
            },
            {
              type: "text",
              name: "employerName",
              title: "Employer name",
              visibleIf: "{workRelated} = true",
            },
            {
              type: "checkbox",
              name: "bodyParts",
              title: "Affected body parts",
              colCount: 3,
              choices: ["Head", "Neck", "Back", "Arm", "Leg", "Other"],
            },
            {
              type: "comment",
              name: "injuryDescription",
              title: "Describe the injury",
              rows: 3,
            },
          ],
        },
        {
          type: "panel",
          name: "documents",
          title: "Supporting documents",
          elements: [
            {
              type: "file",
              name: "attachments",
              title: "Attach receipts / reports",
              allowMultiple: true,
              storeDataAsText: true,
              maxSize: 10485760,
              acceptedTypes: ".pdf,.png,.jpg,.jpeg",
            },
            {
              type: "boolean",
              name: "consent",
              title: "I authorize release of medical information for this claim",
              isRequired: true,
            },
          ],
        },
      ],
    },
  ],
  completedHtml: "<h4>Claim saved.</h4>",
};

export const insuranceClaimSchema: SchemaDefinition = {
  id: "insurance-claim",
  title: "Insurance Claim",
  description:
    "CRUD entity with masked fields, conditional injury panel, file upload and checkboxes.",
  json: insuranceClaimJson,
};
