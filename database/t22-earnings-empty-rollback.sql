-- STAGING only, after disabling writers. Never erase retained earnings history.
begin;
lock table private_t22.agreements,private_t22.accruals in access exclusive mode;
do $$begin
 if exists(select 1 from private_t22.agreements) or exists(select 1 from private_t22.accruals) then
  raise exception 'T22 history exists: disable source routes; retain ledger and adjustment history';
 end if;
end;$$;
drop function public.t22_earnings(text,jsonb);
drop function private_t22.office_rpc(text,jsonb);
drop table private_t22.accruals;
drop table private_t22.agreements;
drop schema private_t22;
commit;
