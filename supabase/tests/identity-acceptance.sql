begin;
do $test$
declare
u_owner uuid := gen_random_uuid(); u_manager uuid := gen_random_uuid(); u_other uuid := gen_random_uuid();
b_a uuid := gen_random_uuid(); b_b uuid := gen_random_uuid(); n integer;
begin
insert into auth.users(id) values(u_owner),(u_manager),(u_other);
insert into public.businesses(id,name,industry) values(b_a,'Synthetic A','cleaning'),(b_b,'Synthetic B','cleaning');
insert into public.business_memberships(business_id,user_id,role) values(b_a,u_owner,'owner'),(b_b,u_owner,'owner'),(b_b,u_manager,'manager');
perform set_config('request.jwt.claim.sub',u_owner::text,true);
execute 'set local role authenticated';
select count(*) into n from public.businesses;
if n<>2 then raise exception 'Owner scope failed'; end if;
execute 'reset role';
perform set_config('request.jwt.claim.sub',u_manager::text,true);
execute 'set local role authenticated';
select count(*) into n from public.businesses;
if n<>1 then raise exception 'Manager scope failed'; end if;
select count(*) into n from public.businesses where id=b_a;
if n<>0 then raise exception 'Cross-business read allowed'; end if;
begin
update public.business_memberships set role='owner' where user_id=u_manager;
raise exception 'Role escalation allowed';
exception when insufficient_privilege then null; end;
execute 'reset role';
update public.business_memberships set status='suspended' where user_id=u_manager;
execute 'set local role authenticated';
select count(*) into n from public.businesses;
if n<>0 then raise exception 'Suspended membership access allowed'; end if;
execute 'reset role';
perform set_config('request.jwt.claim.sub',u_other::text,true);
execute 'set local role authenticated';
select count(*) into n from public.businesses;
if n<>0 then raise exception 'Outsider access allowed'; end if;
execute 'reset role';
execute 'set local role anon';
begin
perform 1 from public.businesses;
raise exception 'Anonymous read allowed';
exception when insufficient_privilege then null; end;
execute 'reset role';
end
$test$;
select 'PASS: owner scope, manager isolation, escalation denial, suspension, outsider and anonymous denial; all fixture data rolled back' as result;
rollback;