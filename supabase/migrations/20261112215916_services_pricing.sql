begin;
-- Strict bounded documents; only explicitly selected, active services enter the public snapshot.
create function public.business_services_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb; k text; ids text[]='{}';
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>2 or not d ?& array['currency','items'] or jsonb_typeof(d->'currency') is distinct from 'string' or d->>'currency' not in ('ZAR','USD','GBP','EUR','AUD','CAD','NZD','BWP','NAD','ZMW','KES','NGN','GHS','MUR','SZL','LSL','MZN','UGX','TZS','RWF','JPY','INR','AED','CHF') or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items')>100 then return false;end if;
 for s in select value from jsonb_array_elements(d->'items') loop
  if jsonb_typeof(s) is distinct from 'object' or (select count(*) from jsonb_object_keys(s))<>8 or not s ?& array['id','name','description','duration','mode','amount','visible','archived'] then return false;end if;
  foreach k in array array['id','name','description','mode'] loop
   if jsonb_typeof(s->k) is distinct from 'string' or s->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
  end loop;
  if s->>'id' !~ '^[a-f0-9]{32}$' or s->>'id'=any(ids) or char_length(btrim(s->>'name')) not between 2 and 120 or char_length(s->>'description')>2000 or s->>'mode' not in ('fixed','from','quote') or jsonb_typeof(s->'duration') is distinct from 'number' or s->>'duration' !~ '^[0-9]+$' or (s->>'duration')::integer not between 1 and 10080 or jsonb_typeof(s->'visible') is distinct from 'boolean' or jsonb_typeof(s->'archived') is distinct from 'boolean' then return false;end if;
  ids=array_append(ids,s->>'id');
  if s->>'mode'='quote' then if s->'amount'<>'null'::jsonb then return false;end if;
  elsif jsonb_typeof(s->'amount') is distinct from 'number' or s->>'amount' !~ '^[0-9]+$' or (s->>'amount')::bigint not between 0 and 999999999 then return false;end if;
  if d->>'currency' in ('JPY','UGX','RWF') and s->>'mode'<>'quote' and (s->>'amount')::bigint%100<>0 then return false;end if;
 end loop;return true;
exception when others then return false;
end $$;
revoke all on function public.business_services_valid(jsonb) from public;
grant execute on function public.business_services_valid(jsonb) to authenticated;
create table public.business_service_catalogues(
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 draft jsonb not null check(public.business_services_valid(draft)),
 version integer not null default 1 check(version>0),
 published jsonb not null default '{"currency":"ZAR","items":[]}' check(public.business_services_valid(published)),
 published_version integer not null default 0,
 primary key(business_id,environment)
);
alter table public.business_service_catalogues enable row level security;
revoke all on public.business_service_catalogues from public,anon,authenticated;
grant select,insert,update on public.business_service_catalogues to authenticated;
create policy services_owner on public.business_service_catalogues for all to authenticated
 using(exists(select 1 from public.businesses b where b.id=business_id))
 with check(exists(select 1 from public.businesses b where b.id=business_id));
-- Separate explicit service snapshot; old profile documents and validation remain untouched.
alter table public.business_public_pages add column services jsonb not null default '{"currency":"ZAR","items":[]}';
grant select(services) on public.business_public_pages to anon;
create function public.business_services_save(p_business uuid,p_environment text,p_draft jsonb,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if not exists(select 1 from public.businesses where id=p_business) then raise exception 'Services permission denied';end if;
 if p_version=0 then insert into public.business_service_catalogues(business_id,environment,draft) values(p_business,p_environment,p_draft);
 else update public.business_service_catalogues set draft=p_draft,version=version+1 where business_id=p_business and environment=p_environment and version=p_version;get diagnostics n=row_count;if n<>1 then raise exception 'Services changed. Reload before saving or publishing.';end if;end if;
 return '{}'::jsonb;
end $$;
create function public.business_services_publish(p_business uuid,p_environment text,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.business_service_catalogues; snap jsonb;
begin
 -- Match profile publishing lock order to serialize snapshot changes and avoid lost updates.
 perform 1 from public.business_profiles where business_id=p_business and environment=p_environment for update;
 select * into r from public.business_service_catalogues where business_id=p_business and environment=p_environment for update;
 if not found or r.version<>p_version then raise exception 'Services changed. Reload before saving or publishing.';end if;
 select jsonb_build_object('currency',r.draft->>'currency','items',coalesce(jsonb_agg(value) filter(where (value->>'visible')::boolean and not (value->>'archived')::boolean),'[]'::jsonb)) into snap from jsonb_array_elements(r.draft->'items');
 update public.business_service_catalogues set published=snap,published_version=version where business_id=p_business and environment=p_environment;
 update public.business_public_pages set services=snap where business_id=p_business and environment=p_environment;
 return '{}'::jsonb;
end $$;
-- Publishing or republishing a profile carries only the explicitly published services.
create function public.business_page_services_snapshot() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 select published into new.services from public.business_service_catalogues where business_id=new.business_id and environment=new.environment;
 new.services=coalesce(new.services,'{"currency":"ZAR","items":[]}'::jsonb);return new;
end $$;
create trigger page_services_snapshot before insert or update on public.business_public_pages for each row execute function public.business_page_services_snapshot();
revoke all on function public.business_services_save(uuid,text,jsonb,integer), public.business_services_publish(uuid,text,integer),public.business_page_services_snapshot() from public;
grant execute on function public.business_services_save(uuid,text,jsonb,integer),public.business_services_publish(uuid,text,integer),public.business_page_services_snapshot() to authenticated;
commit;
