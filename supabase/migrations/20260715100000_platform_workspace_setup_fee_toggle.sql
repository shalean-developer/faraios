-- Platform-wide toggle for workspace setup fees at checkout.

alter table public.platform_settings
  add column if not exists workspace_setup_fee_enabled boolean not null default true;

comment on column public.platform_settings.workspace_setup_fee_enabled is
  'When false, new workspace checkouts charge monthly subscription only (no setup fee).';
