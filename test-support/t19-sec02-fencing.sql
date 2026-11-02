-- SEC-02 disposable PostgreSQL fencing prototype, not a hosted migration.
\set ON_ERROR_STOP on
begin;
do $$
begin
 if current_database()<>'faraios_t19_test' or current_user<>'t19_fixture'
    or current_setting('faraios.sec02',true) is distinct from 'synthetic'
 then raise exception 'SEC02 synthetic context required'; end if;
end $$;
create table custody_test.fenced (
 business_id uuid not null,
 environment text not null check(environment='synthetic'),
 provider text not null check(provider='synthetic'),
 connection_id uuid primary key,
 generation integer not null check(generation>0),
 organization_id text not null,
 credential_version integer not null check(credential_version>0),
 status text not null check(status in ('active','disabled')),
 operation_id uuid unique,
 lease_id uuid,
 phase text not null check(phase in ('idle','claimed','dispatched','prepared','uncertain','disabled')),
 sealed_reference uuid,
 epoch uuid not null,
 unique (business_id,connection_id)
);
revoke all on custody_test.fenced from public;
grant select,update on custody_test.fenced to t19_custody;
create function custody_test.fenced_step(action text, b jsonb, op uuid, lease uuid, expected_epoch uuid, new_ref uuid default null)
returns text language plpgsql security invoker set search_path='' as $$
declare c custody_test.fenced%rowtype;
begin
 if session_user <> 't19_custody' then
   raise exception 'custody principal required' using errcode='42501';
 end if;
 -- Lock first; inspect state and 7-field identity AFTER acquiring row lock.
 select * into c from custody_test.fenced
 where connection_id=(b->>'connection_id')::uuid for update;
 if not found or c.business_id::text is distinct from b->>'business_id'
   or c.environment is distinct from b->>'environment'
   or c.provider is distinct from b->>'provider'
   or c.connection_id::text is distinct from b->>'connection_id'
   or c.generation::text is distinct from b->>'generation'
   or c.organization_id is distinct from b->>'organization_id'
   or c.credential_version::text is distinct from b->>'credential_version'
   or c.epoch is distinct from expected_epoch
 then raise exception 'stale identity' using errcode='42501'; end if;
 if action='disconnect' then
   if c.status='disabled' then return 'already_disabled'; end if;
   update custody_test.fenced set status='disabled',generation=generation+1,
     phase='disabled',lease_id=null, sealed_reference=null
   where connection_id=c.connection_id;
   return 'disabled';
 end if;
 if c.status<>'active' then raise exception 'disabled' using errcode='42501'; end if;
 if action='claim' and c.phase='idle' and op is not null and lease is not null then
   update custody_test.fenced set phase='claimed',operation_id=op,lease_id=lease
   where connection_id=c.connection_id;
   return 'claimed';
 elsif action='dispatch' and c.phase='claimed' and c.operation_id=op and c.lease_id=lease then
   update custody_test.fenced set phase='dispatched' where connection_id=c.connection_id;
   return 'dispatched';
 elsif action='prepare' and c.phase='dispatched' and c.operation_id=op and c.lease_id=lease and new_ref is not null then
   update custody_test.fenced set phase='prepared',sealed_reference=new_ref where connection_id=c.connection_id;
   return 'prepared';
 elsif action='publish' and c.phase='prepared' and c.operation_id=op and c.lease_id=lease and c.sealed_reference=new_ref then
   update custody_test.fenced set phase='idle',credential_version=credential_version+1,
      lease_id=null,operation_id=null,sealed_reference=null
   where connection_id=c.connection_id;
   return 'published';
 elsif action='uncertain' and c.phase='dispatched' and c.operation_id=op and c.lease_id=lease then
   update custody_test.fenced set phase='uncertain' where connection_id=c.connection_id;
   return 'uncertain';
 end if;
 raise exception 'invalid transition' using errcode='42501';
end $$;
revoke all on function custody_test.fenced_step(text,jsonb,uuid,uuid,uuid,uuid) from public;
grant execute on function custody_test.fenced_step(text,jsonb,uuid,uuid,uuid,uuid) to t19_custody;
insert into custody_test.fenced values
('612be091-b1d7-4911-9c3b-143446a9fe27','synthetic','synthetic',
 '44444444-4444-4444-8444-444444444444',1,'synthetic-shalean',1,
 'active',null,null,'idle',null,'55555555-5555-4555-8555-555555555555');
commit;
