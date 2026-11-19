// npm run setup: creates .env (the private keys) from .env.example when there is none, DATA_DIR, the SQLite database
// and the seed.
// `npm run dev` and `npm start` create and seed a missing database themselves; this makes the first run explicit.
// Running it again adds only what is missing.
import { copyFileSync, existsSync } from "node:fs";
import { join } from "node:path";

process.chdir(join(import.meta.dirname, ".."));
if (!existsSync(".env")) {
  copyFileSync(".env.example", ".env");
  console.log("Created .env from .env.example");
}
// As server.ts loads them: variables already set win, then .env, then settings.env
process.loadEnvFile(".env");
process.loadEnvFile("settings.env");

const { default: config } = await import("../src/server/config.ts");
const { close } = await import("../src/server/db.ts");
const { seed } = await import("../src/server/seed.ts");

const seeded = seed(config.databasePath);
close();
console.log(seeded ? `Created and seeded ${config.databasePath}` : `${config.databasePath} is already seeded; added any missing forms`);
