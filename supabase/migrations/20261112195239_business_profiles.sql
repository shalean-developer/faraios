begin;
-- Pure validator: no privilege escalation, private/account fields cannot enter documents.
create function public.business_profile_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; h jsonb; l jsonb;
begin
 if jsonb_typeof(d) is distinct from 'object' or (select count(*) from jsonb_object_keys(d))<>8 or not d ?& array['name','description','email','phone','website','areas','hours','logo'] then return false; end if;
 foreach k in array array['name','description','email','phone','website','areas'] loop
  if jsonb_typeof(d->k) is distinct from 'string' or d->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false; end if;
 end loop;
 if char_length(d->>'name') not between 2 and 120 or char_length(d->>'description')>2000 or char_length(d->>'email')>254 or char_length(d->>'phone')>40 or char_length(d->>'website')>500 or char_length(d->>'areas')>1000 then return false;end if;
 if (d->>'email'<>'' and d->>'email' !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (d->>'phone'<>'' and d->>'phone' !~ '^[+0-9 ()-]{5,40}$') or (d->>'website'<>'' and d->>'website' !~ '^https://[^/@[:space:]]+([/:?#][^[:space:]]*)?$') then return false; end if;
 if jsonb_typeof(d->'hours') is distinct from 'array' or jsonb_array_length(d->'hours')<>7 then return false;end if;
 for h in select value from jsonb_array_elements(d->'hours') loop
  if h='null'::jsonb then continue;end if;
  if jsonb_typeof(h) is distinct from 'array' or jsonb_array_length(h)<>2 then return false;end if;
  if jsonb_typeof(h->0) is distinct from 'string' or jsonb_typeof(h->1) is distinct from 'string' or h->>0 !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or h->>1 !~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' or h->>0>=h->>1 then return false;end if;
 end loop;
 l=d->'logo';if l<>'null'::jsonb then
  if jsonb_typeof(l) is distinct from 'object' or (select count(*) from jsonb_object_keys(l))<>2 or not l ?& array['mime','data'] or jsonb_typeof(l->'mime') is distinct from 'string' or jsonb_typeof(l->'data') is distinct from 'string' or l->>'mime' not in ('image/png','image/jpeg','image/webp') or char_length(l->>'data')>200000 or l->>'data' !~ '^[A-Za-z0-9+/]+={0,2}$' then return false;end if;
 end if;
 return true;
exception when others then return false;
end $$;
revoke all on function public.business_profile_valid(jsonb) from public;
grant execute on function public.business_profile_valid(jsonb) to authenticated;
create table public.business_profiles (
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 slug text not null check(char_length(slug) between 3 and 64 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 draft jsonb not null check(public.business_profile_valid(draft)),
 version integer not null default 1 check(version>0),
 published_at timestamptz, published_slug text,
 primary key(business_id,environment), unique(environment,slug)
);
alter table public.business_profiles enable row level security;
revoke all on public.business_profiles from public,anon,authenticated;
grant select,insert,update on public.business_profiles to authenticated;
create policy profile_owner on public.business_profiles for all to authenticated
 using(exists(select 1 from public.businesses b where b.id=business_id))
 with check(exists(select 1 from public.businesses b where b.id=business_id));
-- Only the current public snapshot exists here. No account email, personal name or draft.
create table public.business_public_pages (
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 slug text not null check(char_length(slug) between 3 and 64 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 document jsonb not null check(public.business_profile_valid(document)),
 time_zone text not null,
 primary key(business_id,environment), unique(environment,slug)
);
alter table public.business_public_pages enable row level security;
revoke all on public.business_public_pages from public,anon,authenticated;
grant select(slug,environment,document,time_zone) on public.business_public_pages to anon;
grant select,insert,update,delete on public.business_public_pages to authenticated;
create policy published_read on public.business_public_pages for select to anon,authenticated using(true);
create policy published_insert on public.business_public_pages for insert to authenticated with check(exists(select 1 from public.businesses b where b.id=business_id));
create policy published_update on public.business_public_pages for update to authenticated using(exists(select 1 from public.businesses b where b.id=business_id)) with check(exists(select 1 from public.businesses b where b.id=business_id));
create policy published_delete on public.business_public_pages for delete to authenticated using(exists(select 1 from public.businesses b where b.id=business_id));
create function public.business_profile_save(p_business uuid,p_environment text,p_slug text,p_draft jsonb,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 if not exists(select 1 from public.businesses where id=p_business) then raise exception 'Profile permission denied';end if;
 if p_version=0 then insert into public.business_profiles(business_id,environment,slug,draft) values(p_business,p_environment,p_slug,p_draft);
 else update public.business_profiles set slug=p_slug,draft=p_draft,version=version+1 where business_id=p_business and environment=p_environment and version=p_version;get diagnostics n=row_count;if n<>1 then raise exception 'Draft changed. Reload before saving or publishing.';end if;end if;
 return '{}'::jsonb;
end $$;
create function public.business_profile_publish(p_business uuid,p_environment text,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.business_profiles; zone text;
begin
 select * into r from public.business_profiles where business_id=p_business and environment=p_environment for update;
 if not found or r.version<>p_version then raise exception 'Draft changed. Reload before saving or publishing.';end if;
 if btrim(r.draft->>'description')='' or btrim(r.draft->>'areas')='' or ((r.draft->>'email')='' and (r.draft->>'phone')='' and (r.draft->>'website')='') then raise exception 'Add a description, service areas and at least one public contact before publishing.';end if;
 select time_zone into zone from public.businesses where id=p_business;
 if zone is null then raise exception 'Complete business country and time zone first.';end if;
 insert into public.business_public_pages(business_id,environment,slug,document,time_zone) values(p_business,p_environment,r.slug,r.draft,zone)
 on conflict(business_id,environment) do update set slug=excluded.slug,document=excluded.document,time_zone=excluded.time_zone;
 update public.business_profiles set published_at=now(),published_slug=r.slug where business_id=p_business and environment=p_environment;
 return '{}'::jsonb;
end $$;
create function public.business_profile_unpublish(p_business uuid,p_environment text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.business_profiles where business_id=p_business and environment=p_environment) then raise exception 'Profile permission denied';end if;
 delete from public.business_public_pages where business_id=p_business and environment=p_environment;
 update public.business_profiles set published_at=null,published_slug=null where business_id=p_business and environment=p_environment;
 return '{}'::jsonb;
end $$;
revoke all on function public.business_profile_save(uuid,text,text,jsonb,integer),public.business_profile_publish(uuid,text,integer),public.business_profile_unpublish(uuid,text) from public;
grant execute on function public.business_profile_save(uuid,text,text,jsonb,integer),public.business_profile_publish(uuid,text,integer),public.business_profile_unpublish(uuid,text) to authenticated;
commit;
