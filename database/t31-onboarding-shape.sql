-- Generic settings field consumed by the current onboarding UI; no policy defaults.
begin;
alter table public.business_settings add column max_daily_minutes integer check(max_daily_minutes between 15 and 1440);
commit;
