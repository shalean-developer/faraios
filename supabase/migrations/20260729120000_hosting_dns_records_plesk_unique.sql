-- Prevent duplicate mirrored DNS rows when syncing from Plesk.
create unique index if not exists hosting_dns_records_service_plesk_id_idx
  on public.hosting_dns_records (service_id, plesk_record_id)
  where plesk_record_id is not null;
