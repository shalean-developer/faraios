alter table public.domain_settings
  add column if not exists www_redirect text not null default 'none';

alter table public.domain_settings
  drop constraint if exists domain_settings_www_redirect_check;

alter table public.domain_settings
  add constraint domain_settings_www_redirect_check
  check (www_redirect in ('none', 'www_to_apex', 'apex_to_www'));
