with managed_tables as (
 select n.nspname,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
 where c.relkind in ('r','p') and n.nspname in ('auth','storage')
 and not (n.nspname='auth' and c.relname='schema_migrations')
 and not (n.nspname='storage' and c.relname='migrations')
), counts as (
 select query_to_xml(format('select count(*) as n from %I.%I',nspname,relname),false,false,'') as x from managed_tables
)
select jsonb_build_object(
 'database_major',current_setting('server_version_num')::integer/10000,
 'database',current_database(),'role',current_user,
 'application_objects',(select count(*) from (select c.oid from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','audit','supabase_migrations') union all select t.oid from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname in ('public','audit','supabase_migrations') and t.typtype in ('d','e','r','m') union all select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','audit','supabase_migrations')) objects),
 'managed_data_rows',(select coalesce(sum(((xpath('//n/text()',x))[1]::text)::bigint),0) from counts),
 'large_objects',(select count(*) from pg_largeobject_metadata),
 'vault_secrets',(select count(*) from vault.secrets),
 'foreign_servers',(select count(*) from pg_foreign_server),
 'sequence_privileges',(select coalesce(jsonb_agg(jsonb_build_object('name',n.nspname||'.'||c.relname,'can_select',has_sequence_privilege('postgres',c.oid,'SELECT'),'can_update',has_sequence_privilege('postgres',c.oid,'UPDATE')) order by n.nspname,c.relname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='S' and n.nspname in ('public','audit','auth','storage','supabase_migrations')),
 'extension_versions',(select jsonb_object_agg(extname,extversion) from pg_extension),
 'btree_gist_default',(select default_version from pg_available_extensions where name='btree_gist'),
 'unexpected_schemas',(select coalesce(jsonb_agg(distinct n.nspname),'[]'::jsonb) from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind in ('r','p') and n.nspname not like 'pg_%' and n.nspname not in ('information_schema','public','audit','auth','storage','supabase_migrations','extensions','realtime','graphql','graphql_public','vault'))
) as preflight;
