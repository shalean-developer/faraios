-- Unlist marketplace entries that do not have a published website.
update public.companies c
set
  listed_in_marketplace = false,
  marketplace_featured = false,
  updated_at = now()
where c.listed_in_marketplace = true
  and not exists (
    select 1
    from public.websites w
    where w.client_id = c.id
      and w.status = 'published'
  );
