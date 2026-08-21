import type { SurveyData } from "../types";

/**
 * Demo "prefill" data for the multi-step Checkout wizard (`checkoutJson`).
 *
 * Keyed by the checkout question names so it can drop straight into a live
 * SurveyModel via `survey.mergeData` — one click fills every page so a reviewer
 * can page through the wizard without typing. Masked fields (phone, zip, card
 * number/expiry/cvc) hold the raw digits the pattern masks expect. Billing
 * fields are prefixed to match the second address panel on the Payment page.
 * Renderer-agnostic: depends on nothing but `SurveyData`.
 */
export const checkoutSample: SurveyData = {
  // Contact
  email: "jordan.avery@example.com",
  phone: "+1 (415) 555-0142",

  // Shipping
  fullName: "Jordan Avery",
  address1: "742 Evergreen Terrace",
  address2: "Apt 4B",
  city: "San Francisco",
  state: "CA",
  zip: "94105",
  shippingMethod: "express",

  // Payment — billing deliberately differs from shipping so one click reveals
  // the conditional billing panel; a branch that never renders can't be
  // reviewed for theme spacing.
  billingSameAsShipping: false,
  billingFullName: "Avery Holdings LLC",
  billingAddress1: "1 Market Street",
  billingAddress2: "Suite 300",
  billingCity: "San Francisco",
  billingState: "CA",
  billingZip: "94105",
  paymentMethod: "card",
  cardNumber: "4242 4242 4242 4242",
  cardExpiry: "08/28",
  cardCvc: "123",

  // Review
  orderNotes: "Please leave the package with the concierge.",
  acceptTerms: true,
};
