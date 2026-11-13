begin;
-- Owner explicitly approved deployment after authenticated preview review.
create or replace function enquiry_private.manual_create(p_business uuid,p_environment text,p_id uuid,p_name text,p_email text,p_phone text,p_requirements text) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if p_environment is null or p_environment not in ('live','preview') or not exists(select 1 from enquiry_private.ingress where environment=p_environment and enabled) then raise exception 'Enquiries unavailable';end if;
 if not exists(select 1 from public.businesses where id=p_business and owner_id=auth.uid() and not coalesce((auth.jwt()->>'is_anonymous')::boolean,true)) then raise exception 'Enquiry unavailable';end if;
 if p_id is null or p_name is null or p_email is null or p_phone is null or p_requirements is null or char_length(btrim(p_name)) not between 2 and 120 or char_length(p_email)>254 or char_length(p_phone)>40 or char_length(btrim(p_requirements)) not between 10 and 4000 or (p_email='' and p_phone='') or (p_email<>'' and p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$') or (p_phone<>'' and (p_phone !~ '^[+0-9 ()-]{5,40}$' or char_length(regexp_replace(p_phone,'[^0-9]','','g'))<5)) or p_name||p_email||p_phone ~ '[[:cntrl:]]' or p_requirements ~ '[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]' then raise exception 'Check enquiry details';end if;
 insert into public.business_enquiries(id,business_id,environment,request_id,page_slug,customer_name,email,phone,requirements)
 values(p_id,p_business,p_environment,p_id,'',btrim(p_name),p_email,p_phone,btrim(p_requirements)) on conflict(id) do nothing;
 if not exists(select 1 from public.business_enquiries where id=p_id and business_id=p_business and environment=p_environment and customer_name=btrim(p_name) and email=p_email and phone=p_phone and requirements=btrim(p_requirements)) then raise exception 'Enquiry submission changed';end if;
 return jsonb_build_object('id',p_id);
end$$;
notify pgrst,'reload schema';
commit;
