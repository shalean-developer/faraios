"""Prepare an atomic shared-project candidate. No hosted execution."""
from pathlib import Path
import importlib.util,re,shutil,sys
ROOT=Path(__file__).resolve().parents[2]

def installation():
    capture="""
create temporary table sc04_before_policies on commit drop as select * from pg_policies;
create temporary table sc04_before_functions on commit drop as
select p.oid,p.proacl::text as acl,pg_get_functiondef(p.oid) as definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname in ('public','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private');
create temporary table sc04_before_relations on commit drop as
select c.oid,c.relacl::text as acl,c.relrowsecurity,c.relforcerowsecurity,c.reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname in ('public','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private');
create temporary table sc04_before_business_acl on commit drop as
select 'table' as kind,0::smallint as num,relacl::text as acl from pg_class where oid='public.businesses'::regclass
union all select 'column',attnum,attacl::text from pg_attribute where attrelid='public.businesses'::regclass;
do $$begin
 if exists(select 1 from pg_policies where policyname like 'sc04_%') then raise exception 'Existing SC04 policies: stop';end if;
end$$;
"""
    pieces=[]
    for name in ['authorization.sql','adapters.sql','delegation.sql']:
        source=(ROOT/'docs/sc04'/name).read_text()
        if name=='delegation.sql':
            old="exists(select 1 from authorization_private.delegation_gate where enabled)"
            if source.count(old)!=2:raise ValueError('Gate source drift')
            source=source.replace(old,old+" and exists(select 1 from authorization_private.preview_businesses s where s.business_id=b)",1)
            start=source.index('create or replace function public.business_contexts')
            source=source[:start]+source[start:].replace(old,old+" and exists(select 1 from authorization_private.preview_businesses s where s.business_id=b.id)")
        pieces.append(re.sub(r'(?m)^(?:begin|commit);\s*$', '',source))
        if name=='authorization.sql':
            pieces.append('''
create table authorization_private.preview_businesses(business_id uuid primary key references public.businesses on delete restrict);
alter table authorization_private.preview_businesses enable row level security;
revoke all on authorization_private.preview_businesses from public,anon,authenticated,service_role;
''')
    retain="""
-- Never commit the temporary global adapters. Private dispatcher copies retain
-- their guarded implementations; original owner surfaces retain exact behavior.
do $$declare r record;begin
 for r in select definition from authorization_private.legacy_functions order by identity loop execute r.definition;end loop;
 for r in select schemaname,tablename,policyname from pg_policies where policyname like 'sc04_%' loop
  execute format('drop policy %I on %I.%I',r.policyname,r.schemaname,r.tablename);
 end loop;
end$$;
grant insert(owner_id,name,business_type,country,time_zone) on public.businesses to authenticated;
do $$begin
 if exists(select 1 from sc04_before_functions b left join pg_proc p on p.oid=b.oid where p.oid is null or b.acl is distinct from p.proacl::text or b.definition<>pg_get_functiondef(p.oid)) then raise exception 'Legacy function/ACL drift';end if;
 if exists(select 1 from sc04_before_relations b left join pg_class c on c.oid=b.oid where c.oid is null or b.acl is distinct from c.relacl::text or b.relrowsecurity<>c.relrowsecurity or b.relforcerowsecurity<>c.relforcerowsecurity or b.reloptions is distinct from c.reloptions) then raise exception 'Legacy relation security drift';end if;
 if exists((select * from sc04_before_policies except select * from pg_policies)
 union all (select * from pg_policies except select * from sc04_before_policies)) then raise exception 'Legacy policy drift';end if;
 if exists((select * from sc04_before_business_acl except
 (select 'table',0::smallint,relacl::text from pg_class where oid='public.businesses'::regclass union all select 'column',attnum,attacl::text from pg_attribute where attrelid='public.businesses'::regclass))
 union all ((select 'table',0::smallint,relacl::text from pg_class where oid='public.businesses'::regclass union all select 'column',attnum,attacl::text from pg_attribute where attrelid='public.businesses'::regclass) except select * from sc04_before_business_acl)) then raise exception 'Legacy business grant drift';end if;
 if exists(select 1 from authorization_private.legacy_functions where definition<>pg_get_functiondef(to_regprocedure(identity))) then raise exception 'Legacy function drift';end if;
 if exists(select 1 from authorization_private.delegation_gate where enabled) then raise exception 'Gate must remain off';end if;
end$$;
"""
    return 'begin;\nset local lock_timeout=\'5s\';\n'+capture+'\n'.join(pieces)+retain+'\ncommit;\n'

def stage(destination):
    spec=importlib.util.spec_from_file_location('sc04_stage',ROOT/'docs/sc04/stage.py')
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    destination=module.stage(destination)
    shutil.copyfile(ROOT/'docs/sc04/shared-recovery.py',destination/'scripts/sc04_recovery.py')
    return destination

if __name__=='__main__':
    output=Path(sys.argv[1]);output.mkdir(parents=True,exist_ok=False)
    (output/'shared-install.sql').write_text(installation())
    stage(output/'application')
