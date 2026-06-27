/**
 * Print content blog taxonomy migration SQL for Supabase SQL Editor.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  CONTENT_BLOG_TAXONOMY_MIGRATIONS,
  migrationsDirFromMeta,
  readCombinedMigrationSql,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);
const header = [
  "-- Website builder blog categories and tags",
  "-- Prerequisite: public.content_posts must exist.",
  "",
].join("\n");
const sql = `${header}\n${readCombinedMigrationSql(migrationsDir, CONTENT_BLOG_TAXONOMY_MIGRATIONS)}`;

const outPath = join(migrationsDir, "..", "apply-content-blog-taxonomy-combined.sql");
writeFileSync(outPath, `${sql}\n`, "utf8");

console.log(sql);
console.error(`\n✓ Also saved to ${outPath}`);
