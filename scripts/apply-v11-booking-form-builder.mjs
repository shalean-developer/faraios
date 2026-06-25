/**
 * Apply pending Supabase migrations for the booking form builder.
 *
 * Connection (first match wins):
 *   DATABASE_URL, SUPABASE_DB_URL, POSTGRES_URL
 *   NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD
 *
 * Without a DB password, use:
 *   npm run db:print-booking-builder-sql
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import pg from "pg";

import {
  BOOKING_BUILDER_MIGRATIONS,
  migrationsDirFromMeta,
  missingDatabaseUrlHelp,
  resolveDatabaseUrl,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);

config({ path: ".env.local" });

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error(missingDatabaseUrlHelp(migrationsDir));
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of BOOKING_BUILDER_MIGRATIONS) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, "utf8");
    await client.query(sql);
    console.log(`✓ Applied ${file}`);
  }
  console.log("\nDone. Reload your booking form dashboard.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  console.error("\nIf the CLI cannot connect, run: npm run db:print-booking-builder-sql");
  console.error("Then paste the SQL into Supabase Dashboard → SQL Editor.");
  process.exit(1);
} finally {
  await client.end();
}
