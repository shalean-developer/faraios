-- Grants for V6 team roles / permissions (RLS policies exist but table grants were missing).

grant select on table public.permissions to authenticated;

grant select, insert, update, delete on table public.role_permissions to authenticated;

grant select, insert, update, delete on table public.company_roles to authenticated;

grant select, insert, update, delete on table public.staff_profiles to authenticated;
