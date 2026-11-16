// Demo only: a demo_user cookie picks Alice (premium, editor), Bob (basic, viewer) or Signed out ("none").
// Real apps find the user from their session or token here (Auth.js, a JWT check, your session table); the
// examples only call currentUser(req) and the hooks in auth.ts.
//
// Pages that show user context or authorization offer a switch (PAGES). Every other page signs in as Alice,
// so a choice made on one page never breaks another. src/proxy.ts calls signInForPage() for every example page.
import type { DatabaseSync } from "node:sqlite";
import { db } from "../db.ts";
import { requestOrigin } from "../integration/http.ts";
import { requestCookies, serializeCookie } from "./cookies.ts";

export type User = { id: number; key: string; name: string; email: string; plan: string; isEditor: boolean };

export const USERS = ["alice", "bob"];

export const LABELS: Record<string, string> = { alice: "Alice (premium, editor)", bob: "Bob (basic, viewer)", none: "Signed out" };

/** Example slug => the users its switch offers. The first is the default. */
export const PAGES: Record<string, string[]> = {
  "load-definition-variables-data": ["alice", "bob"],   // compare premium and basic customer variables
  "resume-progress": ["alice", "bob"],                  // keep an independent draft for each respondent
  "creator-load-save": ["alice", "bob"],                // Bob's saves answer 403 (can(user, "edit-forms"))
};

/** The users an example page offers; one means no switch. */
export const forPage = (slug: string) => PAGES[slug] ?? ["alice"];

type UserRow = { id: number; key: string; name: string; email: string; plan: string; is_editor: number };

/** The user with this key from the request's database (the sandbox's in demo mode), or null. The relays pass their database. */
export function findUser(source: Request | DatabaseSync, key: string | undefined | null): User | null {
  if (!key || !USERS.includes(key)) return null;
  const row = db(source).prepare("SELECT id, key, name, email, plan, is_editor FROM users WHERE key = ?").get(key) as UserRow | undefined;
  return row ? { id: row.id, key: row.key, name: row.name, email: row.email, plan: row.plan, isEditor: row.is_editor === 1 } : null;
}

/** The request's demo user from the cookie, or null when it is absent, unknown or "none" (signed out). */
export const demoUser = (req: Request) => findUser(req, requestCookies(req).demo_user);

/**
 * For an example page (src/proxy.ts): keep the cookie's user if the page offers it, otherwise sign in as the
 * page's default. Returns the key to sign in as, and the Set-Cookie line when it changed.
 */
export function signInForPage(slug: string, req: Request | { headers: Headers }, current: string | undefined): { key: string; setCookie: string | null } {
  const users = forPage(slug);
  if (current && users.includes(current)) return { key: current, setCookie: null };
  // src/demo/host.ts reads this cookie and writes it back when the tab gets focus, so it isn't HttpOnly
  const secure = requestOrigin(req).protocol === "https";
  return { key: users[0], setCookie: serializeCookie("demo_user", users[0], { maxAge: 365 * 24 * 3600, secure, httpOnly: false }) };
}

/** The current demo user's key: alice, bob or none. */
export const userKey = (user: User | null) => user?.key ?? "none";
