// A small in-memory cache with expiry, for the countries list. It lives in this process (process-state.ts, so the
// route handlers and the Data panel share it): with several processes or servers, use a shared cache (Redis,
// Memcached, or a table) so they don't each call restcountries.com.
import { processState } from "../process-state.ts";

const entries = processState("cache", () => new Map<string, { value: unknown; expires: number }>());

export const cache = {
  /** The value, or undefined when it is missing or expired. */
  get<T>(key: string): T | undefined {
    const entry = entries.get(key);
    if (entry && entry.expires > Date.now()) return entry.value as T;
    entries.delete(key);
    return undefined;
  },
  has(key: string): boolean {
    return this.get(key) !== undefined;
  },
  set(key: string, value: unknown, ttlMs: number): void {
    entries.set(key, { value, expires: Date.now() + ttlMs });
  },
  clear(): void {
    entries.clear();
  },
};
