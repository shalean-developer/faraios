/**
 * Apply website_media migration only (existing FaraiOS schema required).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import pg from "pg";

import {
  migrationsDirFromMeta,
  missingDatabaseUrlHelp,
  resolveDatabaseUrl,
  WEBSITE_MEDIA_MIGRATIONS,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);

config({ path: ".env.local" });

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error(missingDatabaseUrlHelp(migrationsDir, WEBSITE_MEDIA_MIGRATIONS));
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

  if (!rows[0]?.has_companies || !rows[0]?.has_websites) {
    console.error("Missing base schema. Apply full migrations first.");
    process.exit(1);
  }

  for (const file of WEBSITE_MEDIA_MIGRATIONS) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}…`);
    await client.query(sql);
    console.log(`Done: ${file}`);
  }

  console.log("website_media migration applied.");
} catch (err) {
  console.error(err);
  process.exit(1);
} finally {
  await client.end();
}
