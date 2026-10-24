-- Opt-in disposable native PostgreSQL proof. NEVER a hosted migration.
begin;
do $$ begin
 if current_database()<>'faraios_t19_test' or current_user<>'t19_fixture'
 or current_setting('faraios.c2',true) is distinct from 'synthetic' then
 raise exception 'Local fixture only'; end if;
end $$;
create schema c2;
revoke all on schema c2 from public;
create table c2.workers(login name primary key,business_id uuid not null references public.businesses(id),environment text not null);
create table c2.credentials(
 business_id uuid not null, connection_id uuid primary key,
 binding jsonb not null, key_version integer not null check(key_version>0),
 epoch uuid not null, reference uuid not null,
 phase text not null default 'idle' check(phase in ('idle','claimed','dispatched','recovery_required','reauthorisation_required')),
 fence bigint not null default 0, attempt uuid, job uuid references t19_local.operations(id),
 deadline timestamptz, published_attempt uuid,
 unique(business_id,connection_id),
 foreign key(business_id,connection_id) references t19_local.connections(business_id,id),
 check((binding->>'business_id')::uuid=business_id),check((binding->>'connection_id')::uuid=connection_id),
 check(binding->>'provider'='synthetic'),check(binding->>'environment'='synthetic')
);
create table c2.events(
 id bigint generated always as identity primary key, business_id uuid not null, connection_id uuid not null,
 attempt uuid, fence bigint not null, kind text not null, executor name not null,
 at timestamptz not null default clock_timestamp(),
 foreign key(business_id,connection_id) references c2.credentials(business_id,connection_id)
);
create trigger immutable before update or delete on c2.events for each row execute function t19_local.immutable();
alter table c2.credentials enable row level security;
alter table c2.workers enable row level security;
alter table c2.events enable row level security;
-- Definer owns private tables. Worker identity is session_user, never a client GUC.
create function c2.step(action text,b jsonb,j uuid,e uuid,a uuid default null,f bigint default null,r uuid default null,k integer default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare c t19_local.connections; s c2.credentials; o t19_local.operations; result jsonb;
begin
 if not exists(select 1 from c2.workers w where w.login=session_user
 and w.business_id=(b->>'business_id')::uuid and w.environment=b->>'environment') then
 raise exception 'worker denied' using errcode='42501'; end if;
 select * into c from t19_local.connections where id=(b->>'connection_id')::uuid for update;
 if not found or c.business_id is distinct from (b->>'business_id')::uuid then
 raise exception 'connection denied' using errcode='42501'; end if;
 select * into o from t19_local.operations where id=j;
 if not found or o.business_id<>c.business_id or o.connection_id<>c.id or o.generation<>c.generation
 or o.state not in ('pending','claimed','dispatched','uncertain')
 or not t19_local.allowed(c.business_id,o.created_by) then
 raise exception 'job denied' using errcode='42501'; end if;
 select * into s from c2.credentials where connection_id=c.id for update;
 if not found or s.epoch is distinct from e or c.status<>'connected'
 or c.generation<>(s.binding->>'generation')::integer
 or c.organization_id is distinct from s.binding->>'organization_id' then
 raise exception 'stale' using errcode='40001'; end if;
 -- Lost acknowledgement may read the exact committed result; it cannot republish.
 if action='published' then
 if s.published_attempt is distinct from a or s.binding is distinct from b or s.phase<>'idle' then
 raise exception 'stale' using errcode='40001'; end if;
 elsif s.binding is distinct from b then raise exception 'stale' using errcode='40001';
 end if;
 if action='claim' then
 if s.phase not in ('idle','claimed') or (s.phase='claimed' and s.deadline>clock_timestamp()) then
 raise exception 'busy or recovery required' using errcode='55000'; end if;
 s.phase:='claimed';s.attempt:=gen_random_uuid();s.fence:=s.fence+1;s.job:=j;
 s.deadline:=clock_timestamp()+interval '30 seconds';
 elsif action in ('dispatch','publish','hold','invalid_grant','release') then
 if s.attempt is distinct from a or s.fence is distinct from f or s.job is distinct from j then
 raise exception 'stale' using errcode='40001'; end if;
 if action in ('dispatch','publish','invalid_grant') and s.deadline<=clock_timestamp() then
 raise exception 'lease expired' using errcode='40001'; end if;
 if action='dispatch' then
 if s.phase<>'claimed' then raise exception 'phase' using errcode='40001'; end if;
 s.phase:='dispatched';
 elsif action='publish' then
 if s.phase<>'dispatched' or r is null or k is distinct from s.key_version then
 raise exception 'phase or key' using errcode='40001'; end if;
 s.binding:=jsonb_set(s.binding,'{credential_version}',to_jsonb((b->>'credential_version')::integer+1));
 s.reference:=r;s.phase:='idle';s.published_attempt:=a;
 elsif action='release' then
 if s.phase<>'claimed' then raise exception 'phase' using errcode='40001'; end if;
 s.phase:='idle';
 else
 if s.phase<>'dispatched' then raise exception 'phase' using errcode='40001'; end if;
 s.phase:=case when action='invalid_grant' then 'reauthorisation_required' else 'recovery_required' end;
 end if;
 elsif action not in ('current','published') then raise exception 'action denied' using errcode='42501';
 end if;
 if action='current' and s.phase in ('recovery_required','reauthorisation_required') then
 raise exception 'recovery required' using errcode='55000'; end if;
 if action not in ('current','published') then
 update c2.credentials set binding=s.binding,phase=s.phase,attempt=s.attempt,fence=s.fence,job=s.job,
 deadline=s.deadline,reference=s.reference,published_attempt=s.published_attempt where connection_id=c.id;
 insert into c2.events(business_id,connection_id,attempt,fence,kind,executor) values(c.business_id,c.id,s.attempt,s.fence,action,session_user);
 end if;
 return to_jsonb(s);
end $$;
revoke all on all functions in schema c2 from public;
-- Role grants are supplied by the disposable fixture, never application/browser roles.
commit;
