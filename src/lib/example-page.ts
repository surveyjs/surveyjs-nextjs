// Demo only: what every example page.tsx reads before it renders: the manifest step, the page config, the Code tab,
// the signed-in demo user (src/proxy.ts set the cookie) and the page's title and canonical link.
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { findStep } from "../server/demo/manifest.ts";
import { exampleData } from "../server/demo/pages.ts";
import { joinFailed, pageRequest } from "./page-request";

export type SearchParams = Promise<Record<string, string | string[] | undefined>>;

/** The page's data, and the Request built for it (for the few pages that query more). */
export async function examplePage(slug: string, searchParams?: SearchParams, pathname = `/examples/${slug}`) {
  const step = findStep(slug);
  if (!step) notFound();
  const req = await pageRequest(pathname, searchParams);
  return { req, data: exampleData(req, step), joinFailed: await joinFailed() };
}

/** "<example title> · SurveyJS + Next.js", and the canonical link (https behind a TLS proxy). */
export async function exampleMetadata(slug: string, pathname = `/examples/${slug}`): Promise<Metadata> {
  const step = findStep(slug);
  if (!step) notFound();
  const req = await pageRequest(pathname);
  const { origin } = (await import("../server/integration/http.ts")).requestOrigin(req);
  return { title: `${step.title} · SurveyJS + Next.js`, alternates: { canonical: origin + pathname } };
}
