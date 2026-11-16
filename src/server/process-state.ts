// One process, two module graphs: server.ts loads src/server/** through Node (the relays, the prune timer), and the
// route handlers, pages and proxy load it again through Next.js's bundle. Module-level state would exist twice, so
// what both must see lives here, on globalThis under a registered symbol: the open SQLite handles (a pruned sandbox
// must close the handles the route handlers opened: Windows can't delete an open file) and the sandboxes in use.

/** The process-wide value named `name`, created on first use by whichever module graph asks first. */
export function processState<T>(name: string, create: () => T): T {
  const key = Symbol.for(`surveyjs.${name}`);
  const store = globalThis as unknown as Record<symbol, T | undefined>;
  return (store[key] ??= create());
}
