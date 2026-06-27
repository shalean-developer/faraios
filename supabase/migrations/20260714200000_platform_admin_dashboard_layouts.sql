-- Per-admin dashboard widget layouts (overview pinning, order, visibility).

create table if not exists public.platform_admin_dashboard_layouts (
  user_id uuid not null references auth.users (id) on delete cascade,
  dashboard_key text not null default 'overview',
  layout jsonb not null default '{
    "order": [],
    "pinned": [],
    "hidden": []
  }'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, dashboard_key)
);

create index if not exists platform_admin_dashboard_layouts_user_idx
  on public.platform_admin_dashboard_layouts (user_id);

alter table public.platform_admin_dashboard_layouts enable row level security;

grant select, insert, update, delete on table public.platform_admin_dashboard_layouts to authenticated;

drop policy if exists "platform_admin_dashboard_layouts_select" on public.platform_admin_dashboard_layouts;
create policy "platform_admin_dashboard_layouts_select" on public.platform_admin_dashboard_layouts
  for select to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_platform_admin()
  );

drop policy if exists "platform_admin_dashboard_layouts_insert" on public.platform_admin_dashboard_layouts;
create policy "platform_admin_dashboard_layouts_insert" on public.platform_admin_dashboard_layouts
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.is_platform_admin()
  );

drop policy if exists "platform_admin_dashboard_layouts_update" on public.platform_admin_dashboard_layouts;
create policy "platform_admin_dashboard_layouts_update" on public.platform_admin_dashboard_layouts
  for update to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_platform_admin()
  )
  with check (
    user_id = (select auth.uid())
    and public.is_platform_admin()
  );

drop policy if exists "platform_admin_dashboard_layouts_delete" on public.platform_admin_dashboard_layouts;
create policy "platform_admin_dashboard_layouts_delete" on public.platform_admin_dashboard_layouts
  for delete to authenticated
  using (
    user_id = (select auth.uid())
    and public.is_platform_admin()
  );
