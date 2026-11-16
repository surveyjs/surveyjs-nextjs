// ESLint 9 with a flat config (next lint is gone in Next.js 16): Next.js's core-web-vitals and TypeScript rules.
// shared/ is a copy of the reference's files and is checked in surveyjs-php-laravel; the generated shadcn
// components are linted as the CLI writes them.
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  {
    rules: {
      // Every page is a full load, as in the reference: each starts with a fresh requests log and fresh cookies, and
      // the client router makes no ?_rsc= requests that the log would have to hide
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", "shared/**", "storage/**", "test-results*/**", "playwright-report*/**"]),
]);
