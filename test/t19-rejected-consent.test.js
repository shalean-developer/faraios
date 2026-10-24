import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {readFile,mkdtemp,writeFile,stat,rm,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,resolve,isAbsolute} from 'node:path';
import {fileURLToPath} from 'node:url';
import {importClient,cleanupImportedClient,attestCleanup,cleanupRejectedConsent,validateRejectedConsentApproval,probeDigest} from '../scripts/t19-connection.mjs';
import {createConnectionService} from '../src/t19-connection.js';
import {openVault} from '../src/t19-vault.js';

const root=fileURLToPath(new URL('..',import.meta.url));
const hash=raw=>createHash('sha256').update(raw).digest('hex');
async function fixture(){
 const template=JSON.parse(await readFile(join(root,'config/t19-shalean-review.json'),'utf8'));
 const current=Date.now();
 const m={...template,approved:true,custodyVerification:{secretSourceVerified:true},clientVerification:{clientType:'Server-based',clientOwner:'dummy-owner'},approvalReference:'original-dummy-approval',operator:'dummy',custodian:'dummy',reviewer:'dummy',identityEvidence:'dummy-identity',cleanupReference:'dummy-cleanup',probeSha:'a'.repeat(64),startsAt:current-7200000,endsAt:current-3600000};
 let db=importClient({connections:{},clients:{unrelated:{clientSecret:'UNRELATED-DUMMY'}}},m,{clientSecret:'REJECTED-CONSENT-DUMMY'});let providerCalls=0;
 const vault={read:async()=>structuredClone(db),write:async value=>{db=structuredClone(value);}};
 const sessions={read:async()=>({userId:'dummy-owner',businessIds:[m.businessId],memberships:[{businessId:m.businessId,role:'owner',status:'active'}]})};
 const {service}=createConnectionService({vault,sessions,manifest:m,execution:true,now:()=>m.startsAt+1000,fetchImpl:async()=>{providerCalls++;throw Error('No provider call permitted');}});
 const start=await service.authorise('owner');
 await assert.rejects(service.callback('owner',new URL(start.authorizationUrl).searchParams.get('state'),''),e=>e.code==='oauth_state');
 await service.disable('owner');
 const raw=Buffer.from(JSON.stringify(m)),c=db.connections[m.businessId];
 const e={action:'cleanup_rejected_consent',approved:true,approvalReference:'separate-dummy-cleanup-approval',originalManifestSha256:hash(raw),recoveryProbeSha:await probeDigest(),clientId:m.clientId,businessId:m.businessId,organizationId:m.organizationId,connectionId:c.id,generation:2,identity:m.identity,custodian:m.custodian,consentRejected:true,noGrantIssued:true,reference:'dummy-observed-rejection-before-exchange'};
 return {m,raw,e,db,service,vault,get providerCalls(){return providerCalls;}};
}

test('rejected-before-exchange gap: separately approved cleanup removes client but retains disabled audited tombstone',async()=>{
 const h=await fixture();assert.equal(h.providerCalls,0);
 assert.throws(()=>cleanupImportedClient(h.db,h.m,{clientId:h.m.clientId,businessId:h.m.businessId,organizationId:h.m.organizationId,custodian:h.m.custodian,noGrantInitiated:true,reference:'dummy'}));
 assert.throws(()=>attestCleanup(h.db,h.m,{connectionId:h.e.connectionId,generation:2,identity:h.m.identity,custodian:h.m.custodian,providerRevocationConfirmed:true,reference:'not-a-real-revocation'}));
 const rawEvidence=Buffer.from(JSON.stringify(h.e));
 assert.equal(validateRejectedConsentApproval(h.raw,rawEvidence,hash(rawEvidence),h.e.recoveryProbeSha).manifest.endsAt,h.m.endsAt); // Expired original is accepted only for cleanup.
 const original=structuredClone(h.db),cleaned=cleanupRejectedConsent(h.db,h.m,h.e),c=cleaned.connections[h.m.businessId];
 assert.deepEqual(h.db,original);assert.equal(cleaned.clients[h.m.clientId],undefined);assert.deepEqual(cleaned.clients.unrelated,original.clients.unrelated);
 assert.equal(c.status,'disabled');assert.equal(c.generation,3);assert.equal(c.id,h.e.connectionId);assert.deepEqual(c.binding,original.connections[h.m.businessId].binding);assert.deepEqual(c.events.slice(0,2),original.connections[h.m.businessId].events);
 assert.equal(c.recovery.providerRevocationClaimed,false);assert.equal(c.recovery.noGrantIssuedAttested,true);assert.equal(c.events.at(-1).event,'rejected_consent_client_removed_locally');assert.doesNotMatch(JSON.stringify(c),/REJECTED-CONSENT-DUMMY|clientSecret/);
 assert.throws(()=>cleanupRejectedConsent(cleaned,h.m,h.e));
 await h.vault.write(cleaned);await assert.rejects(h.service.authorise('owner'),e=>e.code==='already_attempted');await assert.rejects(h.service.verify('owner'),e=>e.code==='credentials');assert.equal(h.providerCalls,0);
});

test('cleanup refuses exchange, unknown outcomes, verified state, altered bindings/history and shared client references without mutation',async()=>{
 const h=await fixture();
 const mutations=[
  c=>{c.status='authorising';},c=>{c.generation=1;},c=>{c.id='foreign';},c=>{c.clientId='foreign';},c=>{c.approvalDigest='foreign';},c=>{c.approvalReference='foreign';},
  c=>{c.binding.organizationId='222';},c=>{c.binding.businessId='foreign';},c=>{c.binding.identity='foreign';},c=>{c.binding.zohoUserId='999';},c=>{c.binding.currency='USD';},c=>{c.binding.environment='production';},c=>{c.binding.apiDomain='https://example.invalid';},
  ...['credentials','cleanup','evidence','provenance','verificationAttempted','recovery'].map(k=>c=>{c[k]={unknownOutcome:true};}),
  c=>{c.events.push({event:'exchange_dispatched',time:1,generation:1});},c=>{c.events[0].event='exchange_failed_cleanup_review';},c=>{c.events[1].generation=1;},c=>{c.events[0].time=c.events[1].time+1;},c=>{c.events=[];},c=>{delete c.events;},c=>{c.unknownToken='DUMMY';}
 ];
 for(const mutate of mutations){const db=structuredClone(h.db);mutate(db.connections[h.m.businessId]);const before=structuredClone(db);assert.throws(()=>cleanupRejectedConsent(db,h.m,h.e));assert.deepEqual(db,before);}
 for(const patch of [{generation:1},{connectionId:'00000000-0000-4000-8000-000000000999'},{custodian:'foreign'},{clientId:'foreign'},{businessId:'foreign'},{organizationId:'999'},{identity:'foreign'},{approved:false},{approvalReference:h.m.approvalReference},{noGrantIssued:false},{consentRejected:false},{reference:''},{unexpected:true}])assert.throws(()=>cleanupRejectedConsent(h.db,h.m,{...h.e,...patch}));
 const shared=structuredClone(h.db);shared.connections.foreign={clientId:h.m.clientId};assert.throws(()=>cleanupRejectedConsent(shared,h.m,h.e));
 for(const patch of [{approvalDigest:'wrong'},{organizationId:'999'},{businessId:'foreign'},{refreshToken:'DUMMY_POSSIBLE_GRANT'},{accessToken:'DUMMY_POSSIBLE_ACCESS'},{unknownCredential:'DUMMY_UNKNOWN'},{clientSecret:''},{clientSecret:null},{clientSecret:'dummy\nvalue'}]){const db=structuredClone(h.db);Object.assign(db.clients[h.m.clientId],patch);assert.throws(()=>cleanupRejectedConsent(db,h.m,h.e));}
 const missing=structuredClone(h.db);delete missing.clients[h.m.clientId].clientSecret;assert.throws(()=>cleanupRejectedConsent(missing,h.m,h.e));
});

test('separate recovery approval pins old bytes and current code; invalid/mixed CLI modes reject before opening storage',async t=>{
 const h=await fixture(),dir=await mkdtemp(join(tmpdir(),'t19-rejected-gate-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const mpath=join(dir,'original.json'),epath=join(dir,'recovery.json'),store=join(dir,'never-opened');await writeFile(mpath,h.raw);
 const gate=(mraw,e,approved=hash(Buffer.from(JSON.stringify(e))),digest=h.e.recoveryProbeSha)=>validateRejectedConsentApproval(mraw,Buffer.from(JSON.stringify(e)),approved,digest);
 assert.throws(()=>gate(Buffer.concat([h.raw,Buffer.from('\n')]),h.e));assert.throws(()=>gate(h.raw,h.e,'0'.repeat(64)));assert.throws(()=>gate(h.raw,h.e,hash(Buffer.from(JSON.stringify(h.e))),'b'.repeat(64)));
 for(const patch of [{originalManifestSha256:'0'.repeat(64)},{recoveryProbeSha:'b'.repeat(64)},{approved:false},{approvalReference:h.m.approvalReference},{noGrantIssued:false}])assert.throws(()=>gate(h.raw,{...h.e,...patch}));
 assert.throws(()=>gate(Buffer.from(JSON.stringify({...h.m,approved:false})),h.e));
 await writeFile(epath,JSON.stringify(h.e));
 const args=['scripts/t19-connection.mjs','--manifest='+mpath,'--cleanup-rejected-consent-evidence='+epath,'--recovery-approved='+hash(Buffer.from(JSON.stringify(h.e)))];
 for(const extra of ['--execute-approved='+hash(h.raw),'--import-client='+h.m.clientId,'--check-import='+h.m.clientId,'--cleanup-evidence=unused','--cleanup-import-evidence=unused']){
  const result=spawnSync(process.execPath,[...args,extra],{cwd:root,env:{...process.env,LOCALAPPDATA:store},encoding:'utf8',windowsHide:true});assert.equal(result.status,1);assert.equal(result.stdout,'');assert.doesNotMatch(result.stderr,/DUMMY|clientSecret/);
 }
 for(const variant of [args.filter(a=>!a.startsWith('--recovery-approved=')),args.filter(a=>!a.startsWith('--cleanup-rejected-consent-evidence=')),args.map(a=>a.startsWith('--recovery-approved=')?'--recovery-approved=invalid':a)])assert.equal(spawnSync(process.execPath,variant,{cwd:root,env:{...process.env,LOCALAPPDATA:store},encoding:'utf8',windowsHide:true}).status,1);
 await assert.rejects(stat(store),e=>e.code==='ENOENT');
});

test('Windows real dummy DPAPI restart and CLI recovery use old manifest with new code without provider or secret output',{skip:process.platform!=='win32',timeout:120000},async t=>{
 const h=await fixture(),parent=join(process.env.LOCALAPPDATA,'FaraiOS','T19-rejected-consent-tests');await mkdir(parent,{recursive:true});const isolated=await mkdtemp(join(parent,'dummy-')),directory=join(isolated,'FaraiOS','T19','credentials');let vault;
 t.after(async()=>{await vault?.close();const rel=relative(resolve(parent),resolve(isolated));if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Unsafe test cleanup');await rm(isolated,{recursive:true,force:true});});
 vault=await openVault({directory,repositoryRoot:root});await vault.write(h.db);await vault.close();vault=null;
 const mf=join(isolated,'original.json'),ef=join(isolated,'recovery.json');await writeFile(mf,h.raw);const ebytes=Buffer.from(JSON.stringify(h.e));await writeFile(ef,ebytes);
 const result=spawnSync(process.execPath,['scripts/t19-connection.mjs','--manifest='+mf,'--cleanup-rejected-consent-evidence='+ef,'--recovery-approved='+hash(ebytes)],{cwd:root,env:{...process.env,LOCALAPPDATA:isolated},encoding:'utf8',windowsHide:true,timeout:60000});
 assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.equal(result.stdout.trim(),'Rejected TEST consent cleaned locally; connection remains disabled; no provider request or revocation performed.');
 vault=await openVault({directory,repositoryRoot:root});const stored=await vault.read();assert.equal(stored.clients[h.m.clientId],undefined);assert.equal(stored.clients.unrelated.clientSecret,'UNRELATED-DUMMY');assert.equal(stored.connections[h.m.businessId].generation,3);assert.equal(stored.connections[h.m.businessId].status,'disabled');assert.equal(stored.connections[h.m.businessId].recovery.providerRevocationClaimed,false);
 const encrypted=await readFile(join(directory,'vault.dpapi'));assert.equal(encrypted.includes(Buffer.from('REJECTED-CONSENT-DUMMY')),false);assert.equal(h.providerCalls,0);
});
