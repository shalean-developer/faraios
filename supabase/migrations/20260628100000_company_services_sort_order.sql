alter table public.company_services
  add column if not exists sort_order integer not null default 0;

create index if not exists company_services_company_sort_idx
  on public.company_services (company_id, sort_order, name);
