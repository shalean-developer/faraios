"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireCompanyPermission } from "@/lib/services/company-access";
import { companyHostingPath } from "@/lib/paths/company";

type ActionResult = { ok: true } | { ok: false; error: string };

function normalizeDomain(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/\/.*$/, "")
    .replace(/^www\./, "");
}

export async function connectHostingDomainAction(
  subscriptionId: string,
  companySlug: string,
  domain: string
): Promise<ActionResult> {
  const normalized = normalizeDomain(domain);
  if (!normalized || !normalized.includes(".")) {
    return { ok: false, error: "Enter a valid domain (e.g. www.yourbusiness.com)." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to manage hosting." };
  }

  const { data: sub, error: subError } = await supabase
    .from("hosting_subscriptions")
    .select("id, company_id, status")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "Hosting subscription not found." };
  }
  if (sub.status !== "active") {
    return { ok: false, error: "Activate hosting before connecting a domain." };
  }

  const access = await requireCompanyPermission(sub.company_id, "view_websites");
  if (!access.ok) return access;

  const { error } = await supabase
    .from("hosting_subscriptions")
    .update({
      custom_domain: normalized,
      domain_status: "pending",
      ssl_status: "pending",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(companyHostingPath(companySlug));
  return { ok: true };
}

export async function cancelHostingSubscriptionAction(
  subscriptionId: string,
  companySlug: string
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Sign in to manage hosting." };
  }

  const { data: sub, error: subError } = await supabase
    .from("hosting_subscriptions")
    .select("id, company_id, status")
    .eq("id", subscriptionId)
    .maybeSingle();

  if (subError || !sub) {
    return { ok: false, error: "Hosting subscription not found." };
  }

  const access = await requireCompanyPermission(sub.company_id, "view_websites");
  if (!access.ok) return access;

  const { error } = await supabase
    .from("hosting_subscriptions")
    .update({
      status: "cancelled",
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscriptionId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(companyHostingPath(companySlug));
  return { ok: true };
}
