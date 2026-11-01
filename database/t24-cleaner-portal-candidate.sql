-- T24 read-only projection. No grants on booking, agreement or profile tables.
begin;
create schema private_t24;
revoke all on schema private_t24 from public,anon,authenticated,service_role;
create function private_t24.cleaner_portal(business uuid, section text, page integer default 0)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare uid uuid:=auth.uid();result jsonb;
begin
 if not private_t20.live_session() or page is null or page<0 or page>1000000 or section is null or section not in ('jobs','schedule','earnings','profile') or not exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id where m.business_id=business and m.user_id=uid and m.role='staff' and m.status='active' and b.status='active') then raise exception 'cleaner_access_denied' using errcode='42501';end if;
 if section in ('jobs','schedule') then
 select coalesce(jsonb_agg(x.data order by x.starts_at,x.id),'[]') into result from (
 select j.id,j.starts_at,jsonb_build_object('id',j.id,'status',j.status,'localStart',j.local_start,'timeZone',j.time_zone,'durationMinutes',j.duration_minutes,
 'customerName',j.customer_snapshot->>'name','address',jsonb_build_object('address_line',j.address_snapshot->>'address_line','suburb',j.address_snapshot->>'suburb','city',j.address_snapshot->>'city','postal_code',j.address_snapshot->>'postal_code','access_notes',j.address_snapshot->>'access_notes')) data
 from public.one_off_bookings j where j.business_id=business and uid=any(j.assigned_staff) and j.status not in ('draft','confirmed')
 order by j.starts_at,j.id limit 51 offset page*50) x;
 elsif section='profile' then
 select jsonb_build_object('userId',uid,'displayName',p.display_name,'phone',p.phone,'role','staff') into result from (select 1) x left join public.staff_profiles p on p.business_id=business and p.user_id=uid;
 else
 -- Agreements are not accruals. Filter worker JSON before returning it; never expose teammates.
 select coalesce(jsonb_agg(x.data order by x.created_at desc,x.id),'[]') into result from (
 select a.id,a.created_at,jsonb_build_object('id',a.id,'bookingId',a.booking_id,'period',a.request->>'originalPeriod','originalVersion',coalesce(a.request->'originalVersion',a.request->'ruleVersion'),
 'amountCents',(w->>'amountCents')::integer,'sourceId',case when c.agreement_id is not null then w->>'sourceId' else null end,'accrued',c.agreement_id is not null,'syntheticOnly',a.synthetic_only) data
 from private_t22.agreements a cross join lateral jsonb_array_elements(a.workers) w left join private_t22.accruals c on c.agreement_id=a.id and c.business_id=a.business_id
 where a.business_id=business and w->>'userId'=uid::text order by a.created_at desc,a.id limit 51 offset page*50) x;
 end if;
 return jsonb_build_object('userId',uid,'section',section,'page',page,'data',result);
end;$$;
revoke all on function private_t24.cleaner_portal(uuid,text,integer) from public,anon,authenticated,service_role;
grant usage on schema private_t24 to authenticated;
grant execute on function private_t24.cleaner_portal(uuid,text,integer) to authenticated;
create function public.t24_cleaner_portal(business uuid,section text,page integer default 0) returns jsonb language sql stable security invoker set search_path='' as $$select private_t24.cleaner_portal(business,section,page);$$;
revoke all on function public.t24_cleaner_portal(uuid,text,integer) from public,anon,authenticated,service_role;
grant execute on function public.t24_cleaner_portal(uuid,text,integer) to authenticated;
commit;
