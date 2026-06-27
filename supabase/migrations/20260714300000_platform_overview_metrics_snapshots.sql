-- Cached platform overview metrics for faster admin dashboard loads.

create table if not exists public.platform_overview_metrics_snapshots (
  id uuid primary key default gen_random_uuid(),
  metrics jsonb not null,
  captured_at timestamptz not null default now()
);

create index if not exists platform_overview_metrics_snapshots_captured_idx
  on public.platform_overview_metrics_snapshots (captured_at desc);

alter table public.platform_overview_metrics_snapshots enable row level security;

grant select, insert on table public.platform_overview_metrics_snapshots to authenticated;

drop policy if exists "platform_overview_metrics_snapshots_select" on public.platform_overview_metrics_snapshots;
create policy "platform_overview_metrics_snapshots_select" on public.platform_overview_metrics_snapshots
  for select to authenticated
  using (public.is_platform_admin());

drop policy if exists "platform_overview_metrics_snapshots_insert" on public.platform_overview_metrics_snapshots;
create policy "platform_overview_metrics_snapshots_insert" on public.platform_overview_metrics_snapshots
  for insert to authenticated
  with check (public.is_platform_admin());
