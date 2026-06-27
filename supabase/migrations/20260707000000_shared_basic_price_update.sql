-- Shared Basic hosting price: R49 → R69
update public.hosting_plans
set
  monthly_price_cents = 6900,
  yearly_price_cents = 69000
where slug = 'shared-basic';
