import { Model } from "survey-core";
import type { ItemValue, Question } from "survey-core";
import {
  checkoutSchema,
  insuranceClaimSchema,
  medicalFormSchema,
  type SurveyData,
  type SurveyJSON,
} from "@/schemas";
import type { DemoResponse, DemoState, DemoSurvey } from "./types";

/**
 * The workspace a first-time visitor sees. Fixed ids and dates: the list is
 * rendered on the server from exactly this data, so anything derived from the
 * clock would produce a different string on the client and break hydration.
 */
export const seedSurveys: readonly DemoSurvey[] = [
  {
    id: "medical-intake",
    name: "Patient Intake Form",
    json: medicalFormSchema.json,
    createdAt: "2026-05-14",
    updatedAt: "2026-08-02",
    isPublished: true,
    archived: false,
  },
  {
    id: "insurance-claim",
    name: "Insurance Claim",
    json: insuranceClaimSchema.json,
    createdAt: "2026-06-01",
    updatedAt: "2026-08-18",
    isPublished: true,
    archived: false,
  },
  {
    id: "store-checkout",
    name: "Store Checkout",
    json: checkoutSchema.json,
    createdAt: "2026-07-09",
    updatedAt: "2026-07-30",
    isPublished: false,
    archived: false,
  },
  {
    id: "employee-survey-2025",
    name: "Employee Satisfaction 2025",
    json: checkoutSchema.json,
    createdAt: "2025-11-03",
    updatedAt: "2026-01-20",
    isPublished: false,
    archived: true,
  },
];

/** How many responses each seeded survey gets, so the dashboard has something to chart. */
const RESPONSES_PER_SURVEY = 60;

/** Deterministic PRNG — the demo must generate the same data on every visit. */
function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const FIRST_NAMES = ["Ava", "Liam", "Noah", "Mia", "Ethan", "Zoe", "Lucas", "Nora"];
const LAST_NAMES = ["Nguyen", "Patel", "Garcia", "Kim", "Okafor", "Silva", "Novak"];
const STREETS = ["Market St", "Oak Ave", "Pine Rd", "Harbor Way", "Elm Blvd"];
const CITIES = ["Portland", "Austin", "Denver", "Boston", "Seattle"];
const SENTENCES = [
  "Everything went smoothly, no complaints.",
  "The process took longer than expected.",
  "Support answered quickly and solved it.",
  "Would prefer fewer steps next time.",
  "Clear instructions, easy to follow.",
];

/** ISO day, `offset` days before the fixed reference date. */
function dayBefore(offset: number): string {
  const base = Date.UTC(2026, 7, 20);
  return new Date(base - offset * 86_400_000).toISOString().slice(0, 10);
}

function pick<T>(items: readonly T[], random: () => number): T {
  return items[Math.floor(random() * items.length)];
}

function choiceValues(question: Question): unknown[] {
  const choices = (question as unknown as { choices?: ItemValue[] }).choices;
  if (!Array.isArray(choices)) return [];
  return choices.map((choice) => choice.value);
}

function answerText(question: Question, random: () => number): unknown {
  const name = question.name.toLowerCase();
  const inputType = (question as unknown as { inputType?: string }).inputType;

  if (inputType === "email" || name.includes("email")) {
    return `${pick(FIRST_NAMES, random).toLowerCase()}.${pick(LAST_NAMES, random).toLowerCase()}@example.com`;
  }
  if (inputType === "tel" || name.includes("phone")) {
    return `+1 (415) 555-0${100 + Math.floor(random() * 899)}`;
  }
  if (inputType === "date" || name.includes("date") || name.includes("birth")) {
    return dayBefore(Math.floor(random() * 3650));
  }
  if (inputType === "number" || name.includes("amount") || name.includes("zip")) {
    return Math.round(random() * 4000) / 2;
  }
  if (name.includes("first")) return pick(FIRST_NAMES, random);
  if (name.includes("last")) return pick(LAST_NAMES, random);
  if (name.includes("city")) return pick(CITIES, random);
  if (name.includes("address") || name.includes("street")) {
    return `${100 + Math.floor(random() * 900)} ${pick(STREETS, random)}`;
  }
  return pick(SENTENCES, random);
}

function answerFor(question: Question, random: () => number): unknown {
  switch (question.getType()) {
    case "dropdown":
    case "radiogroup":
    case "buttongroup":
    case "imagepicker": {
      const values = choiceValues(question);
      return values.length ? pick(values, random) : undefined;
    }
    case "checkbox":
    case "tagbox": {
      const values = choiceValues(question);
      if (!values.length) return undefined;
      return values.filter(() => random() < 0.4).slice(0, 3);
    }
    case "boolean":
      return random() < 0.5;
    case "rating": {
      const max = (question as unknown as { rateMax?: number }).rateMax ?? 5;
      return 1 + Math.floor(random() * max);
    }
    case "comment":
      return pick(SENTENCES, random);
    case "text":
      return answerText(question, random);
    default:
      return undefined;
  }
}

/**
 * Build plausible responses for a survey definition by walking its questions.
 * Deterministic for a given `(json, seedKey)` pair, so the dashboard shows the
 * same charts on every visit and in tests.
 */
export function generateResponses(
  json: SurveyJSON,
  surveyId: string,
  count: number,
): DemoResponse[] {
  const model = new Model(json);
  const questions = model.getAllQuestions();
  const responses: DemoResponse[] = [];

  for (let i = 0; i < count; i++) {
    const random = mulberry32(hashString(`${surveyId}:${i}`));
    const data: SurveyData = {};
    for (const question of questions) {
      const value = answerFor(question, random);
      if (value !== undefined && !(Array.isArray(value) && value.length === 0)) {
        data[question.getValueName()] = value;
      }
    }
    responses.push({
      id: `${surveyId}-r${String(i + 1).padStart(3, "0")}`,
      surveyId,
      submittedAt: dayBefore(Math.floor(i * 1.5)),
      data,
    });
  }

  return responses;
}

/** The full first-visit workspace, responses included. */
export function createSeedState(): DemoState {
  return {
    surveys: seedSurveys,
    responses: seedSurveys
      .filter((survey) => !survey.archived)
      .flatMap((survey) =>
        generateResponses(survey.json, survey.id, RESPONSES_PER_SURVEY),
      ),
  };
}

/**
 * What the server renders. Responses are left out on purpose: they are only
 * needed by the dashboard, which is client-only anyway, and generating 180 of
 * them on every request would be wasted work.
 */
export const serverState: DemoState = {
  surveys: seedSurveys,
  responses: [],
};
