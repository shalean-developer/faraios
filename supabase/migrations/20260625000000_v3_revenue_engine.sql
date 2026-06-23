-- V3 Revenue Engine: quotes, invoices, payments, customer portal access, audit logs.

-- ---------------------------------------------------------------------------
-- Document numbering (per company)
-- ---------------------------------------------------------------------------
create table if not exists public.financial_document_sequences (
  company_id uuid not null references public.companies (id) on delete cascade,
  document_type text not null check (document_type in ('quote', 'invoice')),
  next_number integer not null default 1 check (next_number >= 1),
  primary key (company_id, document_type)
);

create or replace function public.allocate_document_number(
  p_company_id uuid,
  p_document_type text,
  p_prefix text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_num integer;
begin
  insert into public.financial_document_sequences (company_id, document_type, next_number)
  values (p_company_id, p_document_type, 2)
  on conflict (company_id, document_type)
  do update set next_number = public.financial_document_sequences.next_number + 1
  returning next_number - 1 into v_num;

  return p_prefix || '-' || lpad(v_num::text, 6, '0');
end;
$$;

grant execute on function public.allocate_document_number(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Quotes
-- ---------------------------------------------------------------------------
create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  quote_number text not null,
  status text not null default 'draft' check (
    status in ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'converted')
  ),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  notes text,
  valid_until date,
  created_by uuid references auth.users (id) on delete set null,
  sent_at timestamptz,
  viewed_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  converted_booking_id uuid references public.bookings (id) on delete set null,
  converted_invoice_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, quote_number)
);

create table if not exists public.quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references public.quotes (id) on delete cascade,
  service_id uuid references public.company_services (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists quotes_company_idx on public.quotes (company_id, created_at desc);
create index if not exists quotes_customer_idx on public.quotes (customer_id, created_at desc);
create index if not exists quotes_status_idx on public.quotes (company_id, status);
create index if not exists quote_line_items_quote_idx on public.quote_line_items (quote_id, sort_order);

-- ---------------------------------------------------------------------------
-- Invoices
-- ---------------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  quote_id uuid references public.quotes (id) on delete set null,
  invoice_number text not null,
  status text not null default 'draft' check (
    status in ('draft', 'issued', 'partially_paid', 'paid', 'overdue', 'cancelled', 'refunded')
  ),
  subtotal_cents integer not null default 0 check (subtotal_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  tax_cents integer not null default 0 check (tax_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  amount_paid_cents integer not null default 0 check (amount_paid_cents >= 0),
  balance_due_cents integer not null default 0 check (balance_due_cents >= 0),
  deposit_type text not null default 'full' check (deposit_type in ('full', 'percentage', 'fixed')),
  deposit_value integer not null default 100 check (deposit_value >= 0),
  due_date date,
  notes text,
  issued_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, invoice_number)
);

alter table public.quotes
  add constraint quotes_converted_invoice_fk
  foreign key (converted_invoice_id) references public.invoices (id) on delete set null;

create table if not exists public.invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices (id) on delete cascade,
  service_id uuid references public.company_services (id) on delete set null,
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price_cents integer not null default 0 check (unit_price_cents >= 0),
  total_cents integer not null default 0 check (total_cents >= 0),
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists invoices_company_idx on public.invoices (company_id, created_at desc);
create index if not exists invoices_customer_idx on public.invoices (customer_id, created_at desc);
create index if not exists invoices_status_idx on public.invoices (company_id, status);
create index if not exists invoice_line_items_invoice_idx on public.invoice_line_items (invoice_id, sort_order);

-- ---------------------------------------------------------------------------
-- Customer payments (B2C — business → end customer)
-- ---------------------------------------------------------------------------
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete restrict,
  invoice_id uuid not null references public.invoices (id) on delete restrict,
  booking_id uuid references public.bookings (id) on delete set null,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'ZAR',
  provider text not null check (provider in ('paystack', 'eft', 'stripe', 'ozow', 'peach', 'yoco')),
  provider_reference text,
  status text not null default 'pending' check (
    status in ('pending', 'processing', 'paid', 'failed', 'cancelled', 'refunded')
  ),
  payment_type text not null default 'full' check (
    payment_type in ('full', 'deposit', 'balance', 'partial')
  ),
  notes text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists customer_payments_provider_ref_idx
  on public.customer_payments (provider, provider_reference)
  where provider_reference is not null;

create index if not exists customer_payments_company_idx
  on public.customer_payments (company_id, created_at desc);
create index if not exists customer_payments_invoice_idx
  on public.customer_payments (invoice_id, created_at desc);
create index if not exists customer_payments_customer_idx
  on public.customer_payments (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Company payment settings (EFT bank details, default deposit)
-- ---------------------------------------------------------------------------
create table if not exists public.company_payment_settings (
  company_id uuid primary key references public.companies (id) on delete cascade,
  default_deposit_type text not null default 'full' check (default_deposit_type in ('full', 'percentage', 'fixed')),
  default_deposit_value integer not null default 100 check (default_deposit_value >= 0),
  eft_bank_name text,
  eft_account_name text,
  eft_account_number text,
  eft_branch_code text,
  eft_reference_prefix text,
  paystack_enabled boolean not null default true,
  eft_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Customer portal access tokens
-- ---------------------------------------------------------------------------
create table if not exists public.customer_portal_tokens (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  customer_id uuid not null references public.customers (id) on delete cascade,
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists customer_portal_tokens_customer_idx
  on public.customer_portal_tokens (customer_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Financial audit log
-- ---------------------------------------------------------------------------
create table if not exists public.financial_audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  entity_type text not null check (entity_type in ('quote', 'invoice', 'payment')),
  entity_id uuid not null,
  action text not null,
  actor_id uuid references auth.users (id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists financial_audit_logs_company_idx
  on public.financial_audit_logs (company_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS helper macro via policies
-- ---------------------------------------------------------------------------
alter table public.quotes enable row level security;
alter table public.quote_line_items enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_line_items enable row level security;
alter table public.customer_payments enable row level security;
alter table public.company_payment_settings enable row level security;
alter table public.financial_audit_logs enable row level security;

grant select, insert, update, delete on public.quotes to authenticated;
grant select, insert, update, delete on public.quote_line_items to authenticated;
grant select, insert, update, delete on public.invoices to authenticated;
grant select, insert, update, delete on public.invoice_line_items to authenticated;
grant select, insert, update on public.customer_payments to authenticated;
grant select, insert, update on public.company_payment_settings to authenticated;
grant select, insert on public.financial_audit_logs to authenticated;
grant select, insert, update on public.financial_document_sequences to authenticated;

-- quotes
drop policy if exists "quotes_select_member" on public.quotes;
create policy "quotes_select_member" on public.quotes for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "quotes_insert_member" on public.quotes;
create policy "quotes_insert_member" on public.quotes for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())));

drop policy if exists "quotes_update_member" on public.quotes;
create policy "quotes_update_member" on public.quotes for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())));

drop policy if exists "quotes_delete_member" on public.quotes;
create policy "quotes_delete_member" on public.quotes for delete to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = quotes.company_id and m.user_id = (select auth.uid())));

-- quote_line_items (via quote company)
drop policy if exists "quote_line_items_select_member" on public.quote_line_items;
create policy "quote_line_items_select_member" on public.quote_line_items for select to authenticated
  using (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "quote_line_items_insert_member" on public.quote_line_items;
create policy "quote_line_items_insert_member" on public.quote_line_items for insert to authenticated
  with check (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())));

drop policy if exists "quote_line_items_update_member" on public.quote_line_items;
create policy "quote_line_items_update_member" on public.quote_line_items for update to authenticated
  using (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())));

drop policy if exists "quote_line_items_delete_member" on public.quote_line_items;
create policy "quote_line_items_delete_member" on public.quote_line_items for delete to authenticated
  using (exists (select 1 from public.quotes q join public.memberships m on m.company_id = q.company_id where q.id = quote_line_items.quote_id and m.user_id = (select auth.uid())));

-- invoices
drop policy if exists "invoices_select_member" on public.invoices;
create policy "invoices_select_member" on public.invoices for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "invoices_insert_member" on public.invoices;
create policy "invoices_insert_member" on public.invoices for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())));

drop policy if exists "invoices_update_member" on public.invoices;
create policy "invoices_update_member" on public.invoices for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())))
  with check (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())));

drop policy if exists "invoices_delete_member" on public.invoices;
create policy "invoices_delete_member" on public.invoices for delete to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = invoices.company_id and m.user_id = (select auth.uid())));

-- invoice_line_items
drop policy if exists "invoice_line_items_select_member" on public.invoice_line_items;
create policy "invoice_line_items_select_member" on public.invoice_line_items for select to authenticated
  using (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "invoice_line_items_insert_member" on public.invoice_line_items;
create policy "invoice_line_items_insert_member" on public.invoice_line_items for insert to authenticated
  with check (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())));

drop policy if exists "invoice_line_items_update_member" on public.invoice_line_items;
create policy "invoice_line_items_update_member" on public.invoice_line_items for update to authenticated
  using (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())));

drop policy if exists "invoice_line_items_delete_member" on public.invoice_line_items;
create policy "invoice_line_items_delete_member" on public.invoice_line_items for delete to authenticated
  using (exists (select 1 from public.invoices i join public.memberships m on m.company_id = i.company_id where i.id = invoice_line_items.invoice_id and m.user_id = (select auth.uid())));

-- customer_payments
drop policy if exists "customer_payments_select_member" on public.customer_payments;
create policy "customer_payments_select_member" on public.customer_payments for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = customer_payments.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "customer_payments_insert_member" on public.customer_payments;
create policy "customer_payments_insert_member" on public.customer_payments for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = customer_payments.company_id and m.user_id = (select auth.uid())));

drop policy if exists "customer_payments_update_member" on public.customer_payments;
create policy "customer_payments_update_member" on public.customer_payments for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = customer_payments.company_id and m.user_id = (select auth.uid())));

-- company_payment_settings
drop policy if exists "company_payment_settings_select_member" on public.company_payment_settings;
create policy "company_payment_settings_select_member" on public.company_payment_settings for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = company_payment_settings.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "company_payment_settings_upsert_member" on public.company_payment_settings;
create policy "company_payment_settings_upsert_member" on public.company_payment_settings for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = company_payment_settings.company_id and m.user_id = (select auth.uid())));

drop policy if exists "company_payment_settings_update_member" on public.company_payment_settings;
create policy "company_payment_settings_update_member" on public.company_payment_settings for update to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = company_payment_settings.company_id and m.user_id = (select auth.uid())));

-- financial_audit_logs
drop policy if exists "financial_audit_logs_select_member" on public.financial_audit_logs;
create policy "financial_audit_logs_select_member" on public.financial_audit_logs for select to authenticated
  using (exists (select 1 from public.memberships m where m.company_id = financial_audit_logs.company_id and m.user_id = (select auth.uid())) or public.is_platform_admin());

drop policy if exists "financial_audit_logs_insert_member" on public.financial_audit_logs;
create policy "financial_audit_logs_insert_member" on public.financial_audit_logs for insert to authenticated
  with check (exists (select 1 from public.memberships m where m.company_id = financial_audit_logs.company_id and m.user_id = (select auth.uid())));

-- Portal tokens: service role only (no authenticated RLS policies)
alter table public.customer_portal_tokens enable row level security;
