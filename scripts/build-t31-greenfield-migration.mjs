// Builds one atomic, empty-target-only package. Never connects to a database.
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {GREENFIELD_T31_FILES} from '../src/t31-greenfield-manifest.js';
export const migrationPath='deploy/t31-greenfield/supabase/migrations/20261106195033_t31_onboarding_foundation.sql';
export async function buildMigration(){
 let sql=`-- Generated T31 onboarding installation. New synthetic project only.
-- Target: qcmnxjilmsibxftfverd. Never use on original staging or a legacy system.
-- No historical records, accounts, recipients or operational defaults are seeded.
begin;
set local lock_timeout='5s';
set local statement_timeout='60s';
do $$ begin
 if exists(select 1 from pg_tables where schemaname='public')
 or exists(select 1 from pg_namespace where nspname in ('audit','private_t31'))
 or exists(select 1 from pg_roles where rolname in ('t31_bootstrap','t31_invite_worker'))
 then raise exception 'T31 requires an empty application target'; end if;
end $$;
`;
 for(const path of GREENFIELD_T31_FILES){
  const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
  sql+='\n-- Source: '+path+' SHA256 '+createHash('sha256').update(source).digest('hex')+'\n';
  sql+=source.replace(/^\s*(?:begin|commit);\s*$/gm,'')+'\n';
 }
 return sql+'\ncommit;\n';
}
const sql=await buildMigration();
if(process.argv[2]==='--check'){
 if(await readFile(new URL('../'+migrationPath,import.meta.url),'utf8')!==sql)throw Error('T31 migration is stale');
 console.log('T31_GENERATED_MIGRATION_CURRENT');
}else if(process.argv.length===2){await writeFile(new URL('../'+migrationPath,import.meta.url),sql);}
else throw Error('Unexpected migration builder argument');
