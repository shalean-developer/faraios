"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import {
  companyFeatureRequestsPath,
  companySupportPath,
  companySupportTicketPath,
} from "@/lib/paths/company";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CompanyPlatformOpsResult = { ok: true } | { ok: false; error: string };

export async function companyCreateSupportTicket(input: {
  companyId: string;
  companySlug: string;
  subject: string;
  description: string;
  category?: "general" | "billing" | "technical" | "account";
}): Promise<CompanyPlatformOpsResult & { ticketId?: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const subject = input.subject.trim();
  const description = input.description.trim();
  if (!subject || !description) {
    return { ok: false, error: "Subject and description are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const authorName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    user?.email?.split("@")[0] ??
    "User";

  const { data, error } = await supabase
    .from("platform_support_tickets")
    .insert({
      company_id: input.companyId,
      subject,
      description,
      category: input.category ?? "general",
      requester_name: authorName,
      requester_email: user?.email ?? null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("[company-platform-ops] companyCreateSupportTicket", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath(companySupportPath(input.companySlug));
  return { ok: true, ticketId: data.id };
}

export async function companyReplySupportTicket(input: {
  companyId: string;
  companySlug: string;
  ticketId: string;
  body: string;
}): Promise<CompanyPlatformOpsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const body = input.body.trim();
  if (!body) {
    return { ok: false, error: "Message cannot be empty." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: ticket, error: ticketError } = await supabase
    .from("platform_support_tickets")
    .select("id")
    .eq("id", input.ticketId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (ticketError || !ticket) {
    return { ok: false, error: "Ticket not found." };
  }

  const authorName =
    (typeof user?.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    user?.email?.split("@")[0] ??
    "User";

  const { error: messageError } = await supabase.from("platform_support_messages").insert({
    ticket_id: ticket.id,
    author_user_id: user?.id ?? null,
    author_name: authorName,
    author_email: user?.email ?? null,
    body,
    is_internal: false,
  });

  if (messageError) {
    console.error("[company-platform-ops] companyReplySupportTicket", messageError.message);
    return { ok: false, error: messageError.message };
  }

  await supabase
    .from("platform_support_tickets")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", ticket.id);

  revalidatePath(companySupportPath(input.companySlug));
  revalidatePath(companySupportTicketPath(input.companySlug, ticket.id));
  return { ok: true };
}

export async function companySubmitFeatureRequest(input: {
  companyId: string;
  companySlug: string;
  title: string;
  description: string;
  category?: string | null;
}): Promise<CompanyPlatformOpsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const title = input.title.trim();
  const description = input.description.trim();
  if (!title || !description) {
    return { ok: false, error: "Title and description are required." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  const authorName =
    (typeof user.user_metadata?.full_name === "string" &&
    user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim()
      : null) ??
    user.email?.split("@")[0] ??
    "User";

  const { error } = await supabase.from("platform_feature_requests").insert({
    company_id: input.companyId,
    title,
    description,
    category: input.category?.trim() || null,
    submitted_by_user_id: user.id,
    submitted_by_name: authorName,
    submitted_by_email: user.email ?? null,
  });

  if (error) {
    console.error("[company-platform-ops] companySubmitFeatureRequest", error.message);
    return { ok: false, error: error.message };
  }

  revalidatePath(companyFeatureRequestsPath(input.companySlug));
  return { ok: true };
}

export async function companyToggleFeatureVote(input: {
  companyId: string;
  companySlug: string;
  requestId: string;
  voted: boolean;
}): Promise<CompanyPlatformOpsResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  if (input.voted) {
    const { error } = await supabase.from("platform_feature_votes").insert({
      request_id: input.requestId,
      user_id: user.id,
      company_id: input.companyId,
    });

    if (error) {
      if (error.message.includes("duplicate") || error.code === "23505") {
        return { ok: true };
      }
      console.error("[company-platform-ops] companyToggleFeatureVote insert", error.message);
      return { ok: false, error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("platform_feature_votes")
      .delete()
      .eq("request_id", input.requestId)
      .eq("user_id", user.id);

    if (error) {
      console.error("[company-platform-ops] companyToggleFeatureVote delete", error.message);
      return { ok: false, error: error.message };
    }
  }

  revalidatePath(companyFeatureRequestsPath(input.companySlug));
  return { ok: true };
}
