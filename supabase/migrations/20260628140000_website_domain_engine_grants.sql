-- Grants for V4 website domain engine (RLS policies exist but grants were missing).

grant select, insert, update, delete on table public.website_domains to authenticated;
grant select, insert, update on table public.website_dns_records to authenticated;
grant select, insert, update on table public.website_deployments to authenticated;
grant select on table public.business_api_key_events to authenticated;
grant select on table public.website_tracking_events to authenticated;
