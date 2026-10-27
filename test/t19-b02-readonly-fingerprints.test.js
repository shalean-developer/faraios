import test from 'node:test';
import assert from 'node:assert/strict';
import {PROTECTED_TABLES,tableFingerprintQuery,collectProtectedSnapshot,classifyReadOnlyIdentity} from '../scripts/t19-b02-readonly-fingerprints.mjs';
test('only reviewed staging finance and custody tables are fingerprinted',()=>{
 assert.equal(PROTECTED_TABLES.length,8);
 assert.throws(()=>tableFingerprintQuery('public.customers'));
 assert.match(tableFingerprintQuery('public.business_invoices'),/to_jsonb/);
});
function mock(){
 const seen=[];
 const client={query:async sql=>{
 seen.push(sql);
 if(sql.startsWith('SELECT current_user'))return {rows:[{u:'postgres',s:'postgres',v:170011,ro:'on',backend:17381,tls:true}]};
 if(sql.includes('AS roles'))return {rows:[{roles:0,schemas:0,functions:0}]};
 if(sql.includes("AS fingerprint FROM ("))return {rows:[{fingerprint:'f'.repeat(32)}]};
 if(sql.includes('FROM vault.secrets'))return {rows:[{n:'0'}]};
 if(sql.includes('AS fingerprint FROM public.')||sql.includes('AS fingerprint FROM private_'))return {rows:[{n:'2',fingerprint:'a'.repeat(32)}]};
 return {rows:[]};
 }};
 return {client,seen};
}
test('read-only repeatable-read snapshot uses no write SQL and no raw data output',async()=>{
 const {client,seen}=mock();const x=await collectProtectedSnapshot(client);
 assert.equal(Object.keys(x.tableCounts).length,8);
 assert.equal(x.tableCounts['public.business_invoices'],'2');
 assert.equal(x.financialDigest.length,64); 
 assert.equal(x.connectionId,'17381');
 assert.equal(seen[0],'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 assert.equal(seen.at(-1),'COMMIT');
 assert.equal(seen.filter(s=>/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(s)).length,0);
});
test('fail closed on failed identity and rollback',async()=>{
 const {client,seen}=mock();
 const old=client.query;client.query=async sql=>sql.startsWith('SELECT current_user')?{rows:[{u:'anon',s:'anon',v:170000,ro:'on',backend:17382,tls:true}]}:old(sql);
 await assert.rejects(collectProtectedSnapshot(client),/identity/);
 assert.equal(seen.at(-1),'ROLLBACK');
});
test('reject unavailable TLS or database backend session evidence',async()=>{
 for(const change of [{tls:false},{backend:null}]){
  const {client}=mock();const original=client.query;
  client.query=async sql=>sql.startsWith('SELECT current_user')?{rows:[{u:'postgres',s:'postgres',v:170011,ro:'on',backend:17381,tls:true,...change}]}:original(sql);
  await assert.rejects(collectProtectedSnapshot(client),/identity/);
 }
});
test('reject non-readonly request',async()=>{await assert.rejects(collectProtectedSnapshot(mock().client,{readOnly:false}),/Read-only/);});

test('identity diagnostics are fixed categories, never row values',()=>{
 const base={u:'postgres',s:'postgres',v:170011,ro:'on',backend:17381,tls:true};
 const cases=[
  [{u:'other'},'IDENTITY_ROLE_MISMATCH'],
  [{s:'other'},'IDENTITY_ROLE_MISMATCH'],
  [{v:160000},'IDENTITY_VERSION_MISMATCH'],
  [{ro:'off'},'IDENTITY_NOT_READ_ONLY'],
  [{backend:null},'IDENTITY_BACKEND_INVALID'],
  [{tls:false},'IDENTITY_PG_SSL_UNVERIFIED'],
 ];
 assert.equal(classifyReadOnlyIdentity(base),null);
 for(const [change,expected] of cases){
  const actual=classifyReadOnlyIdentity({...base,...change,untrusted:'private-row-content'});
  assert.equal(actual,expected);
  assert.ok(!actual.includes('private-row-content'));
 }
});
