import { getAdminNavigationSearchResults } from "@/lib/constants/admin-global-search";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type {
  AdminGlobalSearchResponse,
  AdminGlobalSearchResult,
} from "@/types/admin-global-search";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";

const REMOTE_RESULT_LIMIT = 5;

function escapeIlikePattern(value: string): string {
  return value.replace(/[%_\\]/g, "\\$&");
}

async function resolveSearchClient() {
  const adminClient = tryCreateAdminClient();
  if (adminClient.ok) {
    return adminClient.client;
  }
  return createClient();
}

async function searchBusinesses(
  query: string
): Promise<AdminGlobalSearchResult[]> {
  const supabase = await resolveSearchClient();
  const pattern = `%${escapeIlikePattern(query)}%`;
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,slug")
    .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
    .order("name", { ascending: true })
    .limit(REMOTE_RESULT_LIMIT);

  if (error) {
    console.error("[admin] searchAdminGlobal businesses", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: `business-${row.id}`,
    category: "business" as const,
    label: row.name?.trim() || "Unnamed business",
    description: row.slug ? `@${row.slug}` : undefined,
    href: `${ADMIN_BUSINESSES_PATH}/${row.id}`,
  }));
}

async function searchUsers(query: string): Promise<AdminGlobalSearchResult[]> {
  const supabase = await resolveSearchClient();
  const pattern = `%${escapeIlikePattern(query)}%`;
  const { data, error } = await supabase
    .from("users")
    .select("id,email,full_name")
    .or(`email.ilike.${pattern},full_name.ilike.${pattern}`)
    .order("email", { ascending: true })
    .limit(REMOTE_RESULT_LIMIT);

  if (error) {
    console.error("[admin] searchAdminGlobal users", error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: `user-${row.id}`,
    category: "user" as const,
    label: row.full_name?.trim() || row.email,
    description: row.full_name?.trim() ? row.email : undefined,
    href: `/admin/users?q=${encodeURIComponent(row.email)}`,
  }));
}

async function searchTickets(query: string): Promise<AdminGlobalSearchResult[]> {
  const supabase = await resolveSearchClient();
  const pattern = `%${escapeIlikePattern(query)}%`;
  const { data, error } = await supabase
    .from("platform_support_tickets")
    .select("id,ticket_number,subject,status")
    .or(`subject.ilike.${pattern},status.ilike.${pattern}`)
    .order("updated_at", { ascending: false })
    .limit(REMOTE_RESULT_LIMIT);

  if (error) {
    console.error("[admin] searchAdminGlobal tickets", error.message);
    return [];
  }

  const numericQuery = query.replace(/\D/g, "");
  let numericMatches: AdminGlobalSearchResult[] = [];
  if (numericQuery) {
    const ticketNumber = Number.parseInt(numericQuery, 10);
    if (!Number.isNaN(ticketNumber)) {
      const { data: byNumber } = await supabase
        .from("platform_support_tickets")
        .select("id,ticket_number,subject,status")
        .eq("ticket_number", ticketNumber)
        .limit(1);
      numericMatches = (byNumber ?? []).map((row) => ({
        id: `ticket-${row.id}`,
        category: "ticket" as const,
        label: `#${row.ticket_number} — ${row.subject}`,
        description: row.status.replace(/_/g, " "),
        href: `/admin/support/${row.id}`,
      }));
    }
  }

  const textMatches = (data ?? []).map((row) => ({
    id: `ticket-${row.id}`,
    category: "ticket" as const,
    label: `#${row.ticket_number} — ${row.subject}`,
    description: row.status.replace(/_/g, " "),
    href: `/admin/support/${row.id}`,
  }));

  const seen = new Set<string>();
  return [...numericMatches, ...textMatches].filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function searchDomains(query: string): Promise<AdminGlobalSearchResult[]> {
  const supabase = await resolveSearchClient();
  const pattern = `%${escapeIlikePattern(query)}%`;
  const { data, error } = await supabase
    .from("website_domains")
    .select("id,domain,company_id,companies(name)")
    .ilike("domain", pattern)
    .order("domain", { ascending: true })
    .limit(REMOTE_RESULT_LIMIT);

  if (error) {
    console.error("[admin] searchAdminGlobal domains", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const company = Array.isArray(row.companies) ? row.companies[0] : row.companies;
    const businessName =
      company && typeof company === "object" && "name" in company
        ? String(company.name ?? "").trim()
        : "";
    return {
      id: `domain-${row.id}`,
      category: "domain" as const,
      label: row.domain,
      description: businessName || undefined,
      href: row.company_id
        ? `${ADMIN_BUSINESSES_PATH}/${row.company_id}`
        : "/admin/domains",
    };
  });
}

export async function searchAdminGlobal(query: string): Promise<AdminGlobalSearchResponse> {
  const trimmed = query.trim();
  const navigation = getAdminNavigationSearchResults(trimmed);

  if (!isSupabaseConfigured() || !(await isCurrentUserPlatformAdmin())) {
    return { query: trimmed, results: navigation };
  }

  if (trimmed.length < 2) {
    return { query: trimmed, results: navigation };
  }

  const [businesses, users, tickets, domains] = await Promise.all([
    searchBusinesses(trimmed),
    searchUsers(trimmed),
    searchTickets(trimmed),
    searchDomains(trimmed),
  ]);

  return {
    query: trimmed,
    results: [...navigation, ...businesses, ...users, ...tickets, ...domains],
  };
}
