-- Business access to platform support, feature requests, and voting.

create table if not exists public.platform_feature_votes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.platform_feature_requests (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  company_id uuid not null references public.companies (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (request_id, user_id)
);

create index if not exists platform_feature_votes_request_idx
  on public.platform_feature_votes (request_id);
create index if not exists platform_feature_votes_user_idx
  on public.platform_feature_votes (user_id);

create or replace function public.sync_feature_request_vote_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.platform_feature_requests
    set vote_count = vote_count + 1, updated_at = now()
    where id = NEW.request_id;
  elsif TG_OP = 'DELETE' then
    update public.platform_feature_requests
    set vote_count = greatest(vote_count - 1, 0), updated_at = now()
    where id = OLD.request_id;
  end if;
  return null;
end;
$$;

drop trigger if exists platform_feature_votes_sync_count on public.platform_feature_votes;
create trigger platform_feature_votes_sync_count
  after insert or delete on public.platform_feature_votes
  for each row execute function public.sync_feature_request_vote_count();

alter table public.platform_feature_votes enable row level security;

drop policy if exists "platform_support_tickets_select_member" on public.platform_support_tickets;
create policy "platform_support_tickets_select_member" on public.platform_support_tickets
  for select to authenticated
  using (
    company_id is not null
    and public.is_company_member(company_id)
  );

drop policy if exists "platform_support_tickets_insert_member" on public.platform_support_tickets;
create policy "platform_support_tickets_insert_member" on public.platform_support_tickets
  for insert to authenticated
  with check (
    company_id is not null
    and public.is_company_member(company_id)
  );

drop policy if exists "platform_support_messages_select_member" on public.platform_support_messages;
create policy "platform_support_messages_select_member" on public.platform_support_messages
  for select to authenticated
  using (
    is_internal = false
    and exists (
      select 1
      from public.platform_support_tickets t
      where t.id = ticket_id
        and t.company_id is not null
        and public.is_company_member(t.company_id)
    )
  );

drop policy if exists "platform_support_messages_insert_member" on public.platform_support_messages;
create policy "platform_support_messages_insert_member" on public.platform_support_messages
  for insert to authenticated
  with check (
    is_internal = false
    and exists (
      select 1
      from public.platform_support_tickets t
      where t.id = ticket_id
        and t.company_id is not null
        and public.is_company_member(t.company_id)
    )
  );

drop policy if exists "platform_feature_requests_select_member" on public.platform_feature_requests;
create policy "platform_feature_requests_select_member" on public.platform_feature_requests
  for select to authenticated
  using (
    exists (
      select 1
      from public.memberships m
      where m.user_id = auth.uid()
    )
  );

drop policy if exists "platform_feature_requests_insert_member" on public.platform_feature_requests;
create policy "platform_feature_requests_insert_member" on public.platform_feature_requests
  for insert to authenticated
  with check (
    company_id is not null
    and public.is_company_member(company_id)
    and submitted_by_user_id = auth.uid()
  );

drop policy if exists "platform_feature_votes_select_member" on public.platform_feature_votes;
create policy "platform_feature_votes_select_member" on public.platform_feature_votes
  for select to authenticated
  using (user_id = auth.uid() or public.is_company_member(company_id));

drop policy if exists "platform_feature_votes_insert_member" on public.platform_feature_votes;
create policy "platform_feature_votes_insert_member" on public.platform_feature_votes
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.is_company_member(company_id)
    and exists (
      select 1
      from public.platform_feature_requests r
      where r.id = request_id
        and r.status not in ('shipped', 'declined')
    )
  );

drop policy if exists "platform_feature_votes_delete_member" on public.platform_feature_votes;
create policy "platform_feature_votes_delete_member" on public.platform_feature_votes
  for delete to authenticated
  using (user_id = auth.uid());

grant select, insert on table public.platform_support_tickets to authenticated;
grant select, insert on table public.platform_support_messages to authenticated;
grant select, insert on table public.platform_feature_requests to authenticated;
grant select, insert, delete on table public.platform_feature_votes to authenticated;
