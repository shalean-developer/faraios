import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const BOOKING_BUILDER_MIGRATIONS = [
  "20260705000000_v11_booking_form_builder.sql",
  "20260705120000_companies_updated_at.sql",
];

export function migrationsDirFromMeta(metaUrl) {
  return join(dirname(fileURLToPath(metaUrl)), "../supabase/migrations");
}

export function readCombinedMigrationSql(migrationsDir, files = BOOKING_BUILDER_MIGRATIONS) {
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

  const host = env.SUPABASE_DB_HOST?.trim() || `db.${ref}.supabase.co`;
  const port = env.SUPABASE_DB_PORT?.trim() || "5432";
  const user = env.SUPABASE_DB_USER?.trim() || "postgres";
  const database = env.SUPABASE_DB_NAME?.trim() || "postgres";

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${database}`;
}

export function missingDatabaseUrlHelp(migrationsDir) {
  const files = BOOKING_BUILDER_MIGRATIONS.map((file) => join(migrationsDir, file));
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
    ...files,
  ].join("\n");
}
