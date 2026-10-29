import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {generateKeyPairSync,sign} from 'node:crypto';
import {EventEmitter} from 'node:events';
import {canonical,PHASES} from '../scripts/t19-bootstrap-engine.mjs';
import {OPERATIONAL_SCOPE,validateOperationalApproval,operationalStages,runOperationalRehearsal} from '../scripts/t19-operational-rehearsal.mjs';
import {operationalProcess} from '../scripts/t19-operational-transport.mjs';
import {OperationalHost,operationalBundleDigest,operationalCaptureSQL} from '../scripts/t19-operational-rehearsal-host.mjs';
const {privateKey,publicKey}=generateKeyPairSync('ed25519');
const key=publicKey.export({type:'spki',format:'pem'});
const bindings={bundleSha256:'a'.repeat(64),journalPath:'/root/synthetic'};
const receipt={scope:OPERATIONAL_SCOPE,version:1,nonce:'a'.repeat(32),issuedAt:100,expiresAt:900100,...bindings};
const approval=r=>({receipt:r,ownerSignature:sign(null,Buffer.from(canonical(r)),privateKey).toString('base64')});
test('operational approval requires its separate scope, exact bindings, lifetime and signature',()=>{
 assert.deepEqual(validateOperationalApproval(approval(receipt),bindings,key,101),receipt);
 for(const patch of [{scope:'t19-synthetic-managed-bootstrap-v1'},{version:2},{journalPath:'/root/other'},{expiresAt:900101},{issuedAt:102},{extra:true},{nonce:'../bad'}])
  assert.throws(()=>validateOperationalApproval(approval({...receipt,...patch}),bindings,key,101));
 assert.throws(()=>validateOperationalApproval(approval(receipt),bindings,key,900100));
 const tampered=approval(receipt);tampered.ownerSignature='A'.repeat(86)+'==';
 assert.throws(()=>validateOperationalApproval(tampered,bindings,key,101));
});
test('operational stages preserve exact reviewed bytes and inject only the forced abort',async()=>{
 const manifest=JSON.parse(await readFile(new URL('../test-support/t19-operational-sql-pins.json',import.meta.url)));
 const contents=new Map(await Promise.all(manifest.files.map(async f=>[f.path,await readFile(new URL('../'+f.path,import.meta.url),'utf8')])));
 const plan=operationalStages(manifest,contents);assert.deepEqual(plan.map(s=>s.stage),['runtime','oauth','api']);
 for(const s of plan){assert.equal((s.abortSQL.match(/T19_SYNTHETIC_PRECOMMIT_ABORT/g)||[]).length,1);assert.match(s.abortSQL,/DO \$\$BEGIN RAISE/);assert.equal(s.sql,contents.get('database/t19-custody-'+s.stage+'.sql'));}
 contents.set(manifest.files[0].path,'SELECT 1;');assert.throws(()=>operationalStages(manifest,contents),/SQL_SOURCE_PIN/);
 assert.match(await operationalBundleDigest(),/^[a-f0-9]{64}$/);
 const capture=await operationalCaptureSQL();assert.ok(capture.indexOf('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY;')<capture.indexOf('OPERATIONAL_CAPTURE_CONNECTION_REFUSED'));assert.match(capture,/transaction_read_only/);assert.match(capture,/pg_stat_ssl/);
});
function platform(failure=null,clean=true){
 const calls=[],p={calls,preflight:async()=>calls.push('preflight'),record:async(k,v)=>calls.push([k,v]),cleanup:async()=>{calls.push('cleanup');return clean;}};
 for(const name of [...PHASES,'stopServices','syntheticFoundation','operationalSQL','operationalBoundaries'])p[name]=async()=>{calls.push(name);if(name===failure)throw Error('SYNTHETIC_FAILURE');};return p;
}
test('whole rehearsal orders compatibility before operational SQL and always checks cleanup',async()=>{
 const p=platform();const r=await runOperationalRehearsal(p);
 assert.equal(r.status,'SYNTHETIC_OPERATIONAL_SQL_PASS');assert.equal(r.checkpointUsed,false);assert.equal(r.hostedOperationalCustodyInstalled,false);assert.equal(r.authenticatedCustodyLoginVerified,false);
 assert.ok(p.calls.indexOf('stableCatalog')<p.calls.indexOf('operationalSQL'));
 for(const failed of ['managedCatalog','operationalSQL']){const p=platform(failed);const r=await runOperationalRehearsal(p);assert.equal(r.status,'FAIL');assert.ok(p.calls.includes('cleanup'));assert.ok(!p.calls.includes('operationalBoundaries'));}
 assert.equal((await runOperationalRehearsal(platform('operationalSQL',false))).status,'QUARANTINE');
});
function child(){const c=new EventEmitter();c.stdout=new EventEmitter();c.stderr=new EventEmitter();c.stdin=new EventEmitter();c.stdin.end=()=>{};c.kill=()=>{queueMicrotask(()=>c.emit('close',null,'SIGKILL'));return true;};return c;}
test('transport retains EPIPE nonzero SQL exit, but fences zero exit and timeout',async()=>{
 for(const code of [3,0]){
  const c=child(),run=operationalProcess('/fixed/docker',{spawnProcess:()=>{queueMicrotask(()=>{c.stdin.emit('error',{code:'EPIPE'});c.stderr.emit('data',Buffer.from('ERROR:  55000: fixed'));c.emit('close',code,null);});return c;}});
  if(code===3){const r=await run(['container','exec'],{stdin:'synthetic'});assert.equal(r.code,3);assert.equal(r.inputClosed,true);}
  else await assert.rejects(run(['container','exec']),e=>e.unknown===true);
 }
 const c=child(),run=operationalProcess('/fixed/docker',{spawnProcess:()=>c});await assert.rejects(run(['container','exec'],{timeoutMs:5}),e=>e.unknown===true);
});
test('SQL adapter accepts only the expected SQLSTATE and fences uncertain outcomes',async()=>{
 const host=new OperationalHost({run:async()=>({code:3,signal:null,stdout:Buffer.alloc(0),stderr:Buffer.from('ERROR:  55000: T19_SYNTHETIC_PRECOMMIT_ABORT\n')}),dir:'/unused',receipt:{nonce:'a'.repeat(32)}});
 host.bound.set('postgres',{id:'a'.repeat(64)});host.assertBound=async()=>{};const records=[];host.record=async(k,v)=>records.push([k,v]);
 await host.checkedSQL('fixed',{expectedState:'55000',abort:true});assert.equal(host.unknown,false);
 await assert.rejects(host.checkedSQL('fixed',{expectedState:'42501'}),/OPERATIONAL_EXPECTED_DENIAL_FAILED/);
 host.run=async()=>({code:0,signal:null,inputClosed:true,stdout:Buffer.alloc(0),stderr:Buffer.alloc(0)});
 await assert.rejects(host.checkedSQL('fixed'),/OPERATIONAL_COMMAND_OUTCOME_UNKNOWN/);assert.equal(host.unknown,true);
 await assert.rejects(host.checkedSQL('fixed'),/COMMANDS_FENCED/);
 assert.ok(records.every(([,r])=>!Object.hasOwn(r,'stderr')));
});
