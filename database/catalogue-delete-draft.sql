-- Owner-requested catalogue deletion; existing DELETE trigger retains audit evidence.
begin;
grant delete on public.business_catalogue to authenticated;
create policy catalogue_delete on public.business_catalogue for delete to authenticated using(exists(
 select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=business_catalogue.business_id and m.user_id=(select auth.uid()) and m.status='active' and m.role='owner' and b.status='active'));
commit;
