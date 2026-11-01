-- Exact empty-install rollback. Allow only non-inheriting/non-SET installer
-- administration grants automatically created by managed PostgreSQL.
begin;
do $$begin
 if exists(select 1 from private_t20.accounts) or exists(select 1 from private_t20.intents)
 or exists(select 1 from private_t20.observations) or exists(select 1 from private_t20.credits)
 or exists(select 1 from private_t20.backend_accounts)
 or exists(select 1 from pg_auth_members m join pg_roles r on r.oid=m.roleid where r.rolname='t20_payment_verifier'
 and(m.member<>current_user::regrole or m.inherit_option or m.set_option))
 then raise exception 't20_rollback_requires_empty_inactive_install';end if;
end;$$;
drop function public.t20_payment_owner(text,jsonb),public.t20_payment_backend(text,jsonb);
drop function private_t20.owner_rpc(text,jsonb),private_t20.backend_rpc(text,jsonb),private_t20.live_session();
drop function private_t20.publish_verified(uuid,text,uuid,text,text,integer,text);
drop function private_t20.create_intent(uuid,uuid,uuid),private_t20.configure_account(uuid,text,boolean),private_t20.authorized(uuid,boolean);
drop table private_t20.backend_accounts,private_t20.observations,private_t20.credits;
drop table private_t20.intents;
drop table private_t20.accounts;
drop schema private_t20;
drop role t20_payment_verifier;
commit;
