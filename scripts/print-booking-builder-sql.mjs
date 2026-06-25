/**
 * Print combined booking builder SQL for Supabase SQL Editor.
 *
 * Usage:
 *   npm run db:print-booking-builder-sql
 *   npm run db:print-booking-builder-sql > booking-builder.sql
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  migrationsDirFromMeta,
  readCombinedMigrationSql,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);
const sql = readCombinedMigrationSql(migrationsDir);

const outPath = join(migrationsDir, "..", "apply-booking-builder-combined.sql");
writeFileSync(outPath, `${sql}\n`, "utf8");

console.log(sql);
console.error(`\n✓ Also saved to ${outPath}`);
