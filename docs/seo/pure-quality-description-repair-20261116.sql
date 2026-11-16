-- Applied metadata-only repair. No schema or permission change.
-- Original values: the three description fields were empty strings.
-- Draft and published document were identical; original version 7.
begin;
do $repair$
declare
 target uuid := '89d76ecc-5489-4c87-be0c-7114d43d7fa0';
 pub public.business_public_pages%rowtype;
 draftrow public.business_profiles%rowtype;
 updated jsonb;
 other_before text;
 other_after text;
 spec jsonb := '{"areas":"Check the service coverage published by Pure Quality Cleaning Services. Share your location with the business to confirm availability before requesting a visit.","services":"Explore the cleaning services listed by Pure Quality Cleaning Services. Contact the business to discuss your requirements and confirm the scope before booking.","contact":"Contact Pure Quality Cleaning Services about cleaning requirements, property details or an existing booking. Discuss availability and agree the next steps directly."}'::jsonb;
 entry record;
begin
 select * into strict pub from public.business_public_pages where business_id=target and environment='live' and slug='pure-quality-cleaning-services' for update;
 select * into strict draftrow from public.business_profiles where business_id=target and environment='live' for update;
 if draftrow.version<>7 or md5(pub.document::text)<>'dbc34fce1d10f41750965eea997d7fd2' or draftrow.draft<>pub.document then raise exception 'SEO baseline changed; stop';end if;
 select md5(string_agg(rowtext,'|' order by rowtext)) into other_before from (
 select to_jsonb(p)::text rowtext from public.business_public_pages p where not (p.business_id=target and p.environment='live')
 union all select to_jsonb(d)::text from public.business_profiles d where not (d.business_id=target and d.environment='live')
 ) s;
 updated:=pub.document;
 for entry in select key,value from jsonb_each_text(spec) loop
  if updated#>>array['seo','pages',entry.key,'description'] is distinct from '' then raise exception 'Nonempty owner metadata';end if;
  updated:=jsonb_set(updated,array['seo','pages',entry.key,'description'],to_jsonb(entry.value),false);
 end loop;
 if (updated #- '{seo,pages,areas,description}' #- '{seo,pages,services,description}' #- '{seo,pages,contact,description}') is distinct from (pub.document #- '{seo,pages,areas,description}' #- '{seo,pages,services,description}' #- '{seo,pages,contact,description}') then raise exception 'Unrelated document changed';end if;
 update public.business_public_pages set document=updated where business_id=target and environment='live';
 update public.business_profiles set draft=updated,version=version+1 where business_id=target and environment='live' and version=7;
 if not found then raise exception 'Draft concurrency conflict';end if;
 if exists(select 1 from public.business_profiles d where d.business_id=target and d.environment='live' and (d.published_at is distinct from draftrow.published_at or d.published_slug is distinct from draftrow.published_slug or d.slug is distinct from draftrow.slug)) then raise exception 'Publication fields changed';end if;
 if exists(select 1 from public.business_public_pages p where p.business_id=target and p.environment='live' and (p.slug is distinct from pub.slug or p.time_zone is distinct from pub.time_zone)) then raise exception 'Published routing changed';end if;
 select md5(string_agg(rowtext,'|' order by rowtext)) into other_after from (
 select to_jsonb(p)::text rowtext from public.business_public_pages p where not (p.business_id=target and p.environment='live')
 union all select to_jsonb(d)::text from public.business_profiles d where not (d.business_id=target and d.environment='live')
 ) s;
 if other_before is distinct from other_after then raise exception 'Other profile rows changed';end if;
end $repair$;
select 'SEO-03 metadata applied' as result, p.slug,d.version,(d.draft=p.document) as draft_matches_public,
p.document#>>'{seo,pages,areas,description}' as areas,
p.document#>>'{seo,pages,services,description}' as services,
p.document#>>'{seo,pages,contact,description}' as contact
from public.business_public_pages p join public.business_profiles d using(business_id,environment)
where p.business_id='89d76ecc-5489-4c87-be0c-7114d43d7fa0' and p.environment='live';
commit;