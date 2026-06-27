-- Map FaraiOS hosting plans to exact Plesk service plan names.
update public.hosting_plans
set
  plesk_service_plan = 'Shared Basic',
  updated_at = now()
where slug = 'shared-basic';

update public.hosting_plans
set
  plesk_service_plan = 'Shared Pro',
  updated_at = now()
where slug = 'shared-pro';

update public.hosting_plans
set
  plesk_service_plan = 'Business Hosting',
  updated_at = now()
where slug = 'business-hosting';

update public.hosting_plans
set
  plesk_service_plan = 'Enterprise',
  updated_at = now()
where slug = 'enterprise-hosting';
