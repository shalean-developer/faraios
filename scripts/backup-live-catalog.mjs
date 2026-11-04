// T30: out-of-snapshot structural/role guard.
// The portable catalog includes login-role capabilities, memberships, default
// privileges, grants, policies and application/managed schema definitions.
// These checks MUST use independent live transactions, never the exported
// database snapshot, so unexpected changes can reject an in-progress archive.
const HEX=/^[a-f0-9]{64}$/;
export function freshCatalogSQL(portable){
 if(typeof portable!=='string'||!/^-- Portable structural fingerprints:/.test(portable)||
    !portable.includes('jsonb_object_agg(scope,encode(extensions.digest(value::text'))throw Error('BACKUP_LIVE_CATALOG_SQL_INVALID');
 const trimmed=portable.trim();
 if(!trimmed.endsWith(';')||trimmed.includes('BEGIN;')||trimmed.includes('COMMIT;'))throw Error('BACKUP_LIVE_CATALOG_SQL_INVALID');
 return "begin transaction isolation level read committed read only;\n"+
  "set local search_path = '';\n"+trimmed+"\nrollback;";
}
export function parseFreshCatalog(stdout){
 let value;
 try{value=JSON.parse(stdout.trim());}catch{throw Error('BACKUP_LIVE_CATALOG_INVALID');}
 const keys=value&&typeof value==='object'&&!Array.isArray(value)?Object.keys(value):[];
 if(keys.length!==1||keys[0]!=='catalog')throw Error('BACKUP_LIVE_CATALOG_INVALID');
 const catalog=value.catalog;
 if(!catalog||typeof catalog!=='object'||Array.isArray(catalog)||
    Object.keys(catalog).sort().join('|')!=='application|managed'||
    !HEX.test(catalog.application)||!HEX.test(catalog.managed))throw Error('BACKUP_LIVE_CATALOG_INVALID');
 return Object.freeze({application:catalog.application,managed:catalog.managed});
}
export function assertFreshCatalog(fresh,expected){
 if(!expected||fresh.application!==expected.application||fresh.managed!==expected.managed)
  throw Error('BACKUP_LIVE_CATALOG_CHANGED');
}
