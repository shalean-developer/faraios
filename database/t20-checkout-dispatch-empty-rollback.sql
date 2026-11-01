-- Roll back this additive increment only, before any checkout claim exists.
begin;
do $$begin
 if exists(select 1 from private_t20.checkouts) then raise exception 't20_checkout_rollback_requires_empty_store';end if;
end;$$;
drop function public.t20_payment_checkout(text,jsonb);
drop function private_t20.checkout_rpc(text,jsonb);
drop table private_t20.checkouts;
commit;
