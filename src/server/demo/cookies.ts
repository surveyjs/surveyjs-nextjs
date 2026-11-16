// Demo only: the Cookie header as an object and Set-Cookie lines, in place of a cookie library; the demo reads and
// writes two cookies (demo_sid, demo_user). Handlers read them from the Request, so they stay plain Web code.

/** The Cookie header of a Request (or of a Node upgrade request) as an object. */
export function parseCookies(header: string | null | undefined): Record<string, string> {
  const cookies: Record<string, string> = Object.create(null);
  for (const part of (header ?? "").split(";")) {
    const at = part.indexOf("=");
    const name = part.slice(0, at).trim();
    if (at > 0 && !(name in cookies)) cookies[name] = decode(part.slice(at + 1).trim());
  }
  return cookies;
}

const decode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;   // a stray % is kept as it is, never an error
  }
};

/** The cookies of a Request. */
export const requestCookies = (req: Request) => parseCookies(req.headers.get("cookie"));

/** A Set-Cookie line: Path=/, SameSite=Lax, Secure when the visitor's scheme is https. */
export function serializeCookie(name: string, value: string, { maxAge, secure, httpOnly }: { maxAge: number; secure: boolean; httpOnly: boolean }) {
  return [`${name}=${encodeURIComponent(value)}`, `Max-Age=${maxAge}`, "Path=/", "SameSite=Lax", secure && "Secure", httpOnly && "HttpOnly"]
    .filter(Boolean).join("; ");
}
