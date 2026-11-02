import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,stat,rm,mkdir} from 'node:fs/promises';
import {join,relative,resolve,isAbsolute} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {importClient,cleanupRejectedConsent,attestCleanup,probeDigest,main} from '../scripts/t19-connection.mjs';
import {createConnectionService} from '../src/t19-connection.js';
import {validateSuccessorPreparation,prepareSuccessor,validateSuccessorCleanup,cleanupSuccessor,recordDigest} from '../src/t19-successor.js';
import {openVault} from '../src/t19-vault.js';

const root=fileURLToPath(new URL('..',import.meta.url)),hash=v=>createHash('sha256').update(v).digest('hex');
const nextId='00000000-0000-4000-8000-000000000123';
const bytes=v=>Buffer.from(JSON.stringify(v));
const failure=()=>{throw Error('No real provider transport is permitted');};
function sessions(){return {read:async sid=>sid==='owner'?{userId:'dummy-owner',businessIds:[mBusiness],memberships:[{businessId:mBusiness,role:'owner',status:'active'}]}:null};}
const mBusiness='612be091-b1d7-4911-9c3b-143446a9fe27';
async function fixture(){
 const template=JSON.parse(await readFile(join(root,'config/t19-shalean-review.json'),'utf8')),now=Date.now();
 const old={...template,approved:true,custodyVerification:{secretSourceVerified:true},clientVerification:{clientType:'Server-based',clientOwner:'dummy-owner'},approvalReference:'old-dummy-run',operator:'dummy',custodian:'dummy',reviewer:'dummy',identityEvidence:'dummy-identity',cleanupReference:'dummy-cleanup',probeSha:'a'.repeat(64),startsAt:now-7200000,endsAt:now-3600000};
 let db=importClient({connections:{},clients:{unrelated:{clientSecret:'UNRELATED-DUMMY'}}},old,{clientSecret:'FIRST-DUMMY-SECRET'});
 const vault={read:async()=>structuredClone(db),write:async x=>{db=structuredClone(x);}};
 let clock=old.startsAt+1000;
 const oldService=createConnectionService({vault,sessions:sessions(),manifest:old,execution:true,now:()=>clock,fetchImpl:failure}).service;
 await oldService.authorise('owner');await oldService.disable('owner');
 const originalRaw=bytes(old),r={action:'cleanup_rejected_consent',approved:true,approvalReference:'old-dummy-recovery',originalManifestSha256:hash(originalRaw),recoveryProbeSha:'b'.repeat(64),clientId:old.clientId,businessId:old.businessId,organizationId:old.organizationId,connectionId:db.connections[old.businessId].id,generation:2,identity:old.identity,custodian:old.custodian,consentRejected:true,noGrantIssued:true,reference:'dummy-rejected-before-exchange'};
 db=cleanupRejectedConsent(db,old,r);
 const predecessor=structuredClone(db.connections[old.businessId]);
 clock=Math.max(now,predecessor.events.at(-1).time);
 const m={...old,approvalReference:'successor-dummy-run',probeSha:await probeDigest(),startsAt:clock-1000,endsAt:clock+3500000,successor:{predecessorId:predecessor.id,predecessorGeneration:3,predecessorRecordSha256:recordDigest(predecessor),connectionId:nextId,generation:4,preparationApprovalReference:'successor-dummy-preparation'}};
 const recoveryRaw=bytes(r),manifestRaw=bytes(m),e={action:'prepare_successor',approved:true,approvalReference:m.successor.preparationApprovalReference,reference:'dummy single successor',originalManifestSha256:hash(originalRaw),predecessorRecoverySha256:hash(recoveryRaw),successorManifestSha256:hash(manifestRaw),currentProbeSha:m.probeSha,businessId:m.businessId,organizationId:m.organizationId,clientId:m.clientId,identity:m.identity,custodian:m.custodian,predecessorConnectionId:predecessor.id,predecessorGeneration:3,predecessorRecordSha256:recordDigest(predecessor),successorConnectionId:nextId,preparedGeneration:4};
 const evidenceRaw=bytes(e),pkg=validateSuccessorPreparation(originalRaw,recoveryRaw,manifestRaw,evidenceRaw,hash(evidenceRaw),m.probeSha,{now:clock});
 const prep=()=>{db=prepareSuccessor(db,pkg,{now:clock});};
 const svc=(options={})=>createConnectionService({vault,sessions:sessions(),manifest:m,execution:true,now:()=>clock,fetchImpl:failure,...options}).service;
 const cleanupEvidence=(noGrantIssued=true)=>({action:'cleanup_successor',approved:true,approvalReference:'separate-dummy-cleanup',reference:'dummy attended targeted outcome',manifestSha256:hash(manifestRaw),currentProbeSha:m.probeSha,businessId:m.businessId,organizationId:m.organizationId,clientId:m.clientId,identity:m.identity,custodian:m.custodian,connectionId:nextId,generation:db.connections[m.businessId].generation,noGrantIssued,providerRevocationConfirmed:!noGrantIssued,consentRevokedBeforeExchange:false});
 return {old,r,m,e,pkg,originalRaw,recoveryRaw,manifestRaw,evidenceRaw,predecessor,vault,prep,svc,cleanupEvidence,get db(){return structuredClone(db);},set db(x){db=structuredClone(x);},get clock(){return clock;},set clock(x){clock=x;},import(){db=importClient(db,m,{clientSecret:'SUCCESSOR-DUMMY-SECRET'});}};
}
function jsonResponse(body){return new Response(JSON.stringify(body),{status:200,headers:{'Content-Type':'application/json'}});}
const exchangeResponse=()=>jsonResponse({access_token:'DUMMY-ACCESS',refresh_token:'DUMMY-REFRESH',api_domain:'https://www.zohoapis.com',expires_in:3600,token_type:'Bearer'});

test('expiry during post-exchange membership or vault read retains the late grant only for cleanup',async()=>{
 for(const pauseAt of ['membership','read']){
  const h=await fixture();h.prep();h.import();let returned=false,calls=0;const trusted=sessions();
  const read=h.vault.read;
  if(pauseAt==='read')h.vault.read=async()=>{const db=await read();if(returned)h.clock=h.m.endsAt;return db;};
  const svc=h.svc({sessions:{read:async sid=>{const user=await trusted.read(sid);if(returned&&pauseAt==='membership')h.clock=h.m.endsAt;return user;}},fetchImpl:async()=>{calls++;returned=true;return exchangeResponse();}});
  const {state}=await consent(h,svc);await assert.rejects(svc.callback('owner',state,'DUMMY-CODE'),e=>e.code==='stale');
  const c=h.db.connections[h.m.businessId];assert.equal(calls,1);assert.equal(c.status,'disabled');assert.equal(c.credentials,undefined);
  assert.equal(c.cleanup.refreshToken,'DUMMY-REFRESH');
  assert.doesNotThrow(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock}));
 }
});

test('successor expiry during pre-dispatch persistence prevents egress and preserves conservative cleanup',async()=>{
 const h=await fixture();h.prep();h.import();let calls=0;
 const svc=h.svc({fetchImpl:async()=>{calls++;return exchangeResponse();}}),{state}=await consent(h,svc);
 const write=h.vault.write;h.vault.write=async db=>{await write(db);h.clock=h.m.endsAt;};
 await assert.rejects(svc.callback('owner',state,'DUMMY-CODE'),e=>e.code==='approval_required');
 assert.equal(calls,0);assert.equal(h.db.connections[h.m.businessId].status,'disabled');
 assert.equal(h.db.connections[h.m.businessId].cleanup.unknownOutcome,true);
 assert.throws(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(true),{now:h.clock}));
 const clean=cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock});
 assert.deepEqual(clean.connectionHistory[h.predecessor.id].record,h.predecessor);
 assert.equal(clean.clients[h.m.clientId],undefined);
 assert.doesNotMatch(JSON.stringify(clean),/SUCCESSOR-DUMMY-SECRET|DUMMY-REFRESH|DUMMY-ACCESS/);
 await assert.rejects(svc.callback('owner',state,'DUMMY-CODE'));assert.equal(calls,0);
});
async function consent(h,service=h.svc()){
 const result=await service.authorise('owner');return {service,state:new URL(result.authorizationUrl).searchParams.get('state')};
}

test('separately approved successor archives exact recovered record atomically; restart consumes pending authority once',async()=>{
 const h=await fixture(),before=h.db;h.prep();const prepared=h.db;
 assert.deepEqual(prepared.connectionHistory[h.predecessor.id].record,h.predecessor);
 assert.deepEqual(before.connections[h.m.businessId],h.predecessor);
 assert.equal(prepared.connections[h.m.businessId].id,nextId);assert.equal(prepared.connections[h.m.businessId].generation,4);assert.equal(prepared.connections[h.m.businessId].status,'successor_pending');assert.deepEqual(prepared.clients,before.clients);
 assert.throws(()=>prepareSuccessor(prepared,h.pkg,{now:h.clock}));
 h.import();const svc=h.svc(),results=await Promise.allSettled([svc.authorise('owner'),svc.authorise('owner')]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(h.db.connections[h.m.businessId].generation,5);
 await assert.rejects(h.svc().authorise('owner'));assert.deepEqual(h.db.connectionHistory,prepared.connectionHistory);
 await assert.rejects(createConnectionService({vault:h.vault,sessions:sessions(),manifest:h.old,execution:true,now:()=>h.old.startsAt+1000,fetchImpl:failure}).service.status('owner'),e=>e.code==='binding');
});

test('preparation refuses mutated predecessor, prior history, client material, shared references or reused authority without mutation',async()=>{
 const h=await fixture();
 const changes=[db=>{db.connections[h.m.businessId].generation=2;},db=>{db.connections[h.m.businessId].status='authenticated';},db=>{db.connections[h.m.businessId].binding.organizationId='999';},db=>{db.connections[h.m.businessId].events[0].event='exchange_dispatched';},db=>{db.connections[h.m.businessId].recovery.noGrantIssuedAttested=false;},db=>{db.connections[h.m.businessId].recovery.approvalReference='altered';},...['credentials','cleanup','evidence','provenance','verificationAttempted','extra'].map(k=>db=>{db.connections[h.m.businessId][k]='DUMMY';}),db=>{db.clients[h.m.clientId]={clientSecret:'DUMMY'};},db=>{db.connections.other={id:'other',clientId:h.m.clientId};},db=>{db.connections.other={id:nextId,clientId:'other'};},db=>{db.connectionHistory={[h.predecessor.id]:{record:h.predecessor}};},db=>{db.connectionHistory={other:{record:{clientId:h.m.clientId}}};}];
 for(const mutate of changes){const db=h.db;mutate(db);const before=structuredClone(db);assert.throws(()=>prepareSuccessor(db,h.pkg,{now:h.clock}));assert.deepEqual(db,before);}
 assert.throws(()=>prepareSuccessor(h.db,h.pkg,{now:h.m.endsAt}));
});

test('independent byte gates pin original, old recovery, new manifest, approval and current runtime before store access',async()=>{
 const h=await fixture();const check=(a=h.originalRaw,b=h.recoveryRaw,c=h.manifestRaw,d=h.evidenceRaw,approved=hash(d),probe=h.m.probeSha)=>validateSuccessorPreparation(a,b,c,d,approved,probe,{now:h.clock});
 for(const index of [0,1,2,3]){const args=[h.originalRaw,h.recoveryRaw,h.manifestRaw,h.evidenceRaw,hash(h.evidenceRaw),h.m.probeSha];args[index]=Buffer.concat([args[index],Buffer.from('\n')]);assert.throws(()=>check(...args));}
 assert.throws(()=>check(undefined,undefined,undefined,undefined,'0'.repeat(64)));assert.throws(()=>check(undefined,undefined,undefined,undefined,undefined,'c'.repeat(64)));
 for(const patch of [{approved:false},{action:'retry'},{approvalReference:h.old.approvalReference},{predecessorGeneration:2},{successorConnectionId:h.predecessor.id},{predecessorRecoverySha256:'0'.repeat(64)},{extra:true}])assert.throws(()=>check(undefined,undefined,undefined,bytes({...h.e,...patch})));
 for(const patch of [{noGrantIssued:false},{consentRejected:false},{generation:1},{approved:false},{extra:'DUMMY'}]){const raw=bytes({...h.r,...patch}),e=bytes({...h.e,predecessorRecoverySha256:hash(raw)});assert.throws(()=>check(h.originalRaw,raw,h.manifestRaw,e));}
});

test('successor-bound import/status reject missing, changed, consumed or archived context; ordinary existing-record hold remains',async()=>{
 const h=await fixture();assert.throws(()=>h.import());h.prep();
 const prepared=h.db;
 for(const change of [m=>{m.identity='other';},m=>{m.fixture.reference='other';},m=>{m.endsAt++;},m=>{m.successor.connectionId='00000000-0000-4000-8000-000000000456';},m=>{m.approvalReference='other';}]){const m=structuredClone(h.m);change(m);assert.throws(()=>importClient(prepared,m,{clientSecret:'DUMMY'}));await assert.rejects(createConnectionService({vault:h.vault,sessions:sessions(),manifest:m,execution:true,now:()=>h.clock,fetchImpl:failure}).service.status('owner'));}
 const altered=h.db;altered.connectionHistory[h.predecessor.id].record.events[0].time++;h.db=altered;assert.throws(()=>h.import());h.db=prepared;h.import();await consent(h);assert.throws(()=>h.import());
 const original=await fixture();await assert.rejects(createConnectionService({vault:original.vault,sessions:sessions(),manifest:original.old,execution:true,now:()=>original.old.startsAt+1000,fetchImpl:failure}).service.authorise('owner'),e=>e.code==='already_attempted');
});

test('cancelled pending or rejected consent cleans locally under separate approval after expiry; no provider claim or replay',async()=>{
 for(const mode of ['before-import','after-import','rejected']){
  const h=await fixture();h.prep();if(mode!=='before-import')h.import();const svc=h.svc();if(mode==='rejected')await consent(h,svc);
  h.clock=h.m.endsAt+1;await svc.disable('owner');await assert.rejects(svc.authorise('owner'),e=>e.code==='approval_required');
  const history=h.db.connectionHistory,e=h.cleanupEvidence(),raw=bytes(e);
  assert.equal(validateSuccessorCleanup(h.manifestRaw,raw,hash(raw),h.m.probeSha).evidence.noGrantIssued,true);
  const clean=cleanupSuccessor(h.db,h.m,e,{now:h.clock});assert.equal(clean.clients[h.m.clientId],undefined);assert.equal(clean.connections[h.m.businessId].status,'disabled');assert.equal(clean.connections[h.m.businessId].successorCleanup.providerRevocationVerifiedBySoftware,false);assert.equal(clean.connections[h.m.businessId].successorCleanup.providerRevocationCustodianAttested,false);assert.deepEqual(clean.connectionHistory,history);assert.equal(clean.clients.unrelated.clientSecret,'UNRELATED-DUMMY');assert.throws(()=>cleanupSuccessor(clean,h.m,e,{now:h.clock}));h.db=clean;await assert.rejects(h.svc().authorise('owner'));assert.throws(()=>prepareSuccessor(clean,h.pkg,{now:h.m.startsAt+1000}));
 }
});

test('successor two-read verification reuses pinned verifier then requires targeted revocation attestation before local cleanup',async()=>{
 const h=await fixture();h.prep();h.import();const calls=[];
 const svc=h.svc({fetchImpl:async(url,options)=>{calls.push([url,options.method]);if(calls.length===1)return exchangeResponse();if(calls.length===2)return jsonResponse({code:0,organization:{organization_id:h.m.organizationId,is_org_active:true,currency_code:h.m.currency}});return jsonResponse({code:0,invoice:{invoice_id:h.m.fixture.invoiceId,invoice_number:h.m.fixture.number,reference_number:h.m.fixture.reference,customer_id:h.m.fixture.customerId,currency_code:h.m.currency,status:h.m.fixture.status,total:1}});}});
 const {state}=await consent(h,svc);await assert.rejects(svc.callback('owner','stale-first-attempt-state','DUMMY-CODE'),e=>e.code==='oauth_state');assert.equal(calls.length,0);
 await svc.callback('owner',state,'DUMMY-CODE');await assert.rejects(svc.callback('owner',state,'DUMMY-CODE'),e=>e.code==='oauth_state');const result=await svc.verify('owner');assert.equal(result.evidence.requestCount,2);assert.equal(calls.length,3);assert.deepEqual(calls.map(x=>x[1]),['POST','GET','GET']);
 await svc.disable('owner');const history=h.db.connectionHistory;
 assert.throws(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(true),{now:h.clock}));assert.throws(()=>attestCleanup(h.db,h.m,{providerRevocationConfirmed:true}));
 const clean=cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock});assert.deepEqual(clean.connectionHistory,history);assert.equal(clean.connections[h.m.businessId].cleanup,undefined);assert.equal(clean.connections[h.m.businessId].successorCleanup.providerRevocationCustodianAttested,true);assert.equal(clean.connections[h.m.businessId].successorCleanup.providerRevocationVerifiedBySoftware,false);assert.doesNotMatch(JSON.stringify(clean),/SUCCESSOR-DUMMY-SECRET|DUMMY-REFRESH|DUMMY-ACCESS/);
});

test('unknown exchange and disabled in-flight grant can never use no-grant cleanup',async()=>{
 for(const late of [false,true]){
  const h=await fixture();h.prep();h.import();let release,entered;const inFlight=new Promise(r=>{entered=r;});const done=new Promise(r=>{release=r;});const svc=h.svc({fetchImpl:async()=>{entered();await done;if(late)return exchangeResponse();throw Error('DUMMY-SECRET provider detail');}}),{state}=await consent(h,svc);
  const exchange=svc.callback('owner',state,'DUMMY-CODE');await inFlight;assert.equal(h.db.connections[h.m.businessId].cleanup.unknownOutcome,true);if(late)await svc.disable('owner');release();await assert.rejects(exchange);
  assert.equal(h.db.connections[h.m.businessId].status,'disabled');assert.throws(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(true),{now:h.clock}));const e=h.cleanupEvidence(false);assert.doesNotThrow(()=>cleanupSuccessor(h.db,h.m,e,{now:h.clock}));
 }
});

test('cleanup refuses false/shared/foreign/altered state and gates exact approval bytes without mutation',async()=>{
 const h=await fixture();h.prep();h.import();await h.svc().disable('owner');const e=h.cleanupEvidence();
 for(const patch of [{approved:false},{approvalReference:h.m.approvalReference},{generation:e.generation+1},{connectionId:h.predecessor.id},{clientId:'foreign'},{businessId:'foreign'},{organizationId:'999'},{identity:'other'},{noGrantIssued:false},{providerRevocationConfirmed:true},{extra:true}])assert.throws(()=>cleanupSuccessor(h.db,h.m,{...e,...patch},{now:h.clock}));
 for(const mutate of [db=>{db.connections.other={clientId:h.m.clientId};},db=>{db.connections[h.m.businessId].cleanup={unknownOutcome:true};},db=>{db.connections[h.m.businessId].credentials={accessToken:'DUMMY'};},db=>{db.connections[h.m.businessId].events.push({event:'exchange_dispatched',time:h.clock,generation:5});},db=>{db.clients[h.m.clientId].approvalDigest='wrong';},db=>{db.clients[h.m.clientId].refreshToken='DUMMY';},db=>{db.connectionHistory[h.predecessor.id].successorId='wrong';}]){const db=h.db;mutate(db);const before=structuredClone(db);assert.throws(()=>cleanupSuccessor(db,h.m,e,{now:h.clock}));assert.deepEqual(db,before);}
 const raw=bytes(e);assert.throws(()=>validateSuccessorCleanup(Buffer.concat([h.manifestRaw,Buffer.from('\n')]),raw,hash(raw),h.m.probeSha));assert.throws(()=>validateSuccessorCleanup(h.manifestRaw,raw,'0'.repeat(64),h.m.probeSha));assert.throws(()=>validateSuccessorCleanup(h.manifestRaw,raw,hash(raw),'f'.repeat(64)));
});

test('preparation interrupted before commit leaves predecessor; lost receipt/restart cannot prepare or consume twice',async()=>{
 const h=await fixture(),original=h.db;const next=prepareSuccessor(original,h.pkg,{now:h.clock});
 const failedVault={read:async()=>structuredClone(original),write:async()=>{throw Error('dummy failure before atomic rename');}};await assert.rejects(failedVault.write(next));assert.deepEqual(await failedVault.read(),original);
 h.db=next;assert.throws(()=>h.prep());h.import();const {state}=await consent(h);const afterStart=h.db;
 await assert.rejects(h.svc().callback('owner',state,'DUMMY-CODE'),e=>e.code==='oauth_state');assert.deepEqual(h.db,afterStart);await assert.rejects(h.svc().authorise('owner'));
});

test('CLI mixed/invalid preparation and cleanup approvals fail before opening any custody store',async t=>{
 const h=await fixture(),dir=await mkdtemp(join(tmpdir(),'t19-successor-gates-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const [name,raw] of [['old',h.originalRaw],['recovery',h.recoveryRaw],['new',h.manifestRaw],['prep',h.evidenceRaw]])await writeFile(join(dir,name+'.json'),raw);
 const base=['scripts/t19-connection.mjs','--manifest='+join(dir,'new.json'),'--predecessor-manifest='+join(dir,'old.json'),'--predecessor-recovery='+join(dir,'recovery.json'),'--prepare-successor-evidence='+join(dir,'prep.json'),'--successor-approved='+hash(h.evidenceRaw)],store=join(dir,'never-opened');
 const run=args=>spawnSync(process.execPath,args,{cwd:root,env:{...process.env,LOCALAPPDATA:store},encoding:'utf8',windowsHide:true});
 for(const args of [base.map(x=>x.startsWith('--successor-approved=')?'--successor-approved=invalid':x),base.filter(x=>!x.startsWith('--predecessor-recovery=')),...['--execute-approved='+hash(h.manifestRaw),'--import-client='+h.m.clientId,'--check-import='+h.m.clientId,'--cleanup-rejected-consent-evidence=unused','--successor-cleanup-evidence=unused'].map(x=>[...base,x])]){const out=run(args);assert.equal(out.status,1);assert.equal(out.stdout,'');assert.doesNotMatch(out.stderr,/DUMMY|clientSecret|DUMMY-CODE/);}
 h.prep();await h.svc().disable('owner');const raw=bytes(h.cleanupEvidence());await writeFile(join(dir,'cleanup.json'),raw);
 const clean=['scripts/t19-connection.mjs','--manifest='+join(dir,'new.json'),'--successor-cleanup-evidence='+join(dir,'cleanup.json'),'--successor-approved='+hash(raw)];
 for(const args of [[...clean,'--execute-approved='+hash(h.manifestRaw)],clean.map(x=>x.startsWith('--successor-approved=')?'--successor-approved=invalid':x),clean.filter(x=>!x.startsWith('--successor-approved='))])assert.equal(run(args).status,1);
 await assert.rejects(stat(store),e=>e.code==='ENOENT');
});

test('Windows real dummy DPAPI successor CLI archive, exclusive writer, restart and cleanup preserve unrelated data',{skip:process.platform!=='win32',timeout:120000},async t=>{
 const h=await fixture(),parent=join(process.env.LOCALAPPDATA,'FaraiOS','T19-successor-tests');await mkdir(parent,{recursive:true});const isolated=await mkdtemp(join(parent,'dummy-')),directory=join(isolated,'FaraiOS','T19','credentials');let vault;
 t.after(async()=>{await vault?.close();const rel=relative(resolve(parent),resolve(isolated));if(!rel||rel.startsWith('..')||isAbsolute(rel))throw Error('Unsafe dummy cleanup');await rm(isolated,{recursive:true,force:true});});
 for(const [name,raw] of [['old',h.originalRaw],['recovery',h.recoveryRaw],['new',h.manifestRaw],['prep',h.evidenceRaw]])await writeFile(join(isolated,name+'.json'),raw);
 const run=args=>spawnSync(process.execPath,['scripts/t19-connection.mjs',...args],{cwd:root,env:{...process.env,LOCALAPPDATA:isolated},encoding:'utf8',windowsHide:true,timeout:60000});
 const args=['--manifest='+join(isolated,'new.json'),'--predecessor-manifest='+join(isolated,'old.json'),'--predecessor-recovery='+join(isolated,'recovery.json'),'--prepare-successor-evidence='+join(isolated,'prep.json'),'--successor-approved='+hash(h.evidenceRaw)];
 vault=await openVault({directory,repositoryRoot:root});await vault.write(h.db);assert.equal(run(args).status,1);await vault.close();vault=null;
 const result=run(args);assert.equal(result.status,0,result.stderr);assert.equal(result.stderr,'');assert.equal(result.stdout.trim(),'TEST successor prepared locally; predecessor retained; no provider request performed.');assert.equal(run(args).status,1);
 vault=await openVault({directory,repositoryRoot:root});h.db=await vault.read();assert.deepEqual(h.db.connectionHistory[h.predecessor.id].record,h.predecessor);h.clock=Math.max(h.clock,h.db.connections[h.m.businessId].events.at(-1).time);h.import();await vault.write(h.db);await vault.close();vault=null;
 vault=await openVault({directory,repositoryRoot:root});h.db=await vault.read();await h.svc().disable('owner');await vault.write(h.db);await vault.close();vault=null;
 const raw=bytes(h.cleanupEvidence()),path=join(isolated,'cleanup.json');await writeFile(path,raw);
 const out=run(['--manifest='+join(isolated,'new.json'),'--successor-cleanup-evidence='+path,'--successor-approved='+hash(raw)]);assert.equal(out.status,0,out.stderr);assert.equal(out.stderr,'');assert.doesNotMatch(out.stdout,/SUCCESSOR-DUMMY-SECRET|DUMMY-REFRESH/);
 vault=await openVault({directory,repositoryRoot:root});const final=await vault.read();assert.deepEqual(final.connectionHistory[h.predecessor.id].record,h.predecessor);assert.equal(final.clients[h.m.clientId],undefined);assert.equal(final.clients.unrelated.clientSecret,'UNRELATED-DUMMY');assert.equal(final.connections[h.m.businessId].status,'disabled');assert.equal((await readFile(join(directory,'vault.dpapi'))).includes(Buffer.from('SUCCESSOR-DUMMY-SECRET')),false);
});


test('portable actual CLI dispatch reaches only the injected dummy vault for valid preparation and cleanup',async t=>{
 const h=await fixture(),dir=await mkdtemp(join(tmpdir(),'t19-successor-positive-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 for(const [name,raw] of [['old',h.originalRaw],['recovery',h.recoveryRaw],['new',h.manifestRaw],['prep',h.evidenceRaw]])await writeFile(join(dir,name+'.json'),raw);
 let opened=0,closed=0;const output=[];
 const dependencies={environment:{LOCALAPPDATA:join(dir,'dummy-not-on-disk')},print:value=>output.push(value),openStore:async()=>{opened++;return {...h.vault,close:async()=>{closed++;}};}};
 const args=['--manifest='+join(dir,'new.json'),'--predecessor-manifest='+join(dir,'old.json'),'--predecessor-recovery='+join(dir,'recovery.json'),'--prepare-successor-evidence='+join(dir,'prep.json'),'--successor-approved='+hash(h.evidenceRaw)];
 await main(args,dependencies);assert.equal(opened,1);assert.equal(closed,1);assert.equal(output[0],'TEST successor prepared locally; predecessor retained; no provider request performed.');
 assert.deepEqual(h.db.connectionHistory[h.predecessor.id].record,h.predecessor);h.clock=Math.max(h.clock,h.db.connections[h.m.businessId].events.at(-1).time);
 h.import();await h.svc().disable('owner');const raw=bytes(h.cleanupEvidence());await writeFile(join(dir,'cleanup.json'),raw);
 await main(['--manifest='+join(dir,'new.json'),'--successor-cleanup-evidence='+join(dir,'cleanup.json'),'--successor-approved='+hash(raw)],dependencies);
 assert.equal(opened,2);assert.equal(closed,2);assert.equal(h.db.clients[h.m.clientId],undefined);assert.equal(h.db.connections[h.m.businessId].successorCleanup.noGrantIssuedAttested,true);
 await assert.rejects(stat(join(dir,'dummy-not-on-disk')),e=>e.code==='ENOENT');
});


test('legacy cleanup/import cannot bypass successor approval by stripping the manifest successor field',async()=>{
 const h=await fixture();h.prep();const stripped=structuredClone(h.m);delete stripped.successor;
 assert.throws(()=>importClient(h.db,stripped,{clientSecret:'DUMMY'}));h.import();
 const svc=h.svc({fetchImpl:async()=>exchangeResponse()}),{state}=await consent(h,svc);await svc.callback('owner',state,'DUMMY-CODE');await svc.disable('owner');
 const before=h.db;
 assert.throws(()=>attestCleanup(before,stripped,{connectionId:nextId,generation:before.connections[h.m.businessId].generation,identity:h.m.identity,custodian:h.m.custodian,providerRevocationConfirmed:true,reference:'generic-bypass'}));
 assert.deepEqual(h.db,before);
});

test('successor repeated and concurrent disable is idempotent and leaves no-grant cleanup reachable',async()=>{
 for(const startConsent of [false,true]){
  const h=await fixture();h.prep();h.import();const svc=h.svc();if(startConsent)await consent(h,svc);
  const results=await Promise.all([svc.disable('owner'),svc.disable('owner'),svc.disable('owner')]);assert.equal(new Set(results.map(r=>r.generation)).size,1);const before=h.db;await h.svc().disable('owner');assert.deepEqual(h.db,before);
  assert.doesNotThrow(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(),{now:h.clock}));
 }
});


test('accepted consent with lost/expired callback has explicit targeted-revocation-before-exchange cleanup, never inferred no grant',async()=>{
 const h=await fixture();h.prep();h.import();const svc=h.svc(),{state}=await consent(h,svc);
 h.clock=h.m.endsAt+1;await assert.rejects(svc.callback('owner',state,'DUMMY-ACCEPTED-CODE'),e=>e.code==='approval_required');await svc.disable('owner');
 assert.throws(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock}));
 const e={...h.cleanupEvidence(false),consentRevokedBeforeExchange:true};
 const raw=bytes(e);assert.doesNotThrow(()=>validateSuccessorCleanup(h.manifestRaw,raw,hash(raw),h.m.probeSha));
 const result=cleanupSuccessor(h.db,h.m,e,{now:h.clock});assert.equal(result.connections[h.m.businessId].successorCleanup.noGrantIssuedAttested,false);assert.equal(result.connections[h.m.businessId].successorCleanup.consentRevokedBeforeExchange,true);assert.equal(result.connections[h.m.businessId].successorCleanup.providerRevocationCustodianAttested,true);assert.deepEqual(result.connectionHistory,h.db.connectionHistory);
 assert.throws(()=>cleanupSuccessor(h.db,h.m,{...e,noGrantIssued:true,providerRevocationConfirmed:false},{now:h.clock}));
});

test('expiry or membership revocation during exchange disables late successor grant and retains targeted cleanup',async()=>{
 for(const mode of ['expired','owner-revoked']){
  const h=await fixture();h.prep();h.import();let release,entered,active=true;const inFlight=new Promise(r=>{entered=r;}),done=new Promise(r=>{release=r;});
  const trusted=sessions();const svc=h.svc({sessions:{read:async sid=>active?trusted.read(sid):null},fetchImpl:async()=>{entered();await done;return exchangeResponse();}}),{state}=await consent(h,svc);
  const promise=svc.callback('owner',state,'DUMMY-CODE');await inFlight;if(mode==='expired')h.clock=h.m.endsAt+1;else active=false;release();await assert.rejects(promise,e=>e.code==='stale');
  assert.equal(h.db.connections[h.m.businessId].status,'disabled');assert.equal(h.db.connections[h.m.businessId].generation,6);assert.throws(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(true),{now:h.clock}));assert.doesNotThrow(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock}));
 }
});

test('disable while either synthetic verification GET is in flight discards late success and preserves cleanup/history',async()=>{
 for(const pauseAt of [2,3]){
  const h=await fixture();h.prep();h.import();let count=0,release,entered;const inFlight=new Promise(r=>{entered=r;}),done=new Promise(r=>{release=r;});
  const svc=h.svc({fetchImpl:async()=>{count++;if(count===pauseAt){entered();await done;}if(count===1)return exchangeResponse();if(count===2)return jsonResponse({code:0,organization:{organization_id:h.m.organizationId,is_org_active:true,currency_code:h.m.currency}});return jsonResponse({code:0,invoice:{invoice_id:h.m.fixture.invoiceId,invoice_number:h.m.fixture.number,reference_number:h.m.fixture.reference,customer_id:h.m.fixture.customerId,currency_code:h.m.currency,status:h.m.fixture.status,total:1}});}}),{state}=await consent(h,svc);
  await svc.callback('owner',state,'DUMMY-CODE');const verify=svc.verify('owner');await inFlight;await svc.disable('owner');release();await assert.rejects(verify);assert.equal(count,pauseAt);assert.equal(h.db.connections[h.m.businessId].evidence,undefined);assert.doesNotThrow(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock}));assert.deepEqual(h.db.connectionHistory[h.predecessor.id].record,h.predecessor);
 }
});


test('identical semantic manifest with changed raw bytes cannot relabel a prepared successor import or service',async()=>{
 const h=await fixture();h.prep();const changedRaw=Buffer.concat([h.manifestRaw,Buffer.from('\n')]),digest=hash(changedRaw);
 assert.notEqual(digest,hash(h.manifestRaw));
 assert.throws(()=>importClient(h.db,h.m,{clientSecret:'DUMMY'},{manifestSha256:digest}));
 const svc=h.svc({manifestSha256:digest});await assert.rejects(svc.status('owner'));await assert.rejects(svc.authorise('owner'));assert.equal(h.db.clients[h.m.clientId],undefined);
});

test('synthetic permission or profile mismatch failure disables successor before invoice read and remains cleanup-safe',async()=>{
 for(const failureMode of ['403','profile-mismatch']){
  const h=await fixture();h.prep();h.import();let count=0;
  const svc=h.svc({fetchImpl:async()=>{count++;if(count===1)return exchangeResponse();return failureMode==='403'?new Response('{}',{status:403}):jsonResponse({code:0,organization:{organization_id:'999',is_org_active:true,currency_code:'ZAR'}});}}),{state}=await consent(h,svc);
  await svc.callback('owner',state,'DUMMY-CODE');await assert.rejects(svc.verify('owner'));assert.equal(count,2);assert.equal(h.db.connections[h.m.businessId].status,'disabled');assert.equal(h.db.connections[h.m.businessId].evidence,undefined);assert.throws(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(true),{now:h.clock}));assert.doesNotThrow(()=>cleanupSuccessor(h.db,h.m,h.cleanupEvidence(false),{now:h.clock}));
 }
});
