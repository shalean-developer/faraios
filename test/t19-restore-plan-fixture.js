import {digest} from '../scripts/t19-bootstrap-engine.mjs';
import {SOURCE,CLIENT_IMAGE,DUMPS} from '../scripts/backup-staging.mjs';
export function restorePlanFixture(){
 const names=['audit.fixture_events',...Array.from({length:29},(_,i)=>'public.fixture_'+String(i).padStart(2,'0'))];
 const scope={version:2,source:SOURCE,id:'synthetic-restore',catalog:'1'.repeat(64),application:'2'.repeat(64),managed:'3'.repeat(64),tables:names};
 const tables=[...names.map(n=>{const [schema,table]=n.split('.');return {schema,table,owner:'postgres',rls:true,rows:0,sha256:digest('')};}),{schema:'auth',table:'users',rows:0,sha256:digest('')},{schema:'supabase_migrations',table:'schema_migrations',rows:0,sha256:digest('')}];
 const m={database_major:17,business_ids:['0cc3f518-d64e-40c2-8817-bc14d1ef1420','612be091-b1d7-4911-9c3b-143446a9fe27'],extensions:['btree_gist','pg_stat_statements','pgcrypto','plpgsql','supabase_vault','uuid-ossp'],extension_versions:{btree_gist:'1.7',pg_stat_statements:'1.11',pgcrypto:'1.3',plpgsql:'1.0',supabase_vault:'0.3.1','uuid-ossp':'1.1'},vault_secrets:0,storage_objects:0,storage_buckets:0,large_objects:0,unexpected_schemas:[],catalog_sha256:scope.catalog,scope:scope.id,catalog_version:2,restore_catalog:{application:scope.application,managed:scope.managed},sequence_state:[{schema:'auth',sequence:'refresh_tokens_id_seq',last_value:'50'}],tables};
 const manifest={version:1,source:SOURCE,filterSource:'supabase/cli@2.121.0',clientImage:CLIENT_IMAGE,started:'2026-10-26T08:54:31.422Z',finished:'2026-10-26T08:58:22.674Z',before:m,after:structuredClone(m)};
 const contents={
  'roles.sql':'GRANT SET ON PARAMETER "log_min_messages" TO "supabase_realtime_admin";\nRESET ALL;\n',
  'schema.sql':names.map(n=>'ALTER TABLE '+n.split('.').map(s=>'"'+s+'"').join('.')+' ENABLE ROW LEVEL SECURITY;').join('\n'),
  'migration-schema.sql':'CREATE SCHEMA supabase_migrations;CREATE TABLE supabase_migrations.schema_migrations(version text);',
  'managed-schema-reference.sql':'-- comparison only',
  'manifest.json':JSON.stringify(manifest)
 };
 for(const member of ['data.sql','migration-data.sql'])contents[member]=tables.filter(t=>(member==='migration-data.sql')===(t.schema==='supabase_migrations')).map(t=>`COPY "${t.schema}"."${t.table}" ("id") FROM stdin;\n\\.\n`).join('');
 contents['data.sql']+="SELECT pg_catalog.setval('\"auth\".\"refresh_tokens_id_seq\"', 50, true);\n";
 const files=[...DUMPS.map(([n])=>n),'manifest.json'].map(name=>({name,content:contents[name],sha256:digest(contents[name])}));
 return {backup:{payload:{source:SOURCE,files}},scope};
}
