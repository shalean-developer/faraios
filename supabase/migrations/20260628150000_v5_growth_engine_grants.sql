-- Grants for V5 growth engine (RLS policies exist but grants were missing).

grant select, insert, update on table public.local_seo_settings to authenticated;
grant select, insert, update, delete on table public.service_area_pages to authenticated;
grant select, insert, update, delete on table public.content_posts to authenticated;
grant select, insert on table public.review_requests to authenticated;
grant select, insert, update, delete on table public.email_campaigns to authenticated;
grant select on table public.email_unsubscribes to authenticated;
grant select, update on table public.leads to authenticated;
