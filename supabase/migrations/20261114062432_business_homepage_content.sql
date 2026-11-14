-- Optional content only. No row updates, grants, policies or publication changes.
begin;
create or replace function public.business_profile_valid(d jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare k text; h jsonb; l jsonb; hp jsonb; benefit jsonb;
begin
 if d ? 'homepage' then
  hp=d->'homepage';
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

commit;
