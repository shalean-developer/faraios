import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyReadOnlyPooler} from '../scripts/t30-probe-session-pooler.mjs';

const SNAP='00000003-000000AB-1';
function factory({failImport=false,incorrectUser=false,brokenKeeper=false}={}){
 const clients=[],queries=[];
 const create=async options=>{
  const n=clients.length;const handlers={};
  const c={
   options,handlers,on(name,cb){handlers[name]=cb;},
   async connect(){queries.push({n,sql:'CONNECT'});},
   async query(sql){queries.push({n,sql});
    if(sql.startsWith('SELECT pg_export_snapshot()'))return {rows:[{snapshot:SNAP,readonly:'on'}]};
    if(sql.startsWith('SET TRANSACTION SNAPSHOT')&&failImport)throw Error('synthetic import denied');
    if(sql.startsWith("SELECT current_setting('transaction_read_only')"))
      return {rows:[{readonly:'on',db:'postgres',db_user:incorrectUser?'another_role':'postgres'}]};
    return {rows:[]};
   },
   async end(){queries.push({n,sql:'END'});}
  };
  clients.push(c);
  if(brokenKeeper&&n===1)clients[0].handlers.error();
  return c;
 };
 return {create,clients,queries};
}
test('T30 read-only probe accepts cross-connection snapshot import and closes both sessions',async()=>{
 const f=factory();
 const r=await verifyReadOnlyPooler({password:'synthetic password',clientFactory:f.create});
 assert.equal(r.result,'T30_POOLER_SNAPSHOT_IMPORT_PASS');
 assert.equal(r.writes,0);assert.equal(r.exports,0);
 assert.equal(f.clients.length,2);
 assert.equal(f.clients[0].options.port,5432);
 assert.equal(f.clients[0].options.ssl.rejectUnauthorized,true);
 assert.equal(f.clients[1].options.ssl.rejectUnauthorized,true);
 assert.equal(f.queries.filter(q=>q.sql.startsWith('SET TRANSACTION SNAPSHOT')).length,1);
 assert.equal(f.queries.filter(q=>q.sql==='ROLLBACK').length,2);
 assert.equal(f.queries.filter(q=>q.sql==='END').length,2);
 assert.ok(!JSON.stringify(r).includes('synthetic password'));
 assert.ok(!JSON.stringify(r).includes(SNAP));
});
test('T30 imported snapshot rejection and identity mismatch fail closed without token leaks',async()=>{
 for(const options of [{failImport:true},{incorrectUser:true},{brokenKeeper:true}]){
  const f=factory(options);
  await assert.rejects(verifyReadOnlyPooler({password:'synthetic password',clientFactory:f.create}),e=>e.message==='T30_POOLER_SNAPSHOT_IMPORT_NOT_VERIFIED');
  assert.equal(f.queries.filter(q=>q.sql==='END').length,2);
  assert.equal(f.queries.filter(q=>q.sql==='ROLLBACK').length,2);
 }
});
test('T30 pre-aborted owner request never opens a DB connection',async()=>{
 const c=new AbortController();c.abort();const f=factory();
 await assert.rejects(verifyReadOnlyPooler({password:'synthetic password',clientFactory:f.create,signal:c.signal}));
 assert.equal(f.clients.length,0);
});
