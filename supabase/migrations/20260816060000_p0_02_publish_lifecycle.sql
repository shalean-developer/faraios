-- P0-02: durable, auditable website publish lifecycle.
create table if not exists public.website_publish_attempts (
  id uuid primary key default gen_random_uuid(),
  website_id uuid not null references public.websites(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  requested_by uuid null references auth.users(id) on delete set null,
  state text not null default 'publish_requested' check (state in ('publish_requested','validating_origin','validating_domain','validating_ssl','smoke_testing','live','failed')),
  snapshot jsonb not null,
  target_url text null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz null
);
create index if not exists website_publish_attempts_website_created_idx on public.website_publish_attempts (website_id, created_at desc);
create index if not exists website_publish_attempts_company_created_idx on public.website_publish_attempts (company_id, created_at desc);
alter table public.website_publish_attempts enable row level security;
revoke all on table public.website_publish_attempts from anon, authenticated;
grant select, insert, update, delete on table public.website_publish_attempts to service_role;
create or replace function public.prevent_publish_snapshot_mutation() returns trigger language plpgsql set search_path = public as $$
begin
  if new.snapshot is distinct from old.snapshot then raise exception 'website publish snapshots are immutable'; end if;
  return new;
end;
$$;
revoke all on function public.prevent_publish_snapshot_mutation() from public;
grant execute on function public.prevent_publish_snapshot_mutation() to service_role;
drop trigger if exists website_publish_attempts_immutable_snapshot on public.website_publish_attempts;
create trigger website_publish_attempts_immutable_snapshot before update on public.website_publish_attempts for each row execute function public.prevent_publish_snapshot_mutation();
