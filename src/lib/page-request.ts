// Demo only: a Web Request for a page, built from its headers, cookies and search params. The pages are Server
// Components and get no Request of their own; src/server/** takes one (db(req), currentUser(req)), so the pages and
// the route handlers read the same cookies, the same sandbox and the same X-Forwarded-* headers.
import { headers } from "next/headers";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function pageRequest(pathname: string, searchParams?: SearchParams): Promise<Request> {
  const incoming = await headers();
  const url = new URL(pathname, "http://page.local");
  for (const [name, value] of Object.entries((await searchParams) ?? {})) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) url.searchParams.append(name, item);
  }
  // http://<host>: requestOrigin() takes the scheme and host from Host and X-Forwarded-*, never from this URL
  return new Request(new URL(url.pathname + url.search, `http://${incoming.get("host") ?? "localhost"}`), { headers: new Headers(incoming) });
}

/** The proxy's header for an invite link that has expired (src/proxy.ts). */
export async function joinFailed(): Promise<boolean> {
  return (await headers()).get("x-demo-join-failed") === "1";
}
