-- T19 Stage B local schema draft only. NOT a hosted/generated migration.
-- Requires the existing businesses/memberships/auth.uid contracts and a dedicated
-- NOLOGIN t19_worker role provisioned by the disposable test harness.
begin;
do $$ begin
 if current_setting('faraios.stage_b',true) is distinct from 'synthetic' then
  raise exception 'Synthetic Stage B fixture required';
 end if;
end $$;
create schema t19_local;
revoke all on schema t19_local from public,anon,authenticated,service_role,t19_worker;
grant usage on schema t19_local to authenticated,t19_worker;
alter default privileges in schema t19_local revoke execute on functions from public;

create table t19_local.connections(
 id uuid primary key default gen_random_uuid(), business_id uuid not null unique references public.businesses(id),
 provider text not null default 'synthetic' check(provider='synthetic'),
 environment text not null default 'synthetic' check(environment='synthetic'),
 region text not null default 'local' check(region='local'),
 organization_id text not null unique check(organization_id ~ '^synthetic-[a-z0-9-]{1,40}$'),
 generation integer not null default 1 check(generation>0),
 status text not null default 'connected' check(status in ('connected','disconnected','quarantined')),
 unique(business_id,id)
);
create table t19_local.generations(
 business_id uuid not null, connection_id uuid not null, generation integer not null,
 reason text not null check(reason in ('connect','reauthorise','disconnect')),
 actor uuid not null, created_at timestamptz not null default clock_timestamp(),
 primary key(connection_id,generation),unique(business_id,connection_id,generation),
 foreign key(business_id,connection_id) references t19_local.connections(business_id,id)
);
create table t19_local.intents(
 business_id uuid not null references public.businesses(id), id uuid not null,
 amount_cents integer not null check(amount_cents>=0), currency text not null check(currency='ZAR'),
 created_by uuid not null,created_at timestamptz not null default clock_timestamp(),primary key(business_id,id), unique(id)
);
create table t19_local.operations(
 id uuid primary key default gen_random_uuid(), business_id uuid not null,connection_id uuid not null,generation integer not null,
 local_id uuid not null, action text not null default 'create_draft' check(action='create_draft'),
 revision integer not null default 1 check(revision=1), request_hash text not null,
 created_by uuid not null, created_at timestamptz not null default clock_timestamp(),
 state text not null default 'pending' check(state in ('pending','claimed','dispatched','uncertain','verified','cancelled','review_required')),
 attempt_id uuid, lease_until timestamptz, dispatched_at timestamptz, receipt jsonb,
 unique(business_id,local_id,action,revision), unique(business_id,id),
 foreign key(business_id,connection_id,generation) references t19_local.generations(business_id,connection_id,generation),
 foreign key(business_id,local_id) references t19_local.intents(business_id,id)
);
create unique index t19_remote_identity on t19_local.operations(connection_id,(receipt->>'remote_id')) where receipt is not null;
create index t19_operations_connection on t19_local.operations(business_id,connection_id,generation,state);
create table t19_local.events(
 id bigint generated always as identity primary key,business_id uuid not null,connection_id uuid not null,generation integer not null,
 operation_id uuid, actor uuid not null, executor_role text not null default current_setting('role'), kind text not null, evidence jsonb, created_at timestamptz not null default clock_timestamp(),
 foreign key(business_id,connection_id,generation) references t19_local.generations(business_id,connection_id,generation),
 foreign key(business_id,operation_id) references t19_local.operations(business_id,id)
);
create index t19_events_scope on t19_local.events(business_id,id);

create function t19_local.allowed(b uuid,u uuid,owner_only boolean default false) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.business_memberships m join public.businesses b0 on b0.id=m.business_id
 where m.business_id=b and m.user_id=u and m.status='active' and b0.status='active'
 and (m.role='owner' or not owner_only and m.role='manager'))
$$;
create function t19_local.require_access(b uuid,owner_only boolean default false) returns void
language plpgsql security definer set search_path='' as $$ begin
 if not t19_local.allowed(b,auth.uid(),owner_only) then raise exception 'Accounting access denied' using errcode='42501';end if;
end $$;
create function t19_local.can_read(b uuid) returns boolean language sql stable security definer set search_path='' as $$
 select t19_local.allowed(b,auth.uid())
$$;
create function t19_local.immutable() returns trigger language plpgsql set search_path='' as $$ begin
 raise exception 'Accounting history is immutable' using errcode='42501';
end $$;
create trigger t19_generations_immutable before update or delete on t19_local.generations for each row execute function t19_local.immutable();
create trigger t19_intents_immutable before update or delete on t19_local.intents for each row execute function t19_local.immutable();
create trigger t19_events_immutable before update or delete on t19_local.events for each row execute function t19_local.immutable();
create function t19_local.protect_identity() returns trigger language plpgsql set search_path='' as $$ begin
 if tg_op='DELETE' then raise exception 'Accounting identity is immutable';end if;
 if tg_table_name='connections' then
  if (to_jsonb(old)-array['status','generation']) is distinct from (to_jsonb(new)-array['status','generation']) then raise exception 'Connection identity is immutable';end if;
 else
  if (to_jsonb(old)-array['state','attempt_id','lease_until','dispatched_at','receipt']) is distinct from (to_jsonb(new)-array['state','attempt_id','lease_until','dispatched_at','receipt']) then raise exception 'Operation identity is immutable';end if;
 end if;return new;
end $$;
create trigger t19_connection_identity before update or delete on t19_local.connections for each row execute function t19_local.protect_identity();
create trigger t19_operation_identity before update or delete on t19_local.operations for each row execute function t19_local.protect_identity();

do $$ declare tab text;begin
 foreach tab in array array['connections','generations','intents','operations','events'] loop
  execute format('alter table t19_local.%I enable row level security',tab);
  execute format('revoke all on t19_local.%I from public,anon,authenticated,service_role,t19_worker',tab);
  execute format('grant select on t19_local.%I to authenticated',tab);
  execute format('create policy business_read on t19_local.%I for select to authenticated using (t19_local.can_read(business_id))',tab);
 end loop;
end $$;

create function t19_local.connect(b uuid,org text) returns uuid language plpgsql security definer set search_path='' as $$
declare c uuid;begin
 perform t19_local.require_access(b,true);
 insert into t19_local.connections(business_id,organization_id) values(b,org) returning id into c;
 insert into t19_local.generations values(b,c,1,'connect',auth.uid(),clock_timestamp());
 insert into t19_local.events(business_id,connection_id,generation,actor,kind) values(b,c,1,auth.uid(),'connected');return c;
end $$;
create function t19_local.change_connection(b uuid,cid uuid,expected integer,action text) returns integer language plpgsql security definer set search_path='' as $$
declare c t19_local.connections;begin
 perform t19_local.require_access(b,true);
 select * into c from t19_local.connections where business_id=b and id=cid for update;
 if not found then raise exception 'Accounting access denied' using errcode='42501';end if;
 if expected is distinct from c.generation then raise exception 'Stale generation' using errcode='40001';end if;
 if action is null or action not in ('reauthorise','disconnect') then raise exception 'Invalid connection action' using errcode='22023';end if;
 if c.status='quarantined' and action='reauthorise' then raise exception 'Quarantined connection requires review' using errcode='55000';end if;
 update t19_local.connections set generation=generation+1,status=case when c.status='quarantined' then 'quarantined' when action='disconnect' then 'disconnected' else 'connected' end where id=cid;
 insert into t19_local.generations values(b,cid,c.generation+1,action,auth.uid(),clock_timestamp());
 update t19_local.operations set state=case when dispatched_at is null then 'cancelled' else 'uncertain' end
 where connection_id=cid and state in ('pending','claimed','dispatched','uncertain');
 insert into t19_local.events(business_id,connection_id,generation,actor,kind) values(b,cid,c.generation+1,auth.uid(),action);
 return c.generation+1;
end $$;
create function t19_local.register_intent(b uuid,local_id uuid,amount integer) returns uuid language plpgsql security definer set search_path='' as $$
declare i t19_local.intents;begin
 perform t19_local.require_access(b);
 insert into t19_local.intents(business_id,id,amount_cents,currency,created_by) values(b,local_id,amount,'ZAR',auth.uid()) on conflict(business_id,id) do nothing;
 select * into i from t19_local.intents where business_id=b and id=local_id;
 if i.amount_cents is distinct from amount then raise exception 'Intent replay differs' using errcode='22023';end if;return i.id;
end $$;
create function t19_local.enqueue(b uuid,cid uuid,expected integer,local_id uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare c t19_local.connections;i t19_local.intents;o t19_local.operations;h text;begin
 perform t19_local.require_access(b);
 select * into c from t19_local.connections where business_id=b and id=cid for update;
 if not found then raise exception 'Accounting access denied' using errcode='42501';end if;
 if c.generation is distinct from expected or c.status<>'connected' then raise exception 'Connection unavailable' using errcode='40001';end if;
 select * into i from t19_local.intents where business_id=b and id=local_id;
 if not found then raise exception 'Accounting access denied' using errcode='42501';end if;
 h:=md5(jsonb_build_object('local_id',i.id,'amount_cents',i.amount_cents,'currency',i.currency)::text);
 select * into o from t19_local.operations where business_id=b and operations.local_id=i.id;
 if found then
  if o.connection_id<>cid or o.generation<>expected or o.request_hash<>h then raise exception 'Historical operation requires review' using errcode='40001';end if;
  return o.id;
 end if;
 insert into t19_local.operations(business_id,connection_id,generation,local_id,request_hash,created_by) values(b,cid,expected,i.id,h,auth.uid()) returning * into o;
 insert into t19_local.events(business_id,connection_id,generation,operation_id,actor,kind) values(b,cid,expected,o.id,auth.uid(),'enqueued');return o.id;
end $$;

-- Workers receive only opaque durable IDs. Reload both tenant and actor authority.
-- Lock order is always connection, then operation for dispatch/disconnect/finish.
create function t19_local.claim(b uuid,oid uuid) returns jsonb language plpgsql security definer set search_path='' as $$
declare c t19_local.connections;o t19_local.operations;i t19_local.intents;mode text;begin
 select * into o from t19_local.operations where business_id=b and id=oid;
 if not found then raise exception 'Accounting access denied' using errcode='42501';end if;
 select * into c from t19_local.connections where business_id=b and id=o.connection_id for update;
 select * into o from t19_local.operations where business_id=b and id=oid for update;
 if not t19_local.allowed(b,o.created_by) then raise exception 'Accounting access denied' using errcode='42501';end if;
 if c.status<>'connected' or c.generation<>o.generation then raise exception 'Stale connection' using errcode='40001';end if;
 if o.state not in ('pending','claimed','dispatched','uncertain') or (o.state in ('claimed','dispatched') and o.lease_until>clock_timestamp()) then raise exception 'Operation not claimable' using errcode='40001';end if;
 mode:=case when o.dispatched_at is null then 'create' else 'reconcile' end;
 update t19_local.operations set state='claimed',attempt_id=gen_random_uuid(),lease_until=clock_timestamp()+interval '30 seconds' where id=oid returning * into o;
 select * into i from t19_local.intents where business_id=b and id=o.local_id;
 insert into t19_local.events(business_id,connection_id,generation,operation_id,actor,kind) values(b,c.id,c.generation,oid,o.created_by,'claimed_'||mode);
 return jsonb_build_object('operation',to_jsonb(o),'connection',to_jsonb(c),'intent',to_jsonb(i),'mode',mode);
end $$;
create function t19_local.dispatch(b uuid,oid uuid,attempt uuid) returns void language plpgsql security definer set search_path='' as $$
declare c t19_local.connections;o t19_local.operations;begin
 select * into o from t19_local.operations where business_id=b and id=oid;
 if not found then raise exception 'Accounting access denied' using errcode='42501';end if;
 select * into c from t19_local.connections where business_id=b and id=o.connection_id for update;
 select * into o from t19_local.operations where business_id=b and id=oid for update;
 if not t19_local.allowed(b,o.created_by) then raise exception 'Accounting access denied' using errcode='42501';end if;
 if attempt is null or c.status<>'connected' or c.generation<>o.generation or o.state<>'claimed' or o.attempt_id is distinct from attempt or o.lease_until<=clock_timestamp() then raise exception 'Dispatch fenced' using errcode='40001';end if;
 update t19_local.operations set state='dispatched',dispatched_at=coalesce(dispatched_at,clock_timestamp()) where id=oid;
 insert into t19_local.events(business_id,connection_id,generation,operation_id,actor,kind) values(b,c.id,c.generation,oid,o.created_by,'dispatch_authorised');
end $$;
create function t19_local.finish(b uuid,oid uuid,attempt uuid,result text,r jsonb default null) returns text language plpgsql security definer set search_path='' as $$
declare c t19_local.connections;o t19_local.operations;i t19_local.intents;next_state text;begin
 select * into o from t19_local.operations where business_id=b and id=oid;
 if not found then raise exception 'Accounting access denied' using errcode='42501';end if;
 select * into c from t19_local.connections where business_id=b and id=o.connection_id for update;
 select * into o from t19_local.operations where business_id=b and id=oid for update;
 if attempt is null or o.attempt_id is distinct from attempt or o.dispatched_at is null or o.state not in ('dispatched','uncertain') then raise exception 'Completion fenced' using errcode='40001';end if;
 if result is null or result not in ('verified','uncertain','mismatch') then raise exception 'Invalid completion' using errcode='22023';end if;
 select * into i from t19_local.intents where business_id=b and id=o.local_id;
 if result='verified' and (r is null or jsonb_typeof(r)<>'object' or
  r->>'business_id' is distinct from b::text or r->>'organization_id' is distinct from c.organization_id or
  r->>'connection_id' is distinct from c.id::text or r->>'generation' is distinct from o.generation::text or
  r->>'local_id' is distinct from i.id::text or r->>'operation_id' is distinct from o.id::text or
  r->>'amount_cents' is distinct from i.amount_cents::text or r->>'currency' is distinct from i.currency or
  coalesce(r->>'remote_id','') !~ '^synthetic-[a-z0-9-]{1,80}$' or
  (r-array['business_id','organization_id','connection_id','generation','local_id','operation_id','amount_cents','currency','remote_id'])<>'{}'::jsonb) then result:='mismatch';end if;
 next_state:=case when c.generation<>o.generation or c.status<>'connected' or not t19_local.allowed(b,o.created_by) or o.lease_until<=clock_timestamp() then 'uncertain'
 when result='mismatch' then 'review_required' else result end;
 if result='mismatch' and c.generation=o.generation then update t19_local.connections set status='quarantined' where id=c.id;end if;
 update t19_local.operations set state=next_state,receipt=case when next_state='verified' then r else receipt end,lease_until=null,attempt_id=null where id=oid;
 insert into t19_local.events(business_id,connection_id,generation,operation_id,actor,kind,evidence) values(b,c.id,o.generation,oid,o.created_by,case when next_state='uncertain' and result='verified' then 'late_receipt_review_required' else next_state end,case when result='verified' then r else null end);
 return next_state;
end $$;

revoke all on all functions in schema t19_local from public,anon,authenticated,service_role,t19_worker;
grant execute on function t19_local.can_read(uuid) to authenticated;
grant execute on function t19_local.connect(uuid,text),t19_local.change_connection(uuid,uuid,integer,text),t19_local.register_intent(uuid,uuid,integer),t19_local.enqueue(uuid,uuid,integer,uuid) to authenticated;
grant execute on function t19_local.claim(uuid,uuid),t19_local.dispatch(uuid,uuid,uuid),t19_local.finish(uuid,uuid,uuid,text,jsonb) to t19_worker;
commit;
