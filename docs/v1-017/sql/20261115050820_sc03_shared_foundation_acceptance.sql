-- SC-03 candidate only: deliberately outside automatic migrations.
-- Execute only in disposable tests until a separate release authorization.
begin;
create table public.shared_core_aggregates (
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 kind text not null check(kind ~ '^[a-z][a-z0-9_.]{0,63}$'),
 id uuid not null, version bigint not null check(version>0),
 snapshot jsonb not null check(jsonb_typeof(snapshot)='object'),
 primary key(business_id,environment,kind,id)
);
create table public.shared_core_commands (
 business_id uuid not null references public.businesses(id) on delete restrict,
 environment text not null check(environment in ('preview','live')),
 idempotency_key uuid not null, actor uuid not null, reason text not null,
 envelope jsonb not null, result jsonb not null,
 recorded_at timestamptz not null default transaction_timestamp(),
 primary key(business_id,environment,idempotency_key)
);
create table public.shared_core_events (
 business_id uuid not null, environment text not null, command_id uuid not null,
 ordinal integer not null check(ordinal>0), kind text not null, aggregate_id uuid not null,
 expected_version bigint not null, version bigint not null,
 snapshot jsonb not null, schema_version integer not null default 1 check(schema_version=1),
 primary key(business_id,environment,command_id,ordinal),
 unique(business_id,environment,kind,aggregate_id,version),
 foreign key(business_id,environment,command_id) references public.shared_core_commands(business_id,environment,idempotency_key) on delete restrict,
 foreign key(business_id,environment,kind,aggregate_id) references public.shared_core_aggregates(business_id,environment,kind,id) on delete restrict,
 check(version=expected_version+1)
);
alter table public.shared_core_aggregates enable row level security;
alter table public.shared_core_commands enable row level security;
alter table public.shared_core_events enable row level security;
revoke all on public.shared_core_aggregates,public.shared_core_commands,public.shared_core_events from public,anon,authenticated,service_role;
create function public.shared_core_immutable() returns trigger language plpgsql set search_path='' as $$
begin raise exception 'Shared core history is immutable';end $$;
revoke all on function public.shared_core_immutable() from public,anon,authenticated,service_role;
create trigger shared_core_commands_immutable before update or delete on public.shared_core_commands for each row execute function public.shared_core_immutable();
create trigger shared_core_events_immutable before update or delete on public.shared_core_events for each row execute function public.shared_core_immutable();

-- Trusted internal caller only; no SECURITY DEFINER and no client EXECUTE.
-- No dispatch into legacy tables. Future adapters require separate authorization.
create function public.shared_core_apply(p_business uuid,p_environment text,p_key uuid,p_actor uuid,p_reason text,p_changes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare envelope jsonb; prior public.shared_core_commands; c jsonb; v bigint;
 result jsonb:='[]'; ordinal integer:=0;
begin
 if p_business is null or p_environment is null or p_environment<>'preview' or p_key is null or p_actor is null
 or p_reason is null or length(btrim(p_reason)) not between 4 and 1000
 or p_changes is null or octet_length(p_changes::text)>1048576 or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes) not between 1 and 100
 then raise exception 'Invalid command envelope' using errcode='22023';end if;
 if p_actor is distinct from auth.uid() or coalesce((auth.jwt()->>'is_anonymous')::boolean,true)
 or not exists(select 1 from public.businesses where id=p_business and owner_id=p_actor)
 then raise exception 'Actor denied' using errcode='42501';end if;
 -- Validate exact shape and canonical order before any writes or locks.
 for c in select value from jsonb_array_elements(p_changes) loop
  if jsonb_typeof(c)<>'object' or (select count(*) from jsonb_object_keys(c))<>5
  or not (c ?& array['kind','id','expected_version','schema','snapshot'])
  or jsonb_typeof(c->'kind')<>'string' or (c->>'kind') !~ '^[a-z][a-z0-9_.]{0,63}$'
  or jsonb_typeof(c->'id')<>'string' or (c->>'id') !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  or jsonb_typeof(c->'expected_version')<>'number' or (c->>'expected_version') !~ '^(0|[1-9][0-9]{0,17})$'
  or c->'schema'<>'1'::jsonb or jsonb_typeof(c->'snapshot')<>'object'
  then raise exception 'Invalid change contract' using errcode='22023';end if;
 end loop;
 if (select count(*) from (select distinct value->>'kind',value->>'id' from jsonb_array_elements(p_changes)) x)<>jsonb_array_length(p_changes)
 then raise exception 'Duplicate aggregate' using errcode='22023';end if;
 select jsonb_build_object('schema',1,'actor',p_actor,'reason',p_reason,'changes',jsonb_agg(value order by value->>'kind' collate "C",value->>'id' collate "C"))
 into envelope from jsonb_array_elements(p_changes);
 -- One tenant/environment transaction lock FIRST. Hash collisions only serialize.
 -- Multi-business transactions and legacy adapters are not supported.
 perform pg_advisory_xact_lock(hashtextextended(p_business::text||':'||p_environment,73003));
 select * into prior from public.shared_core_commands where business_id=p_business and environment=p_environment and idempotency_key=p_key;
 if found then
  if prior.envelope<>envelope then raise exception 'Idempotency payload conflict' using errcode='22023';end if;
  return prior.result; -- Exact retry wins over expected-version staleness.
 end if;
 for c in select value from jsonb_array_elements(envelope->'changes') loop
  select version into v from public.shared_core_aggregates where business_id=p_business and environment=p_environment and kind=c->>'kind' and id=(c->>'id')::uuid for update;
  v:=coalesce(v,0);
  if v<>(c->>'expected_version')::bigint then raise exception 'Stale aggregate version' using errcode='40001';end if;
  insert into public.shared_core_aggregates values(p_business,p_environment,c->>'kind',(c->>'id')::uuid,v+1,c->'snapshot')
  on conflict(business_id,environment,kind,id) do update set version=excluded.version,snapshot=excluded.snapshot;
  result:=result||jsonb_build_array(jsonb_build_object('kind',c->>'kind','id',c->>'id','version',v+1));
 end loop;
 insert into public.shared_core_commands values(p_business,p_environment,p_key,p_actor,p_reason,envelope,result,transaction_timestamp());
 for c in select value from jsonb_array_elements(envelope->'changes') loop
  ordinal:=ordinal+1;
  insert into public.shared_core_events values(p_business,p_environment,p_key,ordinal,c->>'kind',(c->>'id')::uuid,(c->>'expected_version')::bigint,(c->>'expected_version')::bigint+1,c->'snapshot',1);
 end loop;
 return result;
end $$;
revoke all on function public.shared_core_apply(uuid,text,uuid,uuid,text,jsonb) from public,anon,authenticated,service_role;
commit;

