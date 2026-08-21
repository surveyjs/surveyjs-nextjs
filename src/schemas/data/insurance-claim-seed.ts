import type { SurveyData } from "../types";

/** A persisted claim record: an id plus the survey response data. */
export interface ClaimRecord {
  readonly id: string;
  readonly data: SurveyData;
}

/**
 * Seed/demo records for the insurance-claim CRUD entity, shaped to match
 * `insuranceClaimJson` question names. The Records list/detail pages read these.
 */
export const insuranceClaimSeed: ClaimRecord[] = [
  {
    id: "CLM-2026-0001",
    data: {
      claimNumber: "CLM-2026-0001",
      status: "approved",
      claimType: "medical",
      dateOfService: "2026-04-12",
      amountClaimed: 1840.5,
      firstName: "Ava",
      lastName: "Nguyen",
      ssn: "521-44-9087",
      dateOfBirth: "1989-02-17",
      phone: "+1 (415) 555-0148",
      email: "ava.nguyen@example.com",
      workRelated: true,
      employerName: "Harbor Logistics",
      bodyParts: ["Back", "Neck"],
      injuryDescription: "Lower-back strain while lifting cargo.",
      consent: true,
    },
  },
  {
    id: "CLM-2026-0002",
    data: {
      claimNumber: "CLM-2026-0002",
      status: "in_review",
      claimType: "dental",
      dateOfService: "2026-05-03",
      amountClaimed: 320,
      firstName: "Marcus",
      lastName: "Bell",
      ssn: "330-21-7765",
      dateOfBirth: "1976-11-30",
      phone: "+1 (206) 555-0193",
      email: "marcus.bell@example.com",
      consent: true,
    },
  },
  {
    id: "CLM-2026-0003",
    data: {
      claimNumber: "CLM-2026-0003",
      status: "submitted",
      claimType: "vision",
      dateOfService: "2026-05-21",
      amountClaimed: 215.75,
      firstName: "Priya",
      lastName: "Shah",
      ssn: "612-08-4421",
      dateOfBirth: "1994-07-09",
      phone: "+1 (312) 555-0172",
      email: "priya.shah@example.com",
      consent: true,
    },
  },
  {
    id: "CLM-2026-0004",
    data: {
      claimNumber: "CLM-2026-0004",
      status: "draft",
      claimType: "medical",
      dateOfService: "2026-06-02",
      amountClaimed: 4720,
      firstName: "Diego",
      lastName: "Ramirez",
      ssn: "489-55-1230",
      dateOfBirth: "1982-03-25",
      phone: "+1 (713) 555-0110",
      email: "diego.ramirez@example.com",
      workRelated: false,
      bodyParts: ["Arm"],
      injuryDescription: "Fractured wrist from a cycling accident.",
      consent: false,
    },
  },
];
