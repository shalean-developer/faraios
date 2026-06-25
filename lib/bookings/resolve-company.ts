import { tryCreateAdminClient } from "@/lib/supabase/admin";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export async function resolveCompanyByBookIdentifier(identifier: string): Promise<{
  id: string;
  name: string;
  slug: string;
  brand_logo_url: string | null;
  brand_primary_color: string | null;
} | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const decoded = decodeURIComponent(identifier);
  const query = admin.client
    .from("companies")
    .select("id, name, slug, brand_logo_url, brand_primary_color");

  const { data } = isUuid(decoded)
    ? await query.eq("id", decoded).maybeSingle()
    : await query.eq("slug", decoded).maybeSingle();

  return data ?? null;
}
