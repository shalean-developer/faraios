-- Optional immutable service media; no existing catalogue or publication is rewritten.
begin;
create function public.business_service_image_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>2 or not d ?& array['mime','data'] or jsonb_typeof(d->'mime') is distinct from 'string' or jsonb_typeof(d->'data') is distinct from 'string' or d->>'mime' not in ('image/png','image/jpeg','image/webp') or char_length(d->>'data') not between 4 and 200000 or d->>'data' !~ '^[A-Za-z0-9+/]+={0,2}$' then return false;end if;
 return octet_length(decode(d->>'data','base64')) between 1 and 150000;
exception when others then return false;
end$$;
revoke all on function public.business_service_image_valid(jsonb) from public;
grant execute on function public.business_service_image_valid(jsonb) to authenticated;
create table public.business_service_images(
 id uuid primary key default gen_random_uuid(),
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 image jsonb not null check(public.business_service_image_valid(image)),
 created_at timestamptz not null default now()
);
create index service_images_business on public.business_service_images(business_id,environment);
alter table public.business_service_images enable row level security;
revoke all on public.business_service_images from public,anon,authenticated;
grant select,insert on public.business_service_images to authenticated;
create policy service_image_owner_read on public.business_service_images for select to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create policy service_image_owner_insert on public.business_service_images for insert to authenticated with check(exists(select 1 from public.businesses b where b.id=business_id));
create or replace function public.business_services_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare s jsonb; k text; photo jsonb; ids text[]='{}';
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>2 or not d ?& array['currency','items'] or jsonb_typeof(d->'currency') is distinct from 'string' or d->>'currency' not in ('ZAR','USD','GBP','EUR','AUD','CAD','NZD','BWP','NAD','ZMW','KES','NGN','GHS','MUR','SZL','LSL','MZN','UGX','TZS','RWF','JPY','INR','AED','CHF') or jsonb_typeof(d->'items') is distinct from 'array' or jsonb_array_length(d->'items')>100 then return false;end if;
 for s in select value from jsonb_array_elements(d->'items') loop
  if jsonb_typeof(s) is distinct from 'object' or (s-array['id','name','description','duration','mode','amount','visible','archived','options','photo'])<>'{}'::jsonb or not s ?& array['id','name','description','duration','mode','amount','visible','archived'] then return false;end if;
  foreach k in array array['id','name','description','mode'] loop
   if jsonb_typeof(s->k) is distinct from 'string' or s->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
  end loop;
  if s->>'id' !~ '^[a-f0-9]{32}$' or s->>'id'=any(ids) or char_length(btrim(s->>'name')) not between 2 and 120 or char_length(s->>'description')>2000 or s->>'mode' not in ('fixed','from','quote') or jsonb_typeof(s->'duration') is distinct from 'number' or s->>'duration' !~ '^[0-9]+$' or (s->>'duration')::integer not between 1 and 10080 or jsonb_typeof(s->'visible') is distinct from 'boolean' or jsonb_typeof(s->'archived') is distinct from 'boolean' then return false;end if;
  if s ? 'options' and not request_private.options_valid(s->'options') then return false;end if;
  if s ? 'photo' then
   photo=s->'photo';
   if jsonb_typeof(photo) is distinct from 'object' or (select count(*) from jsonb_object_keys(photo))<>2 or not photo ?& array['id','alt'] or jsonb_typeof(photo->'id') is distinct from 'string' or photo->>'id' !~ '^[a-f0-9]{32}$' or jsonb_typeof(photo->'alt') is distinct from 'string' or char_length(btrim(photo->>'alt')) not between 1 and 200 or photo->>'alt' ~ '[[:cntrl:]]' then return false;end if;
  end if;
  if d->>'currency' in ('JPY','UGX','RWF') and exists(select 1 from jsonb_array_elements(coalesce(s->'options','[]')) o where (o->>'price')::bigint%100<>0) then return false;end if;
  ids=array_append(ids,s->>'id');
  if s->>'mode'='quote' then if s->'amount'<>'null'::jsonb then return false;end if;
  elsif jsonb_typeof(s->'amount') is distinct from 'number' or s->>'amount' !~ '^[0-9]+$' or (s->>'amount')::bigint not between 0 and 999999999 then return false;end if;
  if d->>'currency' in ('JPY','UGX','RWF') and s->>'mode'<>'quote' and (s->>'amount')::bigint%100<>0 then return false;end if;
 end loop;return true;
exception when others then return false;
end $$;

-- Image and draft are committed together; stale versions cannot leave orphan uploads.
create function public.business_services_save_image(p_business uuid,p_environment text,p_draft jsonb,p_version integer,p_service text,p_image jsonb,p_alt text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare media uuid; next_draft jsonb;
begin
 if not exists(select 1 from public.businesses where id=p_business) then raise exception 'Services permission denied';end if;
 if not public.business_services_valid(p_draft) or p_alt is null or char_length(btrim(p_alt)) not between 1 and 200 or p_alt ~ '[[:cntrl:]]' or not exists(select 1 from jsonb_array_elements(p_draft->'items') s where s->>'id'=p_service and s->>'archived'='false') then raise exception 'Check service image details.';end if;
 insert into public.business_service_images(business_id,environment,image) values(p_business,p_environment,p_image) returning id into media;
 select jsonb_set(p_draft,'{items}',jsonb_agg(case when s->>'id'=p_service then s||jsonb_build_object('photo',jsonb_build_object('id',replace(media::text,'-',''),'alt',btrim(p_alt))) else s end order by ord)) into next_draft from jsonb_array_elements(p_draft->'items') with ordinality as entries(s,ord);
 return public.business_services_save(p_business,p_environment,next_draft,p_version);
end$$;
revoke all on function public.business_services_save_image(uuid,text,jsonb,integer,text,jsonb,text) from public,anon;
grant execute on function public.business_services_save_image(uuid,text,jsonb,integer,text,jsonb,text) to authenticated;
-- Only a currently published, visible service can disclose its own immutable image.
create function request_private.service_image(p_environment text,p_slug text,p_service text) returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce((select m.image from public.business_public_pages p
 cross join lateral jsonb_array_elements(p.services->'items') s
 join public.business_service_images m on m.id=case when s->'photo'->>'id' ~ '^[a-f0-9]{32}$' then (s->'photo'->>'id')::uuid else null end and m.business_id=p.business_id and m.environment=p.environment
 where p.environment=p_environment and p.slug=p_slug and s->>'id'=p_service and s->>'visible'='true' and s->>'archived'='false'), '{}'::jsonb)
$$;
revoke all on function request_private.service_image(text,text,text) from public;
grant execute on function request_private.service_image(text,text,text) to anon,authenticated;
create function public.business_service_image(p_environment text,p_slug text,p_service text) returns jsonb language sql stable security invoker set search_path='' as $$select request_private.service_image(p_environment,p_slug,p_service)$$;
revoke all on function public.business_service_image(text,text,text) from public;
grant execute on function public.business_service_image(text,text,text) to anon,authenticated;
commit;
