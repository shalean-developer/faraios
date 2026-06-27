/**
 * Apply content blog taxonomy migration only (requires content_posts).
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { config } from "dotenv";
import pg from "pg";

import {
  CONTENT_BLOG_TAXONOMY_MIGRATIONS,
  databaseConnectionHelp,
  migrationsDirFromMeta,
  missingDatabaseUrlHelp,
  resolveDatabaseUrl,
} from "./lib/supabase-db-url.mjs";

const migrationsDir = migrationsDirFromMeta(import.meta.url);

config({ path: ".env.local" });

const databaseUrl = resolveDatabaseUrl();

if (!databaseUrl) {
  console.error(missingDatabaseUrlHelp(migrationsDir, CONTENT_BLOG_TAXONOMY_MIGRATIONS));
  process.exit(1);
}

const client = new pg.Client({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();

  const { rows } = await client.query(`
    select to_regclass('public.content_posts') is not null as has_content_posts
  `);

  if (!rows[0]?.has_content_posts) {
    console.error("Missing public.content_posts. Apply V5 growth engine migrations first.");
    process.exit(1);
  }

  for (const file of CONTENT_BLOG_TAXONOMY_MIGRATIONS) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    console.log(`Applying ${file}…`);
    await client.query(sql);
    console.log(`Done: ${file}`);
  }

  console.log("content_blog_taxonomy migration applied.");
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : null;
  if (code === "ENOENT" || code === "ENETUNREACH" || code === "ENOTFOUND") {
    console.error(databaseConnectionHelp(migrationsDir, CONTENT_BLOG_TAXONOMY_MIGRATIONS));
  } else {
    console.error(err);
  }
  process.exit(1);
} finally {
  await client.end();
}
