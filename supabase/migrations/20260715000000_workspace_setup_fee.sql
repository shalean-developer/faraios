-- Workspace setup fee tracking: admin waiver and payment confirmation.

alter table public.companies
  add column if not exists setup_fee_waived boolean not null default false,
  add column if not exists setup_fee_paid_at timestamptz;

comment on column public.companies.setup_fee_waived is
  'When true, the one-time workspace setup fee is not charged at checkout.';
comment on column public.companies.setup_fee_paid_at is
  'When set, the workspace setup fee was collected and should not be charged again.';
