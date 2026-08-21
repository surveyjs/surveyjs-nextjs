import type { SchemaDefinition, SurveyJSON } from "./types";

/** Options for {@link addressPanel}. */
interface AddressPanelOptions {
  /** Panel name (unique within the survey). */
  name: string;
  /** Panel title shown above the fields. */
  title: string;
  /**
   * Prefix applied to every question name. `""` keeps the bare names
   * (`fullName`, `city`, ...); `"billing"` camel-cases them into
   * `billingFullName`, `billingCity`, ...
   */
  prefix?: string;
  /**
   * HTML autocomplete section token. Browsers use it to keep two address
   * blocks apart — without it, autofill overwrites billing with shipping.
   */
  section: "shipping" | "billing";
  /** Optional expression gating the whole panel. */
  visibleIf?: string;
}

/**
 * Build a US postal-address panel.
 *
 * The checkout collects two structurally identical addresses (shipping and
 * billing), so both are generated here: same fields, same ZIP mask, same
 * two-up City / State / ZIP layout. Question names stay **flat** (`city`,
 * `billingCity`) rather than nested under a composite question, which keeps
 * `{question}` piping on the review page and the seed data working unchanged.
 */
function addressPanel({
  name,
  title,
  prefix = "",
  section,
  visibleIf,
}: AddressPanelOptions): SurveyJSON {
  /** `("city")` -> `"city"` unprefixed, `"billingCity"` when prefixed. */
  const q = (base: string) =>
    prefix ? prefix + base.charAt(0).toUpperCase() + base.slice(1) : base;

  return {
    type: "panel",
    name,
    title,
    ...(visibleIf ? { visibleIf } : {}),
    elements: [
      {
        type: "text",
        name: q("fullName"),
        title: "Full name",
        isRequired: true,
        autocomplete: `${section} name`,
      },
      {
        type: "text",
        name: q("address1"),
        title: "Address line 1",
        isRequired: true,
        autocomplete: `${section} address-line1`,
      },
      {
        type: "text",
        name: q("address2"),
        title: "Address line 2",
        autocomplete: `${section} address-line2`,
      },
      {
        type: "text",
        name: q("city"),
        title: "City",
        isRequired: true,
        autocomplete: `${section} address-level2`,
      },
      {
        type: "dropdown",
        name: q("state"),
        title: "State",
        startWithNewLine: false,
        choices: ["CA", "NY", "TX", "FL", "IL", "WA", "MA", "PA"],
        autocomplete: `${section} address-level1`,
      },
      {
        type: "text",
        name: q("zip"),
        title: "ZIP code",
        isRequired: true,
        maskType: "pattern",
        maskSettings: { pattern: "99999" },
        startWithNewLine: false,
        autocomplete: `${section} postal-code`,
      },
    ],
  };
}

/**
 * Multi-step checkout flow.
 *
 * Demonstrates: paged wizard (`pages` + progress bar), required validation,
 * input masks (card / expiry), conditional payment panels (`visibleIf`), a
 * conditional billing address gated by a boolean toggle, and a read-only
 * review summary built from earlier answers via `{question}` piping.
 *
 * Representative V3 JSON — drop-in replaceable with a real checkout schema.
 */
export const checkoutJson: SurveyJSON = {
  title: "Checkout",
  description: "Complete your order in a few quick steps.",
  showTOC: true,
  showQuestionNumbers: "off",
  widthMode: "responsive",
  questionErrorLocation: "bottom",
  // Explicit (this is also the default): a billing address that was typed and
  // then hidden again by the toggle must never reach the submitted data.
  clearInvisibleValues: "onComplete",
  pages: [
    {
      name: "contact",
      title: "Contact",
      elements: [
        {
          type: "text",
          name: "email",
          title: "Email address",
          inputType: "email",
          isRequired: true,
          autocomplete: "email",
          placeholder: "you@example.com",
        },
        {
          type: "text",
          name: "phone",
          title: "Phone",
          inputType: "tel",
          maskType: "pattern",
          maskSettings: { pattern: "+1 (999) 999-9999" },
          placeholder: "+1 (___) ___-____",
        },
      ],
    },
    {
      name: "shipping",
      title: "Shipping",
      elements: [
        addressPanel({
          name: "shippingAddress",
          title: "Shipping address",
          section: "shipping",
        }),
        {
          type: "radiogroup",
          name: "shippingMethod",
          title: "Shipping method",
          isRequired: true,
          colCount: 1,
          defaultValue: "standard",
          choices: [
            { value: "standard", text: "Standard (3–5 business days) — Free" },
            { value: "express", text: "Express (2 business days) — $12" },
            { value: "overnight", text: "Overnight — $29" },
          ],
        },
      ],
    },
    {
      name: "payment",
      title: "Payment",
      elements: [
        // Billing comes first: the toggle gates a whole block of fields, and
        // the billing address belongs to whoever is paying — not to the card.
        {
          type: "boolean",
          name: "billingSameAsShipping",
          title: "Billing address is the same as shipping",
          defaultValue: true,
        },
        addressPanel({
          name: "billingAddress",
          title: "Billing address",
          prefix: "billing",
          section: "billing",
          visibleIf: "{billingSameAsShipping} = false",
        }),
        {
          type: "radiogroup",
          name: "paymentMethod",
          title: "Payment method",
          isRequired: true,
          defaultValue: "card",
          choices: [
            { value: "card", text: "Credit / debit card" },
            { value: "paypal", text: "PayPal" },
          ],
        },
        {
          type: "panel",
          name: "cardPanel",
          title: "Card details",
          visibleIf: "{paymentMethod} = 'card'",
          elements: [
            {
              type: "text",
              name: "cardNumber",
              title: "Card number",
              isRequired: true,
              maskType: "pattern",
              maskSettings: { pattern: "9999 9999 9999 9999" },
              placeholder: "1234 5678 9012 3456",
            },
            {
              type: "text",
              name: "cardExpiry",
              title: "Expiry",
              isRequired: true,
              maskType: "pattern",
              maskSettings: { pattern: "99/99" },
              placeholder: "MM/YY",
            },
            {
              type: "text",
              name: "cardCvc",
              title: "CVC",
              isRequired: true,
              startWithNewLine: false,
              maskType: "pattern",
              maskSettings: { pattern: "999" },
            },
          ],
        },
      ],
    },
    {
      name: "review",
      title: "Review",
      elements: [
        {
          type: "expression",
          name: "reviewEmail",
          title: "Email",
          expression: "{email}",
        },
        {
          type: "expression",
          name: "reviewShipTo",
          title: "Ship to",
          expression: "iif({fullName} notempty, {fullName} + ', ' + {city}, '—')",
        },
        {
          type: "expression",
          name: "reviewBillTo",
          title: "Bill to",
          expression:
            "iif({billingSameAsShipping} = false and {billingAddress1} notempty, {billingAddress1} + ', ' + {billingCity}, 'Same as shipping')",
        },
        {
          type: "comment",
          name: "orderNotes",
          title: "Order notes (optional)",
          rows: 3,
        },
        {
          type: "boolean",
          name: "acceptTerms",
          title: "I agree to the terms of sale",
          isRequired: true,
        },
      ],
    },
  ],
  completedHtml: "<h4>Thanks! Your order has been placed.</h4>",
};

export const checkoutSchema: SchemaDefinition = {
  id: "checkout",
  title: "Checkout",
  description: "Multi-step checkout wizard with masked payment fields and a review summary.",
  json: checkoutJson,
};
