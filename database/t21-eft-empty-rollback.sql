-- STAGING only, before any retained T21 evidence. Stop writers first.
begin;
lock table private_t21.receipts,private_t21.allocations in access exclusive mode;
do $$begin
 if exists(select 1 from private_t21.receipts) or exists(select 1 from private_t21.allocations) then raise exception 'T21 history exists: disable source routes and retain schema/history';end if;
end;$$;
drop trigger t21_online_guard on private_t20.intents;
drop function public.t21_eft(text,jsonb);
drop function private_t21.office_rpc(text,jsonb);
drop function private_t21.online_guard();
drop table private_t21.invoice_fences;
drop table private_t21.allocations;
drop table private_t21.receipts;
drop schema private_t21;
commit;
