-- T31 branding candidate, unapplied. Owner-scoped settings and separate immutable audit.
begin;
create table public.t31_business_branding (
 business_id uuid primary key references public.businesses(id) on delete restrict,
 accent_color text not null default '#146C94' check(accent_color ~ '^#[0-9A-F]{6}$'),
 logo_url text not null default '' check(length(logo_url)<=500 and
 (logo_url='' or (logo_url ~ '^https://[a-zA-Z0-9.-]+(:[0-9]{2,5})?/[a-zA-Z0-9_./%~?=&-]+$' and position('..' in logo_url)=0))),
 version integer not null default 1 check(version>=1)
);
alter table public.t31_business_branding enable row level security;
revoke all on public.t31_business_branding from public,anon,authenticated;
grant select,insert,update on public.t31_business_branding to authenticated;
create policy t31_brand_owner_read on public.t31_business_branding for select to authenticated using (
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy t31_brand_owner_insert on public.t31_business_branding for insert to authenticated with check (
 exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create policy t31_brand_owner_update on public.t31_business_branding for update to authenticated
 using(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'))
 with check(exists(select 1 from public.business_memberships m join public.businesses b on b.id=m.business_id
 where m.business_id=t31_business_branding.business_id and m.user_id=(select auth.uid()) and m.role='owner' and m.status='active' and b.status='active'));
create table private_t31.brand_audit (
 id bigint generated always as identity primary key,
 business_id uuid not null, actor_user_id uuid not null,
 old_value jsonb, new_value jsonb, occurred_at timestamptz not null default now()
);
alter table private_t31.brand_audit enable row level security;
revoke all on private_t31.brand_audit from public,anon,authenticated;
create function private_t31.capture_brand() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if tg_table_schema<>'public' or tg_table_name<>'t31_business_branding' then raise exception 'Unexpected audit source'; end if;
 if tg_op='UPDATE' and (old.business_id<>new.business_id or new.version<>old.version) then
  raise exception 'Branding identity/version is immutable';end if;
 insert into private_t31.brand_audit(business_id,actor_user_id,old_value,new_value)
 values(new.business_id,auth.uid(),case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
revoke all on function private_t31.capture_brand() from public,anon,authenticated;
create trigger t31_brand_audit after insert or update on public.t31_business_branding
for each row execute function private_t31.capture_brand();
commit;
