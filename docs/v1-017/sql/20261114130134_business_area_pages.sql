-- Additive area content and snapshot filtering. No existing row updates or permission changes.
-- Optional content only. No row updates, grants, policies or publication changes.
begin;
create or replace function public.business_profile_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; h jsonb; l jsonb; hp jsonb; benefit jsonb; page_key text; page_doc jsonb; step jsonb; seo jsonb; section jsonb; card jsonb; area_key text; a jsonb; service jsonb; names text[];
begin
 if d ? 'area_pages' then
  if jsonb_typeof(d->'area_pages') is distinct from 'object' or (select count(*) from jsonb_object_keys(d->'area_pages'))>20 then return false;end if;
  names=array[]::text[];
  for area_key,a in select key,value from jsonb_each(d->'area_pages') loop
   if area_key !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(area_key) not between 2 and 64 or jsonb_typeof(a) is distinct from 'object' or not a ?& array['slug','name','title','introduction','coverage','seo_title','seo_description','action','published','services'] or (a-array['slug','name','title','introduction','coverage','seo_title','seo_description','action','published','services'])<>'{}'::jsonb then return false;end if;
   foreach k in array array['slug','name','title','introduction','coverage','seo_title','seo_description','action'] loop
    if jsonb_typeof(a->k) is distinct from 'string' or a->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
   end loop;
   if a->>'slug'<>area_key or char_length(btrim(a->>'name')) not between 1 and 120 or a->>'name'=any(names) or char_length(a->>'title')>120 or char_length(a->>'introduction')>600 or char_length(a->>'coverage')>3000 or char_length(a->>'seo_title')>120 or char_length(a->>'seo_description')>300 or char_length(a->>'action')>80 or jsonb_typeof(a->'published') is distinct from 'boolean' or jsonb_typeof(a->'services') is distinct from 'array' or jsonb_array_length(a->'services')>50 then return false;end if;
   names=array_append(names,a->>'name');
   if a->'published'='true'::jsonb and (btrim(a->>'title')='' or btrim(a->>'introduction')='' or btrim(a->>'coverage')='' or btrim(a->>'action')='') then return false;end if;
   for service in select value from jsonb_array_elements(a->'services') loop
    if jsonb_typeof(service) is distinct from 'string' or service#>>'{}' !~ '^[a-f0-9]{32}$' then return false;end if;
   end loop;
   if (select count(distinct value) from jsonb_array_elements(a->'services'))<>jsonb_array_length(a->'services') then return false;end if;
  end loop;
  d=d-'area_pages';
 end if;
 if d ? 'presentation' then
  seo=d->'presentation';
  if jsonb_typeof(seo) is distinct from 'object' or not seo ?& array['accent','font','whatsapp','street','city','region','postal','country'] or (seo-array['accent','font','whatsapp','street','city','region','postal','country','logo_size','show_name'])<>'{}'::jsonb then return false;end if;
  foreach k in array array['accent','font','whatsapp','street','city','region','postal','country'] loop
   if jsonb_typeof(seo->k) is distinct from 'string' or seo->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
  end loop;
  if seo->>'accent' not in ('','forest','navy','plum') or seo->>'font' not in ('','serif','sans') or (seo->>'whatsapp'<>'' and seo->>'whatsapp' !~ '^[1-9][0-9]{6,14}$') or (seo->>'country'<>'' and seo->>'country' !~ '^[A-Z]{2}$') or char_length(seo->>'street')>200 or char_length(seo->>'city')>100 or char_length(seo->>'region')>100 or char_length(seo->>'postal')>20 then return false;end if;
  if seo ? 'logo_size' and (jsonb_typeof(seo->'logo_size') is distinct from 'string' or seo->>'logo_size' not in ('32','48','64','80')) then return false;end if;
  if seo ? 'show_name' and (jsonb_typeof(seo->'show_name') is distinct from 'string' or seo->>'show_name' not in ('yes','no')) then return false;end if;
  d=d-'presentation';
 end if;
 if d ? 'seo' then
  seo=d->'seo';
  if jsonb_typeof(seo) is distinct from 'object' or not seo ?& array['pages','image','image_alt'] or (seo-array['pages','image','image_alt'])<>'{}'::jsonb then return false;end if;
  if jsonb_typeof(seo->'image_alt') is distinct from 'string' or char_length(seo->>'image_alt')>200 or seo->>'image_alt' ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
  if jsonb_typeof(seo->'pages') is distinct from 'object' or ((seo->'pages')-array['home','services','how-it-works','areas','contact'])<>'{}'::jsonb then return false;end if;
  for page_key,page_doc in select key,value from jsonb_each(seo->'pages') loop
   if jsonb_typeof(page_doc) is distinct from 'object' or not page_doc ?& array['title','description','image'] or (page_doc-array['title','description','image'])<>'{}'::jsonb then return false;end if;
   foreach k in array array['title','description','image'] loop
    if jsonb_typeof(page_doc->k) is distinct from 'string' or page_doc->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
   end loop;
   if char_length(page_doc->>'title')>120 or char_length(page_doc->>'description')>300 or page_doc->>'image' not in ('auto','hero','logo','none') then return false;end if;
  end loop;
  l=seo->'image';
  if l<>'null'::jsonb then
   if jsonb_typeof(l) is distinct from 'object' or (select count(*) from jsonb_object_keys(l))<>2 or not l ?& array['mime','data'] or jsonb_typeof(l->'mime') is distinct from 'string' or jsonb_typeof(l->'data') is distinct from 'string' or l->>'mime' not in ('image/png','image/jpeg','image/webp') or char_length(l->>'data')>200000 or l->>'data' !~ '^[A-Za-z0-9+/]+={0,2}$' or btrim(seo->>'image_alt')='' then return false;end if;
  end if;
  d=d-'seo';
 end if;
 if d ? 'pages' then
  if jsonb_typeof(d->'pages') is distinct from 'object' or ((d->'pages') - array['services','how-it-works','areas','contact'])<>'{}'::jsonb then return false;end if;
  for page_key,page_doc in select key,value from jsonb_each(d->'pages') loop
   if jsonb_typeof(page_doc) is distinct from 'object' or not page_doc ?& array['title','introduction','body'] or (page_doc - array['title','introduction','body','steps'])<>'{}'::jsonb then return false;end if;
   foreach k in array array['title','introduction','body'] loop
    if jsonb_typeof(page_doc->k) is distinct from 'string' or page_doc->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
   end loop;
   if char_length(page_doc->>'title')>120 or char_length(page_doc->>'introduction')>600 or char_length(page_doc->>'body')>3000 then return false;end if;
   if page_doc ? 'steps' then
    if page_key<>'how-it-works' or jsonb_typeof(page_doc->'steps') is distinct from 'array' or jsonb_array_length(page_doc->'steps')<>3 then return false;end if;
    for step in select value from jsonb_array_elements(page_doc->'steps') loop
     if jsonb_typeof(step) is distinct from 'array' or jsonb_array_length(step)<>2 or jsonb_typeof(step->0) is distinct from 'string' or jsonb_typeof(step->1) is distinct from 'string' or char_length(step->>0)>120 or char_length(step->>1)>600 or step->>0 ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' or step->>1 ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
    end loop;
   end if;
  end loop;
  d=d-'pages';
 end if;
 if d ? 'homepage' then
  hp=d->'homepage';
  if hp ? 'benefit_section' then
   section=hp->'benefit_section';
   if jsonb_typeof(section) is distinct from 'object' or (select count(*) from jsonb_object_keys(section))<>3 or not section ?& array['title','visible','cards'] or jsonb_typeof(section->'title') is distinct from 'string' or char_length(section->>'title')>120 or section->>'title' ~ '[[:cntrl:]]' or jsonb_typeof(section->'visible') is distinct from 'boolean' or jsonb_typeof(section->'cards') is distinct from 'array' or jsonb_array_length(section->'cards')>6 then return false;end if;
   for card in select value from jsonb_array_elements(section->'cards') loop
    if jsonb_typeof(card) is distinct from 'object' or (select count(*) from jsonb_object_keys(card))<>3 or not card ?& array['icon','title','description'] or jsonb_typeof(card->'icon') is distinct from 'string' or card->>'icon' not in ('home','calendar','message','check','heart','star') or jsonb_typeof(card->'title') is distinct from 'string' or char_length(btrim(card->>'title')) not between 1 and 200 or card->>'title' ~ '[[:cntrl:]]' or jsonb_typeof(card->'description') is distinct from 'string' or char_length(card->>'description')>200 or card->>'description' ~ '[[:cntrl:]]' then return false;end if;
   end loop;
   hp=hp-'benefit_section';
  end if;
  if jsonb_typeof(hp) is distinct from 'object' or (select count(*) from jsonb_object_keys(hp))<>5 or not hp ?& array['headline','introduction','image_alt','benefits','image'] then return false;end if;
  foreach k in array array['headline','introduction','image_alt'] loop
   if jsonb_typeof(hp->k) is distinct from 'string' or hp->>k ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then return false;end if;
  end loop;
  if char_length(hp->>'headline')>160 or char_length(hp->>'introduction')>600 or char_length(hp->>'image_alt')>200 then return false;end if;
  if jsonb_typeof(hp->'benefits') is distinct from 'array' or jsonb_array_length(hp->'benefits')>6 then return false;end if;
  for benefit in select value from jsonb_array_elements(hp->'benefits') loop
   if jsonb_typeof(benefit) is distinct from 'string' or char_length(benefit#>>'{}') not between 1 and 200 or benefit#>>'{}' ~ '[\u0001-\u001f\u007f]' then return false;end if;
  end loop;
  l=hp->'image';
  if l<>'null'::jsonb then
   if jsonb_typeof(l) is distinct from 'object' or (select count(*) from jsonb_object_keys(l))<>2 or not l ?& array['mime','data'] or jsonb_typeof(l->'mime') is distinct from 'string' or jsonb_typeof(l->'data') is distinct from 'string' or l->>'mime' not in ('image/png','image/jpeg','image/webp') or char_length(l->>'data')>200000 or l->>'data' !~ '^[A-Za-z0-9+/]+={0,2}$' or btrim(hp->>'image_alt')='' then return false;end if;
  end if;
  d=d-'homepage';
 end if;
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

create or replace function public.business_profile_publish(p_business uuid,p_environment text,p_version integer) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r public.business_profiles; zone text; snapshot jsonb;
begin
 select * into r from public.business_profiles where business_id=p_business and environment=p_environment for update;
 if not found or r.version<>p_version then raise exception 'Draft changed. Reload before saving or publishing.';end if;
 if btrim(r.draft->>'description')='' or btrim(r.draft->>'areas')='' or ((r.draft->>'email')='' and (r.draft->>'phone')='' and (r.draft->>'website')='') then raise exception 'Add a description, service areas and at least one public contact before publishing.';end if;
 select time_zone into zone from public.businesses where id=p_business;
 if zone is null then raise exception 'Complete business country and time zone first.';end if;
 snapshot=r.draft;
 if snapshot ? 'area_pages' then snapshot=jsonb_set(snapshot,'{area_pages}',coalesce((select jsonb_object_agg(key,value) from jsonb_each(snapshot->'area_pages') where value->'published'='true'::jsonb),'{}'::jsonb));end if;
 insert into public.business_public_pages(business_id,environment,slug,document,time_zone) values(p_business,p_environment,r.slug,snapshot,zone)
 on conflict(business_id,environment) do update set slug=excluded.slug,document=excluded.document,time_zone=excluded.time_zone;
 update public.business_profiles set published_at=now(),published_slug=r.slug where business_id=p_business and environment=p_environment;
 return '{}'::jsonb;
end $$;

commit;

