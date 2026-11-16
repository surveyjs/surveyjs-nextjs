// Demo only: surveyjs-integration.json, the list of examples the catalog, the example pages and the docs read.
import config from "../config.ts";
import { readRepoFile } from "../paths.ts";

export type Step = {
  slug: string; section: string; anchor: string; title: string; status: string; page: string; need: string; licence: string;
  endpoints: string[]; files: Record<string, string>; regions: string[]; note?: string; see?: string;
};
export type Manifest = {
  contract: string; platform: string; framework: string; repo: string; branch: string; live?: string; surveyjsVersion: string;
  serverSideWorkflows: string; steps: Step[];
};

let manifest: Manifest | undefined;

export function readManifest(): Manifest {
  return (manifest ??= JSON.parse(readRepoFile("surveyjs-integration.json")) as Manifest);
}

/** The manifest's example with this slug, or undefined. */
export const findStep = (slug: string) => readManifest().steps.find((step) => step.slug === slug);

/** The docs page, at the example's anchor when one is given. */
export const docsUrl = (step?: Step) => config.docs + (step ? `#${step.anchor}` : "");
