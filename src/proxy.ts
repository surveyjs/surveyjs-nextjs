// Demo only: what the example pages need before they render, and nothing else. A Server Component can't set a
// cookie or answer a status other than 404, so this proxy (Next.js 16's name for middleware, on the Node.js runtime)
// does it for the page:
//   - DEMO_MODE=true: demo_sid, the visitor's sandbox cookie, a fresh one when it is missing or invalid, and an
//     invite link's ?join=<demo_sid> (adopted after the same format check; an unknown one gets a fresh sandbox
//     and the header notice "That invite link has expired…")
//   - signInForPage(): each example page and /claim signs in as its own demo user (the demo_user cookie)
//   - /examples/edit-together?form=…: 400 "Invalid form ID"
// The pages and the route handlers read the cookies themselves. Delete this file when you copy an example.
//
// It matches pages only. API requests never pass through it: Next.js buffers the body of every request a proxy sees,
// up to 10 MB, and hands the handler a cut-off body beyond that. route() (src/server/integration/http.ts) gives API
// requests their sandbox instead.
import { NextResponse, type NextRequest } from "next/server";
import settings from "./server/config.ts";
import { parseCookies } from "./server/demo/cookies.ts";
import { isValidId, newSandboxId, resolveSandbox, sandboxCookie, sandboxExists } from "./server/demo/sandbox.ts";
import { signInForPage } from "./server/demo/users.ts";

/** The header a page reads to show "That invite link has expired…" */
export const JOIN_FAILED_HEADER = "x-demo-join-failed";

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const slug = pathname === "/claim" ? "load-definition-variables-data" : /^\/examples\/([a-z0-9-]+)$/.exec(pathname)?.[1];

  if (slug === "edit-together") {
    const form = searchParams.get("form");
    if (form !== null && !/^[A-Za-z0-9_-]{1,64}$/.test(form)) {
      return new NextResponse("<!DOCTYPE html><html lang=\"en\"><title>400</title><p>Invalid form ID</p></html>", {
        status: 400, headers: { "Content-Type": "text/html; charset=utf-8" },
      });
    }
  }

  const cookies = parseCookies(request.headers.get("cookie"));
  const setCookies: string[] = [];
  const headers = new Headers(request.headers);
  headers.delete(JOIN_FAILED_HEADER);   // only this proxy sets it

  if (settings.demoMode) {
    let id = cookies.demo_sid;
    const join = searchParams.get("join");
    if (join !== null) {
      if (sandboxExists(join)) id = join;
      else {
        headers.set(JOIN_FAILED_HEADER, "1");
        id = "";
      }
    }
    if (!isValidId(id)) id = newSandboxId();   // never a file path built from client input
    resolveSandbox(id);
    if (id !== cookies.demo_sid) {
      cookies.demo_sid = id;
      setCookies.push(sandboxCookie(request, id));
    }
  }

  if (slug) {
    const { key, setCookie } = signInForPage(slug, request, cookies.demo_user);
    cookies.demo_user = key;
    if (setCookie) setCookies.push(setCookie);
  }

  // The page sees the cookies it is about to get, as if the browser had sent them
  headers.set("cookie", Object.entries(cookies).map(([name, value]) => `${name}=${encodeURIComponent(value)}`).join("; "));
  const response = NextResponse.next({ request: { headers } });
  for (const line of setCookies) response.headers.append("Set-Cookie", line);
  return response;
}

// Pages only: not /api (bodies, see above), the files Next.js and /shared serve, /demo/stored, /up or /ws
export const config = {
  matcher: ["/((?!api/|_next/|shared/|demo/|ws/|up$|favicon\\.ico$).*)"],
};
