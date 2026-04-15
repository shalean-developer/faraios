-- Mirror auth signups into public.users (id matches auth.users.id).

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.email), ''),
      new.id::text || '@users.local'
    ),
    nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '')
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(excluded.full_name, public.users.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_sync_public_users on auth.users;
create trigger on_auth_user_created_sync_public_users
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
create policy "users_select_own" on public.users
  for select to authenticated
  using (id = (select auth.uid()));

grant select on table public.users to authenticated;
