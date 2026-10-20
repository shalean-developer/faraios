begin transaction isolation level repeatable read read only;
set local statement_timeout = '60s';
set local timezone = 'UTC';
with tables as materialized (
 select n.nspname as schema_name,c.relname as table_name,c.relrowsecurity as rls
 from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and n.nspname in ('public','audit','auth','storage','supabase_migrations')
), fingerprints as materialized (
 select *,query_to_xml(format(
  'select count(*) as n,encode(extensions.digest(coalesce(string_agg(h, '''' order by h),''''),''sha256''),''hex'') as h from (select encode(extensions.digest(to_jsonb(t)::text,''sha256''),''hex'') as h from %I.%I t) q',
  schema_name,table_name),false,false,'') as x from tables
), catalog as (
 select jsonb_build_object(
  'columns',(select jsonb_agg(to_jsonb(a) order by a.table_schema,a.table_name,a.ordinal_position) from information_schema.columns a where a.table_schema in ('public','audit','auth','storage','supabase_migrations')),
  'constraints',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,k.conname,pg_get_constraintdef(k.oid)) order by n.nspname,c.relname,k.conname) from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'functions',(select jsonb_agg(jsonb_build_array(n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),pg_get_functiondef(p.oid),p.proowner,p.proacl,p.proconfig,p.prosecdef) order by n.nspname,p.proname,pg_get_function_identity_arguments(p.oid)) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','audit','auth','storage') and p.prokind in ('f','p')),
  'triggers',(select jsonb_agg(pg_get_triggerdef(t.oid) order by n.nspname,c.relname,t.tgname) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where not t.tgisinternal and n.nspname in ('public','audit','auth','storage')),
  'policies',(select jsonb_agg(to_jsonb(p) order by p.schemaname,p.tablename,p.policyname) from pg_policies p where p.schemaname in ('public','audit','auth','storage')),
  'acl',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,c.relowner,c.relacl,c.relrowsecurity,c.relforcerowsecurity) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'default_acl',(select jsonb_agg(to_jsonb(a) order by a.oid) from pg_default_acl a),
  'schemas',(select jsonb_agg(jsonb_build_array(n.nspname,n.nspowner,n.nspacl) order by n.nspname) from pg_namespace n where n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'column_acl',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,a.attname,a.attacl) order by n.nspname,c.relname,a.attnum) from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where not a.attisdropped and a.attnum>0 and n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'role_members',(select jsonb_agg(to_jsonb(a) order by a.roleid,a.member,a.grantor) from pg_auth_members a),
  'views',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,pg_get_viewdef(c.oid)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('v','m') and n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'indexes',(select jsonb_agg(jsonb_build_array(n.nspname,c.relname,pg_get_indexdef(c.oid)) order by n.nspname,c.relname) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('i','I') and n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'sequences',(select jsonb_agg(to_jsonb(s) order by s.schemaname,s.sequencename) from pg_sequences s where s.schemaname in ('public','audit','auth','storage','supabase_migrations')),
  'types',(select jsonb_agg(to_jsonb(t) order by n.nspname,t.typname) from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'enums',(select jsonb_agg(to_jsonb(e) order by e.enumtypid,e.enumsortorder) from pg_enum e join pg_type t on t.oid=e.enumtypid join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','audit','auth','storage','supabase_migrations')),
  'roles',(select jsonb_agg(to_jsonb(r) order by r.rolname) from pg_roles r)
 ) as value
)
select jsonb_build_object(
 'database_major',current_setting('server_version_num')::integer/10000,
 'business_ids',(select jsonb_agg(id order by id) from public.businesses),
 'extensions',(select jsonb_agg(extname order by extname) from pg_extension),
 'extension_versions',(select jsonb_object_agg(extname,extversion order by extname) from pg_extension),
 'vault_secrets',(select count(*) from vault.secrets),
 'storage_objects',(select count(*) from storage.objects),
 'storage_buckets',(select count(*) from storage.buckets),
 'large_objects',(select count(*) from pg_largeobject_metadata),
 'unexpected_schemas',(select coalesce(jsonb_agg(distinct n.nspname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname not like 'pg_%' and n.nspname not in ('information_schema','public','audit','auth','storage','supabase_migrations','extensions','realtime','graphql','graphql_public','vault')),
 'catalog_sha256',(select encode(extensions.digest(value::text,'sha256'),'hex') from catalog),
 'tables',(select jsonb_agg(jsonb_build_object('schema',schema_name,'table',table_name,'rls',rls,'rows',((xpath('//n/text()',x))[1]::text)::bigint,'sha256',(xpath('//h/text()',x))[1]::text) order by schema_name,table_name) from fingerprints)
) as manifest;
commit;
