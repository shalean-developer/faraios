/**
 * Print website_components migration SQL for Supabase SQL Editor.
 * Requires public.companies and public.websites — use db:print-full-schema-sql on a fresh DB.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  migrationsDirFromMeta,
  readCombinedMigrationSql,
  WEBSITE_COMPONENTS_MIGRATIONS,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);
const header = [
  "-- Website builder saved components",
  "-- Prerequisite: public.companies and public.websites must exist.",
  "-- On a fresh project, run: npm run db:print-full-schema-sql",
  "",
].join("\n");
const sql = `${header}\n${readCombinedMigrationSql(migrationsDir, WEBSITE_COMPONENTS_MIGRATIONS)}`;

const outPath = join(migrationsDir, "..", "apply-website-components-combined.sql");
writeFileSync(outPath, `${sql}\n`, "utf8");

console.log(sql);
console.error(`\n✓ Also saved to ${outPath}`);
