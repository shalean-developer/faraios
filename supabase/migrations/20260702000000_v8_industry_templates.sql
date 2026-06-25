-- V8: Industry Templates — company template tracking, service metadata, template catalog.

alter table public.companies
  add column if not exists industry_template_applied boolean not null default false;

alter table public.companies
  add column if not exists industry_template_key text;

alter table public.companies
  add column if not exists template_applied_at timestamptz;

alter table public.company_services
  add column if not exists industry_key text;

alter table public.company_services
  add column if not exists is_template_service boolean not null default false;

create table if not exists public.industry_templates (
  id uuid primary key default gen_random_uuid(),
  industry_key text not null unique,
  industry_name text not null,
  description text,
  template_data jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- V8 industries (add missing; keep legacy industries active)
insert into public.industries (name, slug, description, is_active, sort_order, icon, module_version)
values
  ('Repairs', 'repairs', 'Appliance, furniture, and general repair services', true, 3, 'wrench', '2.0.0'),
  ('Freelancers', 'freelancers', 'Independent freelancers and solo professionals', true, 6, 'user', '2.0.0'),
  ('Agencies', 'agencies', 'Marketing, design, and digital agencies', true, 8, 'megaphone', '2.0.0')
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order,
  icon = excluded.icon,
  module_version = excluded.module_version;

update public.industries set sort_order = 1, is_active = true where slug = 'cleaning';
update public.industries set sort_order = 2, is_active = true where slug = 'beauty';
update public.industries set sort_order = 4, is_active = true where slug = 'plumbing';
update public.industries set sort_order = 5, is_active = true where slug = 'electrical';
update public.industries set sort_order = 7, is_active = true where slug = 'consulting';
update public.industries set sort_order = 9, is_active = true where slug = 'construction';

-- Alias consultants → consulting
insert into public.industries (name, slug, description, is_active, sort_order, icon, module_version)
select 'Consultants', 'consultants', description, is_active, sort_order, icon, module_version
from public.industries where slug = 'consulting'
on conflict (slug) do nothing;

alter table public.industry_templates enable row level security;

drop policy if exists "industry_templates_select_all" on public.industry_templates;
create policy "industry_templates_select_all" on public.industry_templates
  for select to authenticated
  using (true);

grant select on table public.industry_templates to authenticated;
