-- P1 stabilization: booking_date canonical, deprecate companies.is_published.

-- ---------------------------------------------------------------------------
-- Bookings: backfill booking_date, drop legacy date column
-- ---------------------------------------------------------------------------
update public.bookings
set booking_date = coalesce(booking_date, date)
where booking_date is null
  and date is not null;

alter table public.bookings
  drop column if exists date;

-- ---------------------------------------------------------------------------
-- Companies: sync is_published from websites.status (deprecated column)
-- Skipped when public.websites has not been created yet (run websites migration first).
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'websites'
  ) then
    raise notice 'Skipping is_published sync: public.websites does not exist yet.';
    return;
  end if;

  update public.companies c
  set is_published = exists (
    select 1
    from public.websites w
    where w.client_id = c.id
      and w.status = 'published'
  );

  comment on column public.companies.is_published is
    'Deprecated: derive live site status from websites.status = published.';

  create or replace function public.sync_company_is_published_from_website()
  returns trigger
  language plpgsql
  security definer
  set search_path = public
  as $fn$
  begin
    update public.companies c
    set is_published = exists (
      select 1
      from public.websites w
      where w.client_id = c.id
        and w.status = 'published'
    )
    where c.id = coalesce(new.client_id, old.client_id);

    return coalesce(new, old);
  end;
  $fn$;

  drop trigger if exists websites_sync_company_is_published on public.websites;
  create trigger websites_sync_company_is_published
    after insert or update of status or delete on public.websites
    for each row
    execute function public.sync_company_is_published_from_website();
end $$;
