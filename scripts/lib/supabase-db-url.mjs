import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BOOKING_BUILDER_MIGRATIONS = [
  "20260705000000_v11_booking_form_builder.sql",
  "20260705120000_companies_updated_at.sql",
];

export const WEBSITE_COMPONENTS_MIGRATIONS = ["20260709000000_website_components.sql"];

export const WEBSITE_MEDIA_MIGRATIONS = ["20260710000000_website_media.sql"];

export const CONTENT_BLOG_TAXONOMY_MIGRATIONS = ["20260711000000_content_blog_taxonomy.sql"];

export function migrationsDirFromMeta(metaUrl) {
  return join(dirname(fileURLToPath(metaUrl)), "../supabase/migrations");
}

export function listAllMigrationFiles(migrationsDir) {
  return readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
}

export function readCombinedMigrationSql(migrationsDir, files) {
  return files
    .map((file) => {
      const sql = readFileSync(join(migrationsDir, file), "utf8").trim();
      return `-- ${file}\n${sql}`;
    })
    .join("\n\n");
}

/** Extract project ref from https://abcdefgh.supabase.co */
export function supabaseProjectRef(supabaseUrl) {
  if (!supabaseUrl) return null;
  try {
    const host = new URL(supabaseUrl).hostname;
    const ref = host.split(".")[0];
    return ref || null;
  } catch {
    return null;
  }
}

/**
 * Resolve a Postgres connection string from common FaraiOS env vars.
 * Does not log secrets.
 *
 * Prefer DATABASE_URL / SUPABASE_DB_URL from the Supabase dashboard (Session pooler URI).
 * Direct db.PROJECT_REF.supabase.co is IPv6-only on many projects and often fails on Windows.
 */
export function resolveDatabaseUrl(env = process.env) {
  const direct =
    env.DATABASE_URL?.trim() ||
    env.SUPABASE_DB_URL?.trim() ||
    env.POSTGRES_URL?.trim() ||
    env.SUPABASE_DATABASE_URL?.trim();

  if (direct) return direct;

  const password =
    env.SUPABASE_DB_PASSWORD?.trim() ||
    env.POSTGRES_PASSWORD?.trim() ||
    env.DB_PASSWORD?.trim();

  if (!password) return null;

  const ref = supabaseProjectRef(env.NEXT_PUBLIC_SUPABASE_URL?.trim());
  if (!ref) return null;

  const region = env.SUPABASE_DB_REGION?.trim();
  const poolerHost = env.SUPABASE_DB_POOLER_HOST?.trim();
  if (region || poolerHost) {
    const host = poolerHost || `aws-0-${region}.pooler.supabase.com`;
    const port = env.SUPABASE_DB_POOLER_PORT?.trim() || "5432";
    const user = env.SUPABASE_DB_USER?.trim() || `postgres.${ref}`;
    const database = env.SUPABASE_DB_NAME?.trim() || "postgres";
    return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
  }

  const host = env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
  const port = env.SUPABASE_DB_PORT?.trim() || "5432";
  const user = env.SUPABASE_DB_USER?.trim() || "postgres";
  const database = env.SUPABASE_DB_NAME?.trim() || "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function databaseConnectionHelp(migrationsDir, files) {
  const migrationPaths = files.map((file) => join(migrationsDir, file));
  return [
    "Could not connect to Postgres.",
    "",
    "Your Supabase direct DB host (db.PROJECT_REF.supabase.co) is often IPv6-only.",
    "On Windows that causes getaddrinfo ENOENT or ENETUNREACH from Node.",
    "",
    "Option A — SQL Editor (recommended, no CLI):",
    "  npm run db:print-content-blog-taxonomy-sql",
    "  Paste supabase/apply-content-blog-taxonomy-combined.sql into",
    "  Supabase Dashboard → SQL Editor → Run",
    "",
    "Option B — Session pooler URI in .env.local:",
    "  Supabase Dashboard → Project Settings → Database → Connection string",
    "  Choose \"Session pooler\" / \"URI\" and add as:",
    "  DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres",
    "",
    "Option C — Build pooler URL from region + password:",
    "  SUPABASE_DB_PASSWORD=your-database-password",
    "  SUPABASE_DB_REGION=eu-west-2   (from the same Database settings page)",
    "",
    "Option D — Direct host override:",
    "  SUPABASE_DB_HOST=aws-0-REGION.pooler.supabase.com",
    "  SUPABASE_DB_USER=postgres.PROJECT_REF",
    "  SUPABASE_DB_PASSWORD=your-database-password",
    "",
    "Migration files:",
    ...migrationPaths,
  ].join("\n");
}

export function missingDatabaseUrlHelp(migrationsDir, files = BOOKING_BUILDER_MIGRATIONS) {
  const migrationPaths = files.map((file) => join(migrationsDir, file));
  return [
    "No Postgres connection string found.",
    "",
    "Option A — SQL Editor (no password needed):",
    "  npm run db:print-booking-builder-sql",
    "  Copy the output into Supabase Dashboard → SQL Editor → Run",
    "",
    "Option B — CLI with database password:",
    "  Add to .env.local (from Supabase → Project Settings → Database → Database password):",
    "  SUPABASE_DB_PASSWORD=your-database-password",
    "",
    "  Then run again:",
    "  npm run db:apply-booking-builder",
    "",
    "Option C — full connection string:",
    "  DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres",
    "",
    "Migration files:",
    ...migrationPaths,
  ].join("\n");
}
