-- Owner-only RLS is unchanged; additive column grants, no row rewrites.
begin;
grant update (name, business_type) on public.businesses to authenticated;
commit;
