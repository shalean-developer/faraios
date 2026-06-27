/**
 * Print ALL Supabase migrations for a fresh database (SQL Editor).
 *
 * Usage:
 *   npm run db:print-full-schema-sql
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  listAllMigrationFiles,
  migrationsDirFromMeta,
  readCombinedMigrationSql,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);
const files = listAllMigrationFiles(migrationsDir);
const header = [
  "-- FaraiOS full schema",
  "-- Run ONCE on a FRESH Supabase project (SQL Editor → New query → Run).",
  "-- Do NOT re-run if you already applied bootstrap or partial migrations.",
  "-- If the DB already has tables, use: npm run db:apply-website-components",
  `-- ${files.length} migrations in timestamp order.`,
  "",
].join("\n");
const sql = `${header}\n${readCombinedMigrationSql(migrationsDir, files)}`;

const outPath = join(migrationsDir, "..", "apply-full-schema-combined.sql");
writeFileSync(outPath, `${sql}\n`, "utf8");

console.log(sql);
console.error(`\n✓ Also saved to ${outPath}`);
