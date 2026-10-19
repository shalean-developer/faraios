-- UI-02: read only the recorded actor for one authorised quote; no directory API.
begin;
create function audit.quote_acceptance_actor(p_business_id uuid,p_quote_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $actor$
declare q public.business_quotes;actor_label text;
begin
 perform audit.quote_access(p_business_id);
 select * into q from public.business_quotes where business_id=p_business_id and id=p_quote_id;
 if not found then raise exception 'Quote unavailable' using errcode='42501';end if;
 if q.accepted_by is null then return null;end if;
 -- Membership may now be suspended or have a different role. The recorded ID is
 -- historical; a resolvable display label is current and never authorises access.
 select coalesce(nullif(trim(p.display_name),''),nullif(trim(u.email),'')) into actor_label
 from public.business_memberships m
 join auth.users u on u.id=m.user_id
 left join public.staff_profiles p on p.business_id=m.business_id and p.user_id=m.user_id
 where m.business_id=q.business_id and m.user_id=q.accepted_by;
 return jsonb_build_object('business_id',q.business_id,'quote_id',q.id,'actor_id',q.accepted_by,'label',actor_label);
end;$actor$;
revoke all on function audit.quote_acceptance_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function audit.quote_acceptance_actor(uuid,uuid) to authenticated;
create function public.quote_acceptance_actor(p_business_id uuid,p_quote_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $actor$
 select audit.quote_acceptance_actor(p_business_id,p_quote_id)
$actor$;
revoke all on function public.quote_acceptance_actor(uuid,uuid) from public,anon,authenticated;
grant execute on function public.quote_acceptance_actor(uuid,uuid) to authenticated;
commit;
