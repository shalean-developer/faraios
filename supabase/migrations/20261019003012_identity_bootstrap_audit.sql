-- Version observed from Supabase staging migration history.
create table public.identity_audit (id uuid primary key default gen_random_uuid(), subject_user_id uuid not null references auth.users(id), business_id uuid not null references public.businesses(id), action text not null check (action in ('owner_membership_bootstrap')), authorization_reference text not null, created_at timestamptz not null default now());
alter table public.identity_audit enable row level security;
revoke all on public.identity_audit from public,anon,authenticated;
