-- Grants for V6 customer segments (RLS policies exist in v6 migration but grants were missing).

grant select, insert, update, delete on table public.customer_segments to authenticated;
grant select, insert, update, delete on table public.retention_campaigns to authenticated;
