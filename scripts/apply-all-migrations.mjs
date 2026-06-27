/**
 * Apply all Supabase migrations in timestamp order.
 *
 * Connection: DATABASE_URL, SUPABASE_DB_URL, or NEXT_PUBLIC_SUPABASE_URL + SUPABASE_DB_PASSWORD
 *
 * Without a DB password:
 *   npm run db:print-full-schema-sql
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import pg from "pg";

import {
  listAllMigrationFiles,
  migrationsDirFromMeta,
  missingDatabaseUrlHelp,
  resolveDatabaseUrl,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);
const files = listAllMigrationFiles(migrationsDir);

config({ path: ".env.local" });

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error(missingDatabaseUrlHelp(migrationsDir, files));
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of files) {
    const path = join(migrationsDir, file);
    const sql = readFileSync(path, "utf8");
    await client.query(sql);
    console.log(`✓ Applied ${file}`);
  }
  console.log(`\nDone. Applied ${files.length} migrations.`);
} catch (error) {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  console.error("\nIf the CLI cannot connect, run: npm run db:print-full-schema-sql");
  console.error("Then paste the SQL into Supabase Dashboard → SQL Editor.");
  process.exit(1);
} finally {
  await client.end();
}
