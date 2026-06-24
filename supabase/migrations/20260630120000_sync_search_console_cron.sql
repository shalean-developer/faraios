-- Register nightly Google Search Console metrics sync cron job.

insert into public.platform_cron_jobs (id, name, schedule, description)
values
  (
    'sync-search-console',
    'Sync Search Console Metrics',
    '0 6 * * *',
    'Pulls Search Analytics into seo_search_metrics via /api/cron/sync-search-console'
  )
on conflict (id) do update set
  name = excluded.name,
  schedule = excluded.schedule,
  description = excluded.description;
