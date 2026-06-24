-- Phase B: company branding, notification preferences, overdue invoice reminders

alter table public.companies
  add column if not exists brand_logo_url text,
  add column if not exists brand_primary_color text,
  add column if not exists brand_accent_color text,
  add column if not exists notification_preferences jsonb not null default '{
    "emailBookingAlerts": true,
    "emailInvoiceAlerts": true,
    "emailLeadAlerts": true,
    "emailMarketingDigest": false
  }'::jsonb;

alter table public.invoices
  add column if not exists overdue_reminder_sent_at timestamptz;

insert into public.platform_cron_jobs (id, name, schedule, description)
values
  (
    'process-overdue-invoices',
    'Process Overdue Invoices',
    '0 8 * * *',
    'Marks overdue invoices and sends customer payment reminders via /api/cron/process-overdue-invoices'
  )
on conflict (id) do update set
  name = excluded.name,
  schedule = excluded.schedule,
  description = excluded.description;
