/**
 * Apply website_components migration only (existing FaraiOS schema required).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import pg from "pg";

import {
  migrationsDirFromMeta,
  missingDatabaseUrlHelp,
  resolveDatabaseUrl,
  WEBSITE_COMPONENTS_MIGRATIONS,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);

config({ path: ".env.local" });

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error(missingDatabaseUrlHelp(migrationsDir, WEBSITE_COMPONENTS_MIGRATIONS));
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const { rows } = await client.query(`
    select
      to_regclass('public.companies') is not null as has_companies,
      to_regclass('public.websites') is not null as has_websites
  `);
  const { has_companies, has_websites } = rows[0] ?? {};

  if (!has_companies || !has_websites) {
    console.error(
      "Missing base schema (public.companies or public.websites).\n" +
        "On a fresh Supabase project run:\n" +
        "  npm run db:apply-all-migrations\n" +
        "or:\n" +
        "  npm run db:print-full-schema-sql\n" +
        "and paste the output into Supabase SQL Editor."
    );
    process.exit(1);
  }

  for (const file of WEBSITE_COMPONENTS_MIGRATIONS) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, "utf8");
    await client.query(sql);
    console.log(`✓ Applied ${file}`);
  }
  console.log("\nDone. Website components table is ready.");
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  console.error("\nOn a fresh DB, run: npm run db:print-full-schema-sql");
  process.exit(1);
} finally {
  await client.end();
}
