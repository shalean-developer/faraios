-- companies.updated_at was referenced in app code but never added to schema.

alter table public.companies
  add column if not exists updated_at timestamptz default now();

update public.companies
set updated_at = coalesce(created_at, now())
where updated_at is null;
