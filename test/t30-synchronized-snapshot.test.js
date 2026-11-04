import test from 'node:test';
import assert from 'node:assert/strict';
import {openSnapshotKeeper,validateSnapshotId,bindManifestSnapshot,snapshotDumpFlag} from '../scripts/backup-snapshot.mjs';
import {dumpSpec,DUMPS} from '../scripts/backup-staging.mjs';

const SNAP='00000003-000000AB-1';
function fakeClient({broken=false,readonly='on',invalid=false,failAt='' }={}){
 const calls=[],events=new Map();
 const client={
  calls,events,
  on(event,fn){events.set(event,fn);},
  async connect(){calls.push('connect');if(failAt==='connect')throw Error('unavailable');},
  async query(sql){calls.push(sql);if(failAt==='begin'&&sql.startsWith('BEGIN'))throw Error('unavailable');
   if(sql.startsWith('SELECT pg_export_snapshot()'))return {rows:[{snapshot:invalid?'unsafe;DROP':SNAP,readonly}]};
   return {rows:[]};
  },
  async end(){calls.push('end');}
 };
 if(broken)client.on=()=>{};
 return client;
}
const settings={host:'session-pooler.invalid',port:5432,user:'postgres.synthetic',database:'postgres',password:'synthetic',ca:'-----BEGIN CERTIFICATE-----\nsynthetic\n-----END CERTIFICATE-----\n'};
test('T30 snapshot identifier is a constrained backend token, never shell text',()=>{
 assert.equal(validateSnapshotId(SNAP),SNAP);
 assert.equal(snapshotDumpFlag(SNAP),'--snapshot='+SNAP);
 for(const value of ['',undefined,'00000003-x-1','00000003-000000AB-1;touch /tmp/file','ab'.repeat(80)]) {
  assert.throws(()=>validateSnapshotId(value));
 }
});
test('T30 metadata transaction imports the exported snapshot exactly once',()=>{
 const source='begin transaction isolation level repeatable read read only;\nset local timezone = \'UTC\';\nselect 1;\ncommit;';
 const sql=bindManifestSnapshot(source,SNAP);
 assert.ok(sql.includes('begin transaction isolation level repeatable read read only;\nset transaction snapshot \''+SNAP+'\';'));
 assert.equal(sql.split('set transaction snapshot').length,2);
 for(const invalid of ['select 1;',source.replace('read only','read write')])assert.throws(()=>bindManifestSnapshot(invalid,SNAP));
 assert.throws(()=>bindManifestSnapshot(source,'not-snapshot'));
});
test('T30 all pg_dump data/schema/migration members import identical snapshot; roles-only explicitly cannot',()=>{
 assert.equal(DUMPS.length,6);
 for(const [name] of DUMPS){
  const spec=dumpSpec(name,SNAP);
  if(name==='roles.sql') {
   assert.equal(spec.env.EXTRA_FLAGS,undefined);
   assert.equal(spec.script.includes('pg_dumpall'),true);
  } else {
   assert.ok(spec.script.includes('pg_dump'));
   assert.ok(spec.env.EXTRA_FLAGS.includes('--snapshot='+SNAP),name);
   assert.equal((spec.env.EXTRA_FLAGS.match(/--snapshot=/g)||[]).length,1);
  }
  assert.equal(dumpSpec(name).env.EXTRA_FLAGS?.includes('--snapshot=')??false,false);
 }
 assert.throws(()=>dumpSpec('data.sql',';unsafe'));
});
test('T30 keeper opens a read-only session; releases on success, failure and invalid snapshots',async()=>{
 const client=fakeClient();
 const keeper=await openSnapshotKeeper({...settings,clientFactory:()=>client});
 assert.equal(keeper.id,SNAP);keeper.assertAlive();
 assert.deepEqual(client.calls.slice(0,3),['connect','BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY',"SELECT pg_export_snapshot() AS snapshot, current_setting('transaction_read_only') AS readonly"]);
 await keeper.close();await keeper.close();
 assert.deepEqual(client.calls.slice(-2),['ROLLBACK','end']);
 assert.throws(()=>keeper.assertAlive());
 for(const opts of [{readonly:'off'},{invalid:true},{failAt:'begin'}]){
  const bad=fakeClient(opts);
  await assert.rejects(openSnapshotKeeper({...settings,clientFactory:()=>bad}));
  assert.equal(bad.calls.at(-1),'end');
 }
});
test('T30 keeper fails closed if backend disconnects or operator cancels',async()=>{
 const bad=fakeClient();
 const c=new AbortController();
 const keeper=await openSnapshotKeeper({...settings,clientFactory:()=>bad,signal:c.signal});
 bad.events.get('error')();assert.throws(()=>keeper.assertAlive());
 await keeper.close();
 const abort=fakeClient();
 const k=await openSnapshotKeeper({...settings,clientFactory:()=>abort,signal:c.signal});
 c.abort();assert.throws(()=>k.assertAlive());await k.close();
 await assert.rejects(openSnapshotKeeper({...settings,signal:c.signal,clientFactory:()=>fakeClient()}));
});
