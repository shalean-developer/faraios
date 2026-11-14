-- Existing owner-only, non-anonymous UPDATE RLS remains in force.
-- No ownership, document, publication or financial-history changes.
begin;
grant update (name, business_type) on public.businesses to authenticated;
commit;
