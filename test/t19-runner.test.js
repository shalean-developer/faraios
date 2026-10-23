import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {importClient,attestCleanup,probeDigest} from '../scripts/t19-connection.mjs';
import {mkdtemp,readFile,writeFile,rm,stat} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
const manifest={businessId:'business-a',organizationId:'111',identity:'test@example.invalid',clientId:'client-a',custodian:'operator'};
const state=()=>({connections:{'business-a':{id:'connection-a',generation:2,binding:{businessId:'business-a',organizationId:'111',identity:'test@example.invalid'},clientId:'client-a',status:'disabled',cleanup:{refreshToken:'synthetic-only'},events:[]}},clients:{'client-a':{clientSecret:'synthetic-only'}}});
const evidence={connectionId:'connection-a',generation:2,identity:manifest.identity,custodian:'operator',providerRevocationConfirmed:true,reference:'synthetic-revocation-evidence'};
test('client import pins business/org and rejects replacing another business client',()=>{
 const value=importClient({connections:{}},manifest,{clientSecret:'synthetic-only'});assert.equal(value.clients['client-a'].businessId,manifest.businessId);assert.equal(value.clients['client-a'].organizationId,'111');assert.throws(()=>importClient(value,{...manifest,businessId:'business-b'},{clientSecret:'another-synthetic'}));
 assert.throws(()=>importClient({connections:{}},manifest,{clientSecret:'synthetic',refreshToken:'extra'}));
});
test('cleanup is exact connection/generation/client/identity attestation, never implicit revocation',()=>{
 for(const patch of [{generation:1},{identity:'wrong'},{custodian:'wrong'},{connectionId:'wrong'},{providerRevocationConfirmed:false}])assert.throws(()=>attestCleanup(state(),manifest,{...evidence,...patch}));
 for(const patch of [{organizationId:'222'},{clientId:'other'},{identity:'other'}])assert.throws(()=>attestCleanup(state(),{...manifest,...patch},evidence));
 const current=state();current.connections['business-a'].status='authenticated';assert.throws(()=>attestCleanup(current,manifest,evidence));
 const cleaned=attestCleanup(state(),manifest,evidence);assert.equal(cleaned.connections['business-a'].cleanup,undefined);assert.equal(cleaned.clients['client-a'],undefined);assert.equal(cleaned.connections['business-a'].events[0].event,'custodian_attested_provider_revocation');
});
test('cleanup does not delete a client still referenced by another connection',()=>{
 const value=state();value.connections['business-b']={id:'other',clientId:'client-a'};assert.ok(attestCleanup(value,manifest,evidence).clients['client-a']);
});
test('invalid execution hash rejects before any vault or provider setup',()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));const result=spawnSync(process.execPath,['scripts/t19-connection.mjs','--manifest=config/t19-shalean-review.json','--execute-approved=invalid'],{cwd:root,encoding:'utf8',windowsHide:true});assert.equal(result.status,1);assert.match(result.stderr,/startup\/action rejected/);assert.equal(result.stdout,'');
});
test('check-import validates approved manifest without storage and rejects mixed modes, wrong client and expired approval',async t=>{
 const root=fileURLToPath(new URL('..',import.meta.url));const dir=await mkdtemp(join(tmpdir(),'t19-preflight-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const template=JSON.parse(await readFile(join(root,'config/t19-shalean-review.json'),'utf8'));
 const now=Date.now(),m={...template,approved:true,operator:'dummy',custodian:'dummy',reviewer:'dummy',approvalReference:'dummy',identityEvidence:'dummy',cleanupReference:'dummy',probeSha:await probeDigest(),startsAt:now-1000,endsAt:now+60000};
 const file=join(dir,'manifest.json'),storage=join(dir,'unopened-store');
 const call=async(value,extra=[])=>{const raw=JSON.stringify(value);await writeFile(file,raw);return spawnSync(process.execPath,['scripts/t19-connection.mjs','--manifest='+file,'--execute-approved='+createHash('sha256').update(raw).digest('hex'),'--check-import='+m.clientId,...extra],{cwd:root,env:{...process.env,LOCALAPPDATA:storage},encoding:'utf8',windowsHide:true});};
 const good=await call(m);assert.equal(good.status,0,good.stderr);assert.equal(good.stdout.trim(),'TEST import gate validated; no storage or provider access performed.');
 for(const extra of [['--import-client='+m.clientId],['--cleanup-evidence=unused']])assert.equal((await call(m,extra)).status,1);
 assert.equal((await call({...m,clientId:'different-client'})).status,1);
 assert.equal((await call({...m,endsAt:now-1})).status,1);
 assert.equal((await call({...m,approved:false})).status,1);
 assert.equal((await call({...m,probeSha:'wrong'})).status,1);
 await assert.rejects(stat(storage),e=>e.code==='ENOENT');
});
