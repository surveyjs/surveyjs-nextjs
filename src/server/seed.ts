// Creates the tables and seeds them from shared/seed/*.json, the files every platform seeds from. Idempotent:
// an existing database keeps its data and only gains the forms it is missing. `npm run setup` runs it, and so does
// the first `npm run dev` or `npm start` on an empty DATA_DIR.
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { database, transaction } from "./db.ts";
import { timestamp } from "./integration/stored-json.ts";
import { readShared } from "./paths.ts";

type Row = Record<string, unknown>;
type Claim = { data: Row & { customer_email: string; amount: number }; daysAgo: number; definitionVersion: string | null };
type Seeded = { data: Row; daysAgo: number };

// The tables the integration docs name. Definitions, responses, progress and presets are JSON documents kept as
// text, exactly as they arrived. created_at is ISO 8601 UTC, so `created_at >= from` is a string comparison.
const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY, key TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE,
    plan TEXT NOT NULL DEFAULT 'basic', is_editor INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS forms (key TEXT PRIMARY KEY, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS responses (
    id INTEGER PRIMARY KEY AUTOINCREMENT, form_id TEXT NOT NULL, definition_version TEXT, data TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS responses_form_id ON responses (form_id, created_at);
  CREATE TABLE IF NOT EXISTS progress (key TEXT PRIMARY KEY, json TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS files (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS offices (id TEXT PRIMARY KEY, name TEXT NOT NULL, region TEXT NOT NULL);
  CREATE INDEX IF NOT EXISTS offices_region ON offices (region);
  CREATE TABLE IF NOT EXISTS customers (email TEXT PRIMARY KEY);
  CREATE TABLE IF NOT EXISTS shipping_rates (postcode_prefix TEXT PRIMARY KEY, price REAL NOT NULL);
  CREATE TABLE IF NOT EXISTS claims (
    id INTEGER PRIMARY KEY AUTOINCREMENT, response_id INTEGER NOT NULL REFERENCES responses (id),
    customer_email TEXT, amount REAL
  );
  CREATE TABLE IF NOT EXISTS variable_presets (key TEXT PRIMARY KEY, json TEXT NOT NULL);
`;

/** Create and seed the database at path (the app's, or a test's), and the uploads folder next to it. Returns true when it seeded an empty one. */
export function seed(path: string): boolean {
  mkdirSync(join(dirname(path), "files"), { recursive: true });   // the uploads (store-files), named by id
  const handle = database(path);
  handle.exec(SCHEMA);

  // Every form in seed/forms.json, also into an existing database that lacks one
  const addForm = handle.prepare("INSERT OR IGNORE INTO forms (key, json) VALUES (?, ?)");
  for (const [key, file] of Object.entries(readShared<Record<string, string>>("seed/forms.json"))) {
    addForm.run(key, JSON.stringify(readShared(`definitions/${file}`)));
  }

  if ((handle.prepare("SELECT COUNT(*) AS n FROM users").get() as { n: number }).n > 0) return false;

  transaction(handle, () => {
    // Demo only: Alice (premium, editor) and Bob (basic, viewer); demo/users.ts signs them in from a cookie
    const user = handle.prepare("INSERT INTO users (id, key, name, email, plan, is_editor) VALUES (?, ?, ?, ?, ?, ?)");
    user.run(1, "alice", "Alice Martin", "alice@example.com", "premium", 1);
    user.run(2, "bob", "Bob Fischer", "bob@example.com", "basic", 0);

    const office = handle.prepare("INSERT INTO offices (id, name, region) VALUES (?, ?, ?)");
    for (const o of readShared<{ id: string; name: string; region: string }[]>("seed/offices.json")) office.run(o.id, o.name, o.region);
    const customer = handle.prepare("INSERT INTO customers (email) VALUES (?)");
    for (const email of readShared<string[]>("seed/customers.json")) customer.run(email);
    const rate = handle.prepare("INSERT INTO shipping_rates (postcode_prefix, price) VALUES (?, ?)");
    for (const r of readShared<{ postcode_prefix: string; price: number }[]>("seed/shipping-rates.json")) rate.run(r.postcode_prefix, r.price);

    const response = handle.prepare("INSERT INTO responses (form_id, definition_version, data, created_at) VALUES (?, ?, ?, ?)");
    // The same times as the reference: daysAgo days back, at 09:00 + daysAgo % 9 hours and (daysAgo * 7) % 60 minutes
    const at = (daysAgo: number) => {
      const date = new Date();
      date.setUTCDate(date.getUTCDate() - daysAgo);
      date.setUTCHours(9 + (daysAgo % 9), (daysAgo * 7) % 60, 0, 0);
      return timestamp(date);
    };
    const insert = (formId: string, data: Row, createdAt: string, version: string | null = null) =>
      Number(response.run(formId, version, JSON.stringify(data), createdAt).lastInsertRowid);

    const claim = handle.prepare("INSERT INTO claims (response_id, customer_email, amount) VALUES (?, ?, ?)");
    for (const c of readShared<Claim[]>("seed/claims.json")) {
      claim.run(insert("claim", c.data, at(c.daysAgo), c.definitionVersion), c.data.customer_email, c.data.amount);
    }
    for (const sheet of readShared<Seeded[]>("seed/job-sheets.json")) insert("job-sheet", sheet.data, at(sheet.daysAgo));
    for (const row of readShared<Seeded[]>("seed/feedback-responses.json")) insert("feedback", row.data, at(row.daysAgo));

    const presets = handle.prepare("INSERT INTO variable_presets (key, json) VALUES (?, ?)");
    for (const [formId, list] of Object.entries(readShared<Record<string, unknown>>("seed/variable-presets.json"))) presets.run(formId, JSON.stringify(list));

    // load-definition-variables-data: one claim request per demo user, saved now
    for (const data of readShared<Row[]>("seed/claim-requests.json")) insert("claim", data, timestamp());
  });
  return true;
}
