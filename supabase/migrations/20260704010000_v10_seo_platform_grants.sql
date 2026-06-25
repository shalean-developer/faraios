-- Grants for V10 SEO platform tables

grant select, insert, update on table public.seo_projects to authenticated;
grant select, insert, update, delete on table public.seo_pages to authenticated;
grant select, insert, update on table public.seo_crawls to authenticated;
grant select, insert, update, delete on table public.seo_analysis to authenticated;
grant select, insert, update, delete on table public.seo_keywords to authenticated;
grant select, insert, update, delete on table public.seo_keyword_rankings to authenticated;
grant select, insert, update, delete on table public.seo_meta to authenticated;
grant select, insert, update, delete on table public.seo_schema to authenticated;
grant select, insert, update, delete on table public.seo_redirects to authenticated;
grant select, insert, update, delete on table public.seo_404_logs to authenticated;
grant select, insert, update on table public.seo_sitemaps to authenticated;
grant select, insert on table public.seo_reports to authenticated;
grant select, insert, update on table public.seo_integrations to authenticated;
grant select, insert, update on table public.seo_settings to authenticated;
grant select, insert, update on table public.seo_health_history to authenticated;
grant select, insert, delete on table public.seo_image_issues to authenticated;
