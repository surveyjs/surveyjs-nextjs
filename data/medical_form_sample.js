
/**
 * Demo "prefill" data for the Patient Intake form (`medicalFormJson`).
 *
 * Keyed by the medical-form question names so it can drop straight into a live
 * SurveyModel (via `survey.mergeData`) AND map field-for-field onto the native
 * column's controlled state — both columns on the Claims route share THIS one
 * object, so the SurveyJS form and its hand-built twin prefill to identical
 * answers. Renderer-agnostic: depends on nothing but `SurveyData`.
 *
 */
export const sample = {
  // Patient
  firstName: "Jordan",
  lastName: "Avery",
  dob: "1990-06-15",
  sex: "f",
  phone: "+1 (415) 555-0142",
  preferredContact: "Email",

  // Insurance
  carrier: "BlueCross BlueShield",
  memberId: "BCBS-884512200",
  groupNumber: "GRP-55821",
  relationshipToInsured: "self",
  hasSecondary: true,
  carrier2: "Aetna",
  memberId2: "AET-220148",

  // History
  medicalHistory: {
    diabetes: "no",
    hypertension: "yes",
    asthma: "no",
    heart: "unsure",
  },
  allergies: [
    { allergen: "Penicillin", severity: "Severe", reaction: "Hives" },
    { allergen: "Peanuts", severity: "Moderate", reaction: "Swelling" },
  ],
  currentMedications: "Lisinopril 10 mg once daily.",

  // Consent
  consentTreatment: true,
  consentPrivacy: true,
  signature: "Jordan Avery",
  signedDate: "2026-06-29",
};
