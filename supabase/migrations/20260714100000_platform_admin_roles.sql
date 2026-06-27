-- Platform admin roles and scoped workspace grant permissions.

create table if not exists public.platform_admin_roles (
  id text primary key,
  label text not null,
  description text,
  full_access boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.platform_admin_role_grants (
  role_id text not null references public.platform_admin_roles (id) on delete cascade,
  grant_key text not null,
  primary key (role_id, grant_key)
);

create index if not exists platform_admin_role_grants_role_idx
  on public.platform_admin_role_grants (role_id);

alter table public.platform_admins
  add column if not exists role_id text references public.platform_admin_roles (id) on delete set null;

insert into public.platform_admin_roles (id, label, description, full_access, sort_order)
values
  (
    'platform_owner',
    'Platform Owner',
    'Full platform and workspace access.',
    true,
    10
  ),
  (
    'platform_admin',
    'Platform Admin',
    'Full workspace access across all modules.',
    false,
    20
  ),
  (
    'support_agent',
    'Support Agent',
    'Customer support and read-mostly workspace access.',
    false,
    30
  ),
  (
    'developer',
    'Developer',
    'Website, hosting, and technical workspace access.',
    false,
    40
  ),
  (
    'marketing_specialist',
    'Marketing Specialist',
    'Marketing, campaigns, and analytics access.',
    false,
    50
  ),
  (
    'seo_specialist',
    'SEO Specialist',
    'SEO, website, and analytics access.',
    false,
    60
  ),
  (
    'website_designer',
    'Website Designer',
    'Website builder, media, and domain access.',
    false,
    70
  ),
  (
    'content_writer',
    'Content Writer',
    'Content, blog, and media workspace access.',
    false,
    80
  ),
  (
    'sales',
    'Sales',
    'CRM, bookings, and revenue workspace access.',
    false,
    90
  ),
  (
    'customer_success',
    'Customer Success',
    'Support, customers, and health reporting access.',
    false,
    100
  ),
  (
    'finance',
    'Finance',
    'Invoices, payments, and reporting access.',
    false,
    110
  )
on conflict (id) do update set
  label = excluded.label,
  description = excluded.description,
  full_access = excluded.full_access,
  sort_order = excluded.sort_order;

insert into public.platform_admin_role_grants (role_id, grant_key)
values
  ('platform_admin', 'website'),
  ('platform_admin', 'seo'),
  ('platform_admin', 'crm'),
  ('platform_admin', 'marketing'),
  ('platform_admin', 'automation'),
  ('platform_admin', 'analytics'),
  ('platform_admin', 'customers'),
  ('platform_admin', 'bookings'),
  ('platform_admin', 'invoices'),
  ('platform_admin', 'payments'),
  ('platform_admin', 'reports'),
  ('platform_admin', 'employees'),
  ('platform_admin', 'media'),
  ('platform_admin', 'files'),
  ('platform_admin', 'domains'),
  ('platform_admin', 'settings'),
  ('platform_admin', 'marketplace'),
  ('platform_admin', 'support'),
  ('support_agent', 'support'),
  ('support_agent', 'customers'),
  ('support_agent', 'bookings'),
  ('support_agent', 'crm'),
  ('developer', 'website'),
  ('developer', 'domains'),
  ('developer', 'files'),
  ('developer', 'media'),
  ('developer', 'automation'),
  ('developer', 'settings'),
  ('marketing_specialist', 'marketing'),
  ('marketing_specialist', 'analytics'),
  ('marketing_specialist', 'crm'),
  ('marketing_specialist', 'customers'),
  ('seo_specialist', 'seo'),
  ('seo_specialist', 'website'),
  ('seo_specialist', 'analytics'),
  ('seo_specialist', 'domains'),
  ('website_designer', 'website'),
  ('website_designer', 'media'),
  ('website_designer', 'files'),
  ('website_designer', 'domains'),
  ('content_writer', 'marketing'),
  ('content_writer', 'media'),
  ('content_writer', 'website'),
  ('sales', 'crm'),
  ('sales', 'customers'),
  ('sales', 'bookings'),
  ('sales', 'invoices'),
  ('sales', 'payments'),
  ('customer_success', 'support'),
  ('customer_success', 'customers'),
  ('customer_success', 'bookings'),
  ('customer_success', 'reports'),
  ('customer_success', 'analytics'),
  ('finance', 'invoices'),
  ('finance', 'payments'),
  ('finance', 'reports')
on conflict do nothing;

update public.platform_admins
set role_id = 'platform_owner'
where role_id is null;

alter table public.platform_admin_roles enable row level security;
alter table public.platform_admin_role_grants enable row level security;

drop policy if exists "platform_admin_roles_select_admin" on public.platform_admin_roles;
create policy "platform_admin_roles_select_admin" on public.platform_admin_roles
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_admin_role_grants_select_admin" on public.platform_admin_role_grants;
create policy "platform_admin_role_grants_select_admin" on public.platform_admin_role_grants
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_admins_update_role_owner" on public.platform_admins;
create policy "platform_admins_update_role_owner" on public.platform_admins
  for update to authenticated
  using (
    exists (
      select 1
      from public.platform_admins self
      join public.platform_admin_roles role on role.id = self.role_id
      where self.user_id = (select auth.uid())
        and role.full_access = true
    )
  )
  with check (
    exists (
      select 1
      from public.platform_admins self
      join public.platform_admin_roles role on role.id = self.role_id
      where self.user_id = (select auth.uid())
        and role.full_access = true
    )
  );

grant select on table public.platform_admin_roles to authenticated;
grant select on table public.platform_admin_role_grants to authenticated;
grant update (role_id) on table public.platform_admins to authenticated;
