alter table public.companies
  add column if not exists production_url text;

alter table public.companies
  add column if not exists project_status text not null default 'draft';

alter table public.companies
  add column if not exists onboarding_data jsonb;
