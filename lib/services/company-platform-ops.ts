import { formatTicketNumber } from "@/lib/format/admin-tickets";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type CompanySupportTicketRow = {
  id: string;
  ticketLabel: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  updatedAt: string;
  createdAt: string;
};

export type CompanySupportMessageRow = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
};

export type CompanySupportTicketDetail = CompanySupportTicketRow & {
  description: string;
  messages: CompanySupportMessageRow[];
};

export type CompanyFeatureRequestRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  voteCount: number;
  hasVoted: boolean;
  isOwn: boolean;
  createdAt: string;
};

function shortDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function listCompanySupportTickets(
  companyId: string
): Promise<CompanySupportTicketRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("platform_support_tickets")
    .select("id,ticket_number,subject,status,priority,category,created_at,updated_at")
    .eq("company_id", companyId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[company-platform-ops] listCompanySupportTickets", error.message);
    return [];
  }

  return ((data ?? []) as Array<{
    id: string;
    ticket_number: number;
    subject: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    updated_at: string;
  }>).map((row) => ({
    id: row.id,
    ticketLabel: formatTicketNumber(row.ticket_number),
    subject: row.subject,
    status: row.status.replace(/_/g, " "),
    priority: row.priority,
    category: row.category,
    updatedAt: shortDateTime(row.updated_at),
    createdAt: shortDateTime(row.created_at),
  }));
}

export async function getCompanySupportTicketDetail(
  companyId: string,
  ticketId: string
): Promise<CompanySupportTicketDetail | null> {
  if (!isSupabaseConfigured()) return null;

  const supabase = await createClient();
  const { data: ticket, error: ticketError } = await supabase
    .from("platform_support_tickets")
    .select("id,ticket_number,subject,description,status,priority,category,created_at,updated_at")
    .eq("id", ticketId)
    .eq("company_id", companyId)
    .maybeSingle();

  if (ticketError) {
    console.error("[company-platform-ops] getCompanySupportTicketDetail ticket", ticketError.message);
    return null;
  }
  if (!ticket) return null;

  const { data: messages, error: messagesError } = await supabase
    .from("platform_support_messages")
    .select("id,author_name,body,created_at")
    .eq("ticket_id", ticket.id)
    .order("created_at", { ascending: true });

  if (messagesError) {
    console.error("[company-platform-ops] getCompanySupportTicketDetail messages", messagesError.message);
  }

  const row = ticket as {
    id: string;
    ticket_number: number;
    subject: string;
    description: string;
    status: string;
    priority: string;
    category: string;
    created_at: string;
    updated_at: string;
  };

  return {
    id: row.id,
    ticketLabel: formatTicketNumber(row.ticket_number),
    subject: row.subject,
    description: row.description,
    status: row.status.replace(/_/g, " "),
    priority: row.priority,
    category: row.category,
    updatedAt: shortDateTime(row.updated_at),
    createdAt: shortDateTime(row.created_at),
    messages: ((messages ?? []) as Array<{
      id: string;
      author_name: string;
      body: string;
      created_at: string;
    }>).map((message) => ({
      id: message.id,
      authorName: message.author_name,
      body: message.body,
      createdAt: shortDateTime(message.created_at),
    })),
  };
}

export async function listCompanyFeatureRequests(
  companyId: string,
  userId: string
): Promise<CompanyFeatureRequestRow[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createClient();
  const [{ data: requests, error: requestsError }, { data: votes, error: votesError }] =
    await Promise.all([
      supabase
        .from("platform_feature_requests")
        .select("id,company_id,title,description,status,vote_count,created_at")
        .order("vote_count", { ascending: false })
        .limit(100),
      supabase
        .from("platform_feature_votes")
        .select("request_id")
        .eq("user_id", userId),
    ]);

  if (requestsError) {
    console.error("[company-platform-ops] listCompanyFeatureRequests", requestsError.message);
    return [];
  }
  if (votesError) {
    console.error("[company-platform-ops] listCompanyFeatureRequests votes", votesError.message);
  }

  const votedIds = new Set(
    ((votes ?? []) as Array<{ request_id: string }>).map((vote) => vote.request_id)
  );

  return ((requests ?? []) as Array<{
    id: string;
    company_id: string | null;
    title: string;
    description: string;
    status: string;
    vote_count: number;
    created_at: string;
  }>).map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status.replace(/_/g, " "),
    voteCount: row.vote_count,
    hasVoted: votedIds.has(row.id),
    isOwn: row.company_id === companyId,
    createdAt: shortDateTime(row.created_at),
  }));
}
