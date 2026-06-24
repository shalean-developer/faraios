-- Platform operations: support tickets and feature requests.

create sequence if not exists public.platform_support_ticket_number_seq;

create table if not exists public.platform_support_tickets (
  id uuid primary key default gen_random_uuid(),
  ticket_number integer not null default nextval('public.platform_support_ticket_number_seq'),
  company_id uuid references public.companies (id) on delete set null,
  subject text not null,
  description text not null default '',
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'waiting', 'resolved', 'closed')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high', 'urgent')),
  category text not null default 'general'
    check (category in ('general', 'billing', 'technical', 'account')),
  requester_name text,
  requester_email text,
  assigned_to text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  resolved_at timestamptz
);

create unique index if not exists platform_support_tickets_number_idx
  on public.platform_support_tickets (ticket_number);
create index if not exists platform_support_tickets_status_idx
  on public.platform_support_tickets (status, updated_at desc);
create index if not exists platform_support_tickets_company_idx
  on public.platform_support_tickets (company_id, updated_at desc);

create table if not exists public.platform_support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.platform_support_tickets (id) on delete cascade,
  author_user_id uuid references auth.users (id) on delete set null,
  author_name text not null,
  author_email text,
  body text not null,
  is_internal boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists platform_support_messages_ticket_idx
  on public.platform_support_messages (ticket_id, created_at asc);

create table if not exists public.platform_feature_requests (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references public.companies (id) on delete set null,
  title text not null,
  description text not null default '',
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'planned', 'in_progress', 'shipped', 'declined')),
  priority text not null default 'medium'
    check (priority in ('low', 'medium', 'high')),
  category text,
  vote_count integer not null default 0 check (vote_count >= 0),
  submitted_by_user_id uuid references auth.users (id) on delete set null,
  submitted_by_name text,
  submitted_by_email text,
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists platform_feature_requests_status_idx
  on public.platform_feature_requests (status, updated_at desc);
create index if not exists platform_feature_requests_company_idx
  on public.platform_feature_requests (company_id, created_at desc);

alter table public.platform_support_tickets enable row level security;
alter table public.platform_support_messages enable row level security;
alter table public.platform_feature_requests enable row level security;

drop policy if exists "platform_support_tickets_select_admin" on public.platform_support_tickets;
create policy "platform_support_tickets_select_admin" on public.platform_support_tickets
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_support_messages_select_admin" on public.platform_support_messages;
create policy "platform_support_messages_select_admin" on public.platform_support_messages
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_feature_requests_select_admin" on public.platform_feature_requests;
create policy "platform_feature_requests_select_admin" on public.platform_feature_requests
  for select to authenticated
  using (public.is_platform_admin());

grant select on table public.platform_support_tickets to authenticated;
grant select on table public.platform_support_messages to authenticated;
grant select on table public.platform_feature_requests to authenticated;
