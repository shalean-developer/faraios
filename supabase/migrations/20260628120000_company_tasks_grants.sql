-- Grants for V6 company tasks (RLS policies exist in v6 migration but grants were missing).

grant select, insert, update, delete on table public.company_tasks to authenticated;
