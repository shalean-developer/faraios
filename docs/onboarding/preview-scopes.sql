-- Operator step after validating installed definitions/configuration.
-- Does not open the existing delegation gate or reactivate any old membership.
begin;
insert into authorization_private.staff_onboarding_businesses(business_id,environment,enabled)
select business_id,'preview',true from authorization_private.preview_businesses
where business_id in ('2f16e658-e031-4c4a-930a-2731ec1d1492','4627f805-8243-4890-bf18-a14fdf3fd21b')
on conflict(business_id,environment) do update set enabled=true;
do $$begin
 if (select count(*) from authorization_private.staff_onboarding_businesses where enabled)<>2 or exists(select 1 from authorization_private.staff_onboarding_businesses where enabled and (environment<>'preview' or business_id not in ('2f16e658-e031-4c4a-930a-2731ec1d1492','4627f805-8243-4890-bf18-a14fdf3fd21b'))) then raise exception 'Unexpected onboarding scope; aborted';end if;
end$$;
commit;
