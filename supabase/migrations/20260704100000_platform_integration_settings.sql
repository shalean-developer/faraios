-- Platform-level OAuth credentials for customer integrations (admin-managed).

alter table public.platform_settings
  add column if not exists integration_settings jsonb not null default '{}'::jsonb;
