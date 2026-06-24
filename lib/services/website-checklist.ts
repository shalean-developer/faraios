import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { ConnectedWebsite, Website } from "@/types/database";
import type { WebsiteDomain } from "@/types/website-engine";
import { getDnsRecordsForDomain } from "./website-domains";

export type WebsiteSetupChecklistItem = {
  key: string;
  label: string;
  done: boolean;
  href?: string;
};

export type WebsiteSetupChecklist = {
  items: WebsiteSetupChecklistItem[];
  completedCount: number;
  totalCount: number;
  percentComplete: number;
};

type ChecklistContext = {
  companyId: string;
  slug: string;
  companyHasServices: boolean;
  companyHasBookingForm: boolean;
  connectedWebsite: ConnectedWebsite | null;
  hostedWebsites: Website[];
  domains: WebsiteDomain[];
};

async function companyHasPublishedBookingForm(companyId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("booking_forms")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("status", "published");
  return (count ?? 0) > 0;
}

async function companyHasActiveServices(companyId: string): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  const supabase = await createClient();
  const { count } = await supabase
    .from("company_services")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .eq("active", true);
  return (count ?? 0) > 0;
}

export async function buildWebsiteSetupChecklist(
  ctx: ChecklistContext
): Promise<WebsiteSetupChecklist> {
  const base = `/${encodeURIComponent(ctx.slug)}/dashboard`;
  const hasDomain = ctx.domains.length > 0;
  const primaryDomain = ctx.domains.find((d) => d.is_primary) ?? ctx.domains[0];
  const dnsRecords = primaryDomain
    ? await getDnsRecordsForDomain(primaryDomain.id)
    : [];
  const dnsVerified =
    primaryDomain?.verification_status === "verified" ||
    dnsRecords.every((r) => r.status === "verified");
  const sslActive =
    primaryDomain?.ssl_status === "active" ||
    ctx.connectedWebsite?.production_url != null;

  const hasExternalConnection = Boolean(ctx.connectedWebsite?.production_url);
  const hasHostedLive = ctx.hostedWebsites.some(
    (w) => w.status === "published" || (w as Website & { connection_status?: string }).connection_status === "live"
  );
  const isLive = hasExternalConnection || hasHostedLive;

  const items: WebsiteSetupChecklistItem[] = [
    {
      key: "profile",
      label: "Business profile completed",
      done: true,
      href: `${base}/settings`,
    },
    {
      key: "services",
      label: "Services added",
      done: ctx.companyHasServices,
      href: `${base}/services`,
    },
    {
      key: "booking_form",
      label: "Booking form configured",
      done: ctx.companyHasBookingForm,
      href: `${base}/booking-form`,
    },
    {
      key: "domain",
      label: "Domain added",
      done: hasDomain || Boolean(ctx.connectedWebsite?.production_url),
      href: `${base}/websites/domains`,
    },
    {
      key: "dns",
      label: "DNS verified",
      done: dnsVerified || hasExternalConnection,
      href: `${base}/websites/domains`,
    },
    {
      key: "ssl",
      label: "SSL active",
      done: sslActive,
      href: `${base}/websites/domains`,
    },
    {
      key: "booking_widget",
      label: "Booking widget installed",
      done: hasExternalConnection || hasHostedLive,
      href: `${base}/websites/connection`,
    },
    {
      key: "tracking",
      label: "Tracking script installed",
      done: (ctx.connectedWebsite as ConnectedWebsite & { tracking_enabled?: boolean })
        ?.tracking_enabled !== false,
      href: `${base}/websites/tracking`,
    },
    {
      key: "live",
      label: "Website live",
      done: isLive,
      href: `${base}/websites`,
    },
  ];

  const completedCount = items.filter((i) => i.done).length;
  const totalCount = items.length;

  return {
    items,
    completedCount,
    totalCount,
    percentComplete: Math.round((completedCount / totalCount) * 100),
  };
}

export async function getWebsiteSetupChecklistForCompany(
  companyId: string,
  slug: string,
  connectedWebsite: ConnectedWebsite | null,
  hostedWebsites: Website[],
  domains: WebsiteDomain[]
): Promise<WebsiteSetupChecklist> {
  const [companyHasServices, companyHasBookingForm] = await Promise.all([
    companyHasActiveServices(companyId),
    companyHasPublishedBookingForm(companyId),
  ]);

  return buildWebsiteSetupChecklist({
    companyId,
    slug,
    companyHasServices,
    companyHasBookingForm,
    connectedWebsite,
    hostedWebsites,
    domains,
  });
}
