
/**
 * Patient intake / medical-insurance form.
 *
 * Demonstrates: paged sections, demographics, insurance coverage with a
 * conditional secondary-insurance panel, a matrix of yes/no medical history,
 * allergies (dynamic rows), and a consent step.
 *
 * Representative V3 JSON — drop-in replaceable with a real patient-intake schema.
 */
export const json = {
  headerView: "advanced",
  title: "Patient Intake (SurveyJS)",
  description: "Tell us about you and your insurance coverage.",
  showProgressBar: true,
  progressBarLocation: "belowheader",
  progressBarType: "pages",
  progressBarShowPageTitles: true,
  progressBarShowPageNumbers: true,
  progressBarNavigationTextLocation: "bottom",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  pages: [
    {
      name: "patient",
      title: "Patient",
      elements: [
        {
          type: "text",
          name: "firstName",
          title: "First name",
          isRequired: true,
          requiredErrorText: "First name is required.",
        },
        {
          type: "text",
          name: "lastName",
          title: "Last name",
          isRequired: true,
          requiredErrorText: "Last name is required.",
          startWithNewLine: false,
        },
        {
          type: "text",
          name: "dob",
          title: "Date of birth",
          inputType: "date",
          isRequired: true,
          requiredErrorText: "Date of birth is required.",
        },
        {
          type: "radiogroup",
          name: "sex",
          title: "Sex assigned at birth",
          startWithNewLine: false,
          choices: [
            { value: "f", text: "Female" },
            { value: "m", text: "Male" },
          ],
        },
        {
          type: "text",
          name: "phone",
          title: "Mobile phone",
          description: "We'll send appointment reminders to this number.",
          descriptionLocation: "underInput",
          inputType: "tel",
          maskType: "pattern",
          maskSettings: { pattern: "+1 (999) 999-9999" },
        },
        {
          type: "dropdown",
          name: "preferredContact",
          title: "Preferred contact method",
          placeholder: "Select an option...",
          startWithNewLine: false,
          choices: ["Phone", "Email", "Text message"],
        },
      ],
    },
    {
      name: "insurance",
      title: "Insurance",
      elements: [
        {
          type: "panel",
          name: "primaryInsurance",
          title: "Primary insurance",
          elements: [
            {
              type: "text",
              name: "carrier",
              title: "Insurance carrier",
              isRequired: true,
              requiredErrorText: "Insurance carrier is required.",
            },
            {
              type: "text",
              name: "memberId",
              title: "Member ID",
              isRequired: true,
              requiredErrorText: "Member ID is required.",
              startWithNewLine: false,
            },
            {
              type: "text",
              name: "groupNumber",
              title: "Group number"
            },
            {
              type: "html",
              name: "groupNumber_spacing",
              startWithNewLine: false
            },
            {
              type: "radiogroup",
              name: "relationshipToInsured",
              title: "Patient is the…",
              defaultValue: "self",
              choices: [
                { value: "self", text: "Policyholder" },
                { value: "spouse", text: "Spouse" },
                { value: "dependent", text: "Dependent" },
              ],
            },
          ],
        },
        {
          type: "boolean",
          name: "hasSecondary",
          title: "Do you have secondary insurance?",
          defaultValue: false,
          displayMode: "switch",
          "titleLocation": "hidden",
        },
        {
          type: "panel",
          name: "secondaryInsurance",
          title: "Secondary insurance",
          visibleIf: "{hasSecondary} = true",
          elements: [
            {
              type: "text",
              name: "carrier2",
              title: "Insurance carrier",
              isRequired: true,
              requiredErrorText: "Insurance carrier is required.",
            },
            {
              type: "text",
              name: "memberId2",
              title: "Member ID",
              isRequired: true,
              requiredErrorText: "Member ID is required.",
              startWithNewLine: false,
            },
          ],
        },
      ],
    },
    {
      name: "history",
      title: "History",
      elements: [
        {
          type: "matrix",
          name: "medicalHistory",
          title: "Have you ever been diagnosed with any of the following?",
          columns: [
            { value: "yes", text: "Yes" },
            { value: "no", text: "No" },
            { value: "unsure", text: "Unsure" },
          ],
          rows: [
            { value: "diabetes", text: "Diabetes" },
            { value: "hypertension", text: "High blood pressure" },
            { value: "asthma", text: "Asthma" },
            { value: "heart", text: "Heart disease" },
          ],
        },
        {
          type: "matrixdynamic",
          name: "allergies",
          title: "Allergies",
          addRowText: "Add allergy",
          rowCount: 0,
          hideColumnsIfEmpty: true,
          noRowsText: "No allergies added.",
          columns: [
            { 
              name: "allergen",
              title: "Allergen",
              cellType: "text",
              isRequired: true,
              requiredErrorText: "Allergen is required.",
              placeholder: "Allergen *"
            },
            {
              name: "severity",
              title: "Severity",
              cellType: "dropdown",
              choices: ["Mild", "Moderate", "Severe"],
              placeholder: "Severity..."
            },
            { name: "reaction", title: "Reaction", cellType: "text", placeholder: "Reaction" },
          ],
        },
        {
          type: "comment",
          name: "currentMedications",
          title: "Current medications",
          rows: 3,
        },
      ],
    },
    {
      name: "consent",
      title: "Consent",
      elements: [
        {
          type: "boolean",
          name: "consentTreatment",
          title: "I consent to treatment",
          displayMode: "checkbox",
          titleLocation: "hidden",
          isRequired: true,
          requiredErrorText: "Consent to treatment is required.",
          validators: [
            {
              type: "expression",
              expression: "{consentTreatment} = true",
              text: "Consent to treatment is required.",
            },
          ],
        },
        {
          type: "boolean",
          name: "consentPrivacy",
          title: "I acknowledge the privacy practices (HIPAA)",
          displayMode: "checkbox",
          titleLocation: "hidden",
          isRequired: true,
          requiredErrorText: "Acknowledgement is required.",
          validators: [
            {
              type: "expression",
              expression: "{consentPrivacy} = true",
              text: "Acknowledgement is required.",
            },
          ],
        },
        {
          type: "text",
          name: "signature",
          title: "Signature",
        },
        {
          type: "text",
          name: "signedDate",
          title: "Date",
          inputType: "date",
          startWithNewLine: false,
        },
      ],
    },
  ],
  completedHtml: "<h4>Thank you. Your intake form has been submitted.</h4>",
};
