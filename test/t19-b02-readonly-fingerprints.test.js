import test from 'node:test';
import assert from 'node:assert/strict';
import {PROTECTED_TABLES,tableFingerprintQuery,collectProtectedSnapshot} from '../scripts/t19-b02-readonly-fingerprints.mjs';
test('only reviewed staging finance and custody tables are fingerprinted',()=>{
 assert.equal(PROTECTED_TABLES.length,8);
 assert.throws(()=>tableFingerprintQuery('public.customers'));
 assert.match(tableFingerprintQuery('public.business_invoices'),/to_jsonb/);
});
function mock(){
 const seen=[];
 const client={query:async sql=>{
 seen.push(sql);
 if(sql.startsWith('SELECT current_user'))return {rows:[{u:'postgres',s:'postgres',v:170011,ro:'on'}]};
 if(sql.includes('AS roles'))return {rows:[{roles:0,schemas:0,functions:0}]};
 if(sql.includes("AS fingerprint FROM ("))return {rows:[{fingerprint:'f'.repeat(32)}]};
 if(sql.includes('FROM vault.secrets'))return {rows:[{n:'0'}]};
 if(sql.includes('AS fingerprint FROM public.')||sql.includes('AS fingerprint FROM private_'))return {rows:[{n:'2',fingerprint:'a'.repeat(32)}]};
 return {rows:[]};
 }};
 return {client,seen};
}
test('read-only repeatable-read snapshot uses no write SQL and no raw data output',async()=>{
 const {client,seen}=mock();const x=await collectProtectedSnapshot(client,{connectionId:'first'});
 assert.equal(Object.keys(x.tableCounts).length,8);
 assert.equal(x.tableCounts['public.business_invoices'],'2');
 assert.equal(x.financialDigest.length,64);
 assert.equal(seen[0],'BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
 assert.equal(seen.at(-1),'COMMIT');
 assert.equal(seen.filter(s=>/\b(INSERT|UPDATE|DELETE|CREATE|ALTER|DROP)\b/i.test(s)).length,0);
});
test('fail closed on failed identity and rollback',async()=>{
 const {client,seen}=mock();
 const old=client.query;client.query=async sql=>sql.startsWith('SELECT current_user')?{rows:[{u:'anon',s:'anon',v:170000,ro:'on'}]}:old(sql);
 await assert.rejects(collectProtectedSnapshot(client,{connectionId:'bad'}),/identity/);
 assert.equal(seen.at(-1),'ROLLBACK');
});
test('reject missing connection evidence',async()=>{await assert.rejects(collectProtectedSnapshot(mock().client,{}),/connection/);});
