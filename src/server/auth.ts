// The integration's user and permission hooks. The examples call these and nothing else, so this is where your
// real session lookup and checks go.
import { demoUser, type User } from "./demo/users.ts";

export type { User };

/**
 * The signed-in user, or null. Demo only: the demo_user cookie (demo/users.ts). Your session or token check goes
 * here: Auth.js's auth(), a JWT, your session table…
 */
export function currentUser(req: Request): User | null {
  return demoUser(req);
}

/**
 * May this user do it? Returns null when allowed, or the denial message the 403 answers (Creator shows it).
 * Saving definitions (creator-load-save, lint-definition) and variable presets is an admin action. Your real
 * permission check goes here: roles, teams, form ownership…
 */
export function can(user: User | null, ability: "edit-forms"): string | null {
  if (ability === "edit-forms") {
    return user?.isEditor ? null : "You don't have editor rights: only editors can change forms";
  }
  throw new Error(`Unknown ability ${String(ability)}`);
}

/**
 * May this user read this uploaded file (store-files)? A denial answers 404, not 403, so it doesn't confirm that
 * the file exists. Real apps check ownership here, for example file.owner_id === user.id.
 */
export function canReadFile(user: User | null, file: { id: string; name: string; type: string } | undefined): boolean {
  return user !== null && file !== undefined;
}
