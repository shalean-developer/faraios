// Local TEST successor only. No transport, token refresh, store discovery or provider writes.
import {createHash} from 'node:crypto';
import {validateManifest} from './t19-connection.js';

export const recordDigest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const rawDigest=value=>createHash('sha256').update(value).digest('hex');
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
const uuid=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const ref=v=>typeof v==='string'&&Boolean(v.trim())&&v.length<=500&&!/[\r\n\0]/.test(v);
const exact=(o,keys)=>o&&typeof o==='object'&&!Array.isArray(o)&&Object.keys(o).length===keys.length&&keys.every(k=>Object.hasOwn(o,k));
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const reject=()=>{throw new Error('TEST successor action rejected');};
const requireThat=v=>{if(!v)reject();};
export const binding=m=>({businessId:m.businessId,organizationId:m.organizationId,apiDomain:m.apiDomain,currency:m.currency,identity:m.identity,zohoUserId:m.zohoUserId,environment:'staging',provider:'zoho_books',region:'US'});
const specFields=['predecessorId','predecessorGeneration','predecessorRecordSha256','connectionId','generation','preparationApprovalReference'];
export function successorSpec(m){
 const s=m.successor;
 requireThat(exact(s,specFields)&&uuid(s.predecessorId)&&uuid(s.connectionId)&&s.predecessorId!==s.connectionId&&s.predecessorGeneration===3&&s.generation===4&&sha(s.predecessorRecordSha256)&&ref(s.preparationApprovalReference)&&s.preparationApprovalReference!==m.approvalReference);
 return s;
}
const prepFields=['action','approved','approvalReference','reference','originalManifestSha256','predecessorRecoverySha256','successorManifestSha256','currentProbeSha','businessId','organizationId','clientId','identity','custodian','predecessorConnectionId','predecessorGeneration','predecessorRecordSha256','successorConnectionId','preparedGeneration'];
const recoveryFields=['action','approved','approvalReference','originalManifestSha256','recoveryProbeSha','clientId','businessId','organizationId','connectionId','generation','identity','custodian','consentRejected','noGrantIssued','reference'];
const identityFields=['businessId','organizationId','clientId','identity','custodian'];
const originalConnectionFields=['id','generation','binding','clientId','approvalDigest','status','approvalReference','events','recovery'];
function validatePreparation(oldM,recovery,m,e,now){
 validateManifest(oldM,{execution:true,now:oldM.startsAt});validateManifest(m,{execution:true,now});
 requireThat(!Object.hasOwn(oldM,'successor'));
 const s=successorSpec(m);
 requireThat(exact(e,prepFields)&&e.action==='prepare_successor'&&e.approved===true&&ref(e.reference)&&e.approvalReference===s.preparationApprovalReference&&e.approvalReference!==oldM.approvalReference&&m.approvalReference!==oldM.approvalReference&&identityFields.every(k=>e[k]===m[k]&&m[k]===oldM[k])&&same(binding(m),binding(oldM))&&same(m.fixture,oldM.fixture)&&m.redirectUri===oldM.redirectUri&&['originalManifestSha256','predecessorRecoverySha256','successorManifestSha256','currentProbeSha','predecessorRecordSha256'].every(k=>sha(e[k]))&&e.currentProbeSha===m.probeSha&&e.predecessorConnectionId===s.predecessorId&&e.predecessorGeneration===3&&e.predecessorRecordSha256===s.predecessorRecordSha256&&e.successorConnectionId===s.connectionId&&e.preparedGeneration===4);
 requireThat(exact(recovery,recoveryFields)&&recovery.action==='cleanup_rejected_consent'&&recovery.approved===true&&ref(recovery.approvalReference)&&recovery.approvalReference!==oldM.approvalReference&&ref(recovery.reference)&&recovery.consentRejected===true&&recovery.noGrantIssued===true&&sha(recovery.recoveryProbeSha)&&recovery.originalManifestSha256===e.originalManifestSha256&&identityFields.every(k=>recovery[k]===oldM[k])&&recovery.connectionId===s.predecessorId&&recovery.generation===2);
}
export function validateSuccessorPreparation(originalRaw,recoveryRaw,manifestRaw,evidenceRaw,approvedHash,currentProbeSha,{now=Date.now()}={}){
 requireThat(originalRaw.length<=32768&&recoveryRaw.length<=16384&&manifestRaw.length<=32768&&evidenceRaw.length<=16384&&sha(approvedHash)&&sha(currentProbeSha)&&rawDigest(evidenceRaw)===approvedHash);
 const original=JSON.parse(originalRaw),recovery=JSON.parse(recoveryRaw),manifest=JSON.parse(manifestRaw),evidence=JSON.parse(evidenceRaw);
 validatePreparation(original,recovery,manifest,evidence,now);
 requireThat(evidence.originalManifestSha256===rawDigest(originalRaw)&&evidence.predecessorRecoverySha256===rawDigest(recoveryRaw)&&evidence.successorManifestSha256===rawDigest(manifestRaw)&&evidence.currentProbeSha===currentProbeSha);
 return {original,recovery,manifest,evidence,approvalSha256:approvedHash};
}
function ordered(events){return Array.isArray(events)&&events.every((e,i)=>Number.isSafeInteger(e.time)&&e.time>=0&&(i===0||e.time>=events[i-1].time));}
function recoveredRecord(c,oldM,r,e){
 const expectedRecovery={kind:'rejected_consent_local_cleanup',originalManifestSha256:r.originalManifestSha256,recoveryProbeSha:r.recoveryProbeSha,approvalReference:r.approvalReference,reference:r.reference,custodian:r.custodian,noGrantIssuedAttested:true,providerRevocationClaimed:false};
 requireThat(exact(c,originalConnectionFields)&&c.id===e.predecessorConnectionId&&c.generation===3&&c.status==='disabled'&&same(c.binding,binding(oldM))&&c.clientId===oldM.clientId&&c.approvalDigest===recordDigest(oldM)&&c.approvalReference===oldM.approvalReference&&same(c.recovery,expectedRecovery)&&recordDigest(c)===e.predecessorRecordSha256&&ordered(c.events)&&c.events.length===3);
 const [a,b,d]=c.events;
 requireThat(exact(a,['event','time','generation'])&&a.event==='consent_started'&&a.generation===1&&exact(b,['event','time','generation'])&&b.event==='locally_disabled'&&b.generation===2&&exact(d,['event','time','generation','reference','providerRevocationClaimed'])&&d.event==='rejected_consent_client_removed_locally'&&d.generation===3&&d.reference===r.reference&&d.providerRevocationClaimed===false);
}
// Returns a snapshot for one atomic write under the existing exclusive vault writer.
export function prepareSuccessor(db,packageValue,{now=Date.now()}={}){
 const {original:oldM,recovery,manifest:m,evidence:e,approvalSha256}=packageValue;
 validatePreparation(oldM,recovery,m,e,now);requireThat(sha(approvalSha256));
 const c=db.connections?.[m.businessId];recoveredRecord(c,oldM,recovery,e);
 requireThat(db.clients&&typeof db.clients==='object'&&!Array.isArray(db.clients)&&!Object.hasOwn(db.clients,m.clientId));
 const history=db.connectionHistory??{};
 requireThat(typeof history==='object'&&!Array.isArray(history)&&!Object.hasOwn(history,c.id)&&!Object.values(history).some(h=>h.record?.binding?.businessId===m.businessId||h.record?.clientId===m.clientId||h.successorId===e.successorConnectionId)&&!Object.entries(db.connections).some(([key,other])=>key!==m.businessId&&(other.clientId===m.clientId||other.id===e.successorConnectionId||other.id===c.id)));
 requireThat(now>=c.events.at(-1).time);
 const next=structuredClone(db);
 next.connectionHistory??={};
 next.connectionHistory[c.id]={record:structuredClone(c),recordSha256:recordDigest(c),originalManifestSha256:e.originalManifestSha256,recoveryEvidenceSha256:e.predecessorRecoverySha256,successorId:e.successorConnectionId,successorManifestSha256:e.successorManifestSha256,preparationApprovalSha256:approvalSha256,preparationApprovalReference:e.approvalReference};
 next.connections[m.businessId]={id:e.successorConnectionId,generation:4,binding:binding(m),clientId:m.clientId,approvalDigest:recordDigest(m),status:'successor_pending',approvalReference:m.approvalReference,events:[{event:'successor_prepared',time:now,generation:4}],successor:{...successorSpec(m),preparationApprovalSha256:approvalSha256,manifestSha256:e.successorManifestSha256}};
 return next;
}
const archiveFields=['record','recordSha256','originalManifestSha256','recoveryEvidenceSha256','successorId','successorManifestSha256','preparationApprovalSha256','preparationApprovalReference'];
export function validateSuccessorRecord(db,c,m,manifestSha256=recordDigest(m)){
 const s=successorSpec(m),h=db.connectionHistory?.[s.predecessorId];
 requireThat(c&&c.id===s.connectionId&&Number.isSafeInteger(c.generation)&&c.generation>=4&&c.clientId===m.clientId&&same(c.binding,binding(m))&&c.approvalDigest===recordDigest(m)&&c.approvalReference===m.approvalReference&&exact(c.successor,[...specFields,'preparationApprovalSha256','manifestSha256'])&&specFields.every(k=>c.successor[k]===s[k])&&sha(c.successor.preparationApprovalSha256)&&sha(c.successor.manifestSha256)&&sha(manifestSha256)&&c.successor.manifestSha256===manifestSha256);
 requireThat(exact(h,archiveFields)&&recordDigest(h.record)===s.predecessorRecordSha256&&h.recordSha256===s.predecessorRecordSha256&&h.record.id===s.predecessorId&&h.record.generation===3&&h.record.status==='disabled'&&same(h.record.binding,c.binding)&&h.successorId===c.id&&h.successorManifestSha256===c.successor.manifestSha256&&h.preparationApprovalSha256===c.successor.preparationApprovalSha256&&h.preparationApprovalReference===s.preparationApprovalReference&&sha(h.originalManifestSha256)&&sha(h.recoveryEvidenceSha256));
 return s;
}
export function pendingSuccessor(db,c,m,manifestSha256=recordDigest(m)){
 validateSuccessorRecord(db,c,m,manifestSha256);
 requireThat(exact(c,['id','generation','binding','clientId','approvalDigest','status','approvalReference','events','successor'])&&c.status==='successor_pending'&&c.generation===4&&ordered(c.events)&&c.events.length===1&&exact(c.events[0],['event','time','generation'])&&c.events[0].event==='successor_prepared'&&c.events[0].generation===4);
 return c;
}
export function validateSuccessorImport(db,m,manifestSha256=recordDigest(m)){return pendingSuccessor(db,db.connections?.[m.businessId],m,manifestSha256);}
const cleanupFields=['action','approved','approvalReference','reference','manifestSha256','currentProbeSha','businessId','organizationId','clientId','identity','custodian','connectionId','generation','noGrantIssued','providerRevocationConfirmed','consentRevokedBeforeExchange'];
function cleanupApproval(m,e){
 const s=successorSpec(m);
 requireThat(exact(e,cleanupFields)&&e.action==='cleanup_successor'&&e.approved===true&&ref(e.approvalReference)&&![m.approvalReference,s.preparationApprovalReference].includes(e.approvalReference)&&ref(e.reference)&&sha(e.manifestSha256)&&e.currentProbeSha===m.probeSha&&sha(e.currentProbeSha)&&identityFields.every(k=>e[k]===m[k])&&e.connectionId===s.connectionId&&Number.isSafeInteger(e.generation)&&e.generation>4&&typeof e.noGrantIssued==='boolean'&&typeof e.providerRevocationConfirmed==='boolean'&&e.noGrantIssued!==e.providerRevocationConfirmed&&typeof e.consentRevokedBeforeExchange==='boolean'&&(!e.consentRevokedBeforeExchange||e.providerRevocationConfirmed));
}
export function validateSuccessorCleanup(manifestRaw,evidenceRaw,approvedHash,currentProbeSha){
 requireThat(manifestRaw.length<=32768&&evidenceRaw.length<=16384&&sha(approvedHash)&&rawDigest(evidenceRaw)===approvedHash&&sha(currentProbeSha));
 const manifest=validateManifest(JSON.parse(manifestRaw)),evidence=JSON.parse(evidenceRaw);
 validateManifest(manifest,{execution:true,now:manifest.startsAt});cleanupApproval(manifest,evidence);
 requireThat(evidence.manifestSha256===rawDigest(manifestRaw)&&evidence.currentProbeSha===currentProbeSha);
 return {manifest,evidence};
}
// Replay only known transitions; a disabled record is not evidence of a no-grant outcome.
function auditState(c){
 requireThat(ordered(c.events)&&c.events.length>=2);
 let phase='pending',generation=4,exchangeInFlight=false,exchanged=false,granted=false,verifiedAttempt=false;
 for(const [i,e] of c.events.entries()){
  requireThat(exact(e,['event','time','generation']));
  if(i===0){requireThat(e.event==='successor_prepared'&&e.generation===4);continue;}
  switch(e.event){
   case 'consent_started':requireThat(phase==='pending');generation++;phase='authorising';break;
   case 'exchange_dispatched':requireThat(phase==='authorising'&&!exchanged);phase='exchanging';exchangeInFlight=true;exchanged=true;break;
   case 'grant_stored':requireThat(phase==='exchanging'&&exchangeInFlight);phase='authenticated';exchangeInFlight=false;granted=true;break;
   case 'verification_started':requireThat(phase==='authenticated'&&!verifiedAttempt);phase='verifying';verifiedAttempt=true;break;
   case 'verified':requireThat(phase==='verifying');phase='verified';break;
   case 'locally_disabled':generation++;phase='disabled';break;
   case 'verification_failed_disabled':requireThat(phase==='verifying');generation++;phase='disabled';break;
   case 'exchange_failed_cleanup_review':requireThat(exchangeInFlight&&['exchanging','disabled'].includes(phase));generation++;phase='disabled';exchangeInFlight=false;break;
   case 'late_grant_cleanup_required':requireThat(exchangeInFlight&&['exchanging','disabled'].includes(phase));if(phase==='exchanging'){generation++;phase='disabled';}exchangeInFlight=false;break;
   default:reject();
  }
  requireThat(e.generation===generation);
 }
 requireThat(phase==='disabled'&&generation===c.generation);
 requireThat(verifiedAttempt?c.verificationAttempted===true:!Object.hasOwn(c,'verificationAttempted'));
 if(granted)requireThat(exact(c.provenance,['kind','identity','zohoUserId','evidence','actor','at'])&&c.provenance.kind==='attended'&&ref(c.provenance.actor)&&ref(c.provenance.evidence)&&Number.isSafeInteger(c.provenance.at));
 else requireThat(!Object.hasOwn(c,'provenance'));
 return {exchanged};
}
function cleanupMaterial(value){
 requireThat(value&&typeof value==='object'&&!Array.isArray(value));
 if(Object.hasOwn(value,'unknownOutcome'))requireThat(exact(value,['unknownOutcome'])&&value.unknownOutcome===true);
 else requireThat(Object.keys(value).every(k=>['refreshToken','expiresAt','accessToken'].includes(k))&&typeof value.refreshToken==='string'&&value.refreshToken.length>0&&value.refreshToken.length<=4096&&!/[\r\n\0]/.test(value.refreshToken)&&(!Object.hasOwn(value,'accessToken')||value.accessToken===undefined)&&(!Object.hasOwn(value,'expiresAt')||Number.isSafeInteger(value.expiresAt)&&value.expiresAt>0));
}
export function cleanupSuccessor(db,m,e,{now=Date.now()}={}){
 cleanupApproval(m,e);const c=db.connections?.[m.businessId];validateSuccessorRecord(db,c,m,e.manifestSha256);
 requireThat(c.status==='disabled'&&c.generation===e.generation&&c.successor.manifestSha256===e.manifestSha256&&!Object.hasOwn(c,'credentials')&&!Object.hasOwn(c,'evidence')&&!Object.hasOwn(c,'successorCleanup')&&Object.keys(c).every(k=>['id','generation','binding','clientId','approvalDigest','status','approvalReference','events','successor','cleanup','provenance','verificationAttempted'].includes(k))&&Number.isSafeInteger(now)&&now>=c.events.at(-1)?.time);
 const {exchanged}=auditState(c);
 if(c.provenance)requireThat(c.provenance.identity===m.identity&&c.provenance.zohoUserId===m.zohoUserId);
 if(e.noGrantIssued){
  const names=c.events.map(x=>x.event).join(',');
  requireThat(['successor_prepared,locally_disabled','successor_prepared,consent_started,locally_disabled'].includes(names)&&c.events.every((x,i)=>x.generation===4+i)&&!Object.hasOwn(c,'cleanup')&&!Object.hasOwn(c,'provenance')&&!Object.hasOwn(c,'verificationAttempted'));
 }else if(e.consentRevokedBeforeExchange){
  requireThat(!exchanged&&c.events.map(x=>x.event).join(',')==='successor_prepared,consent_started,locally_disabled'&&c.events.every((x,i)=>x.generation===4+i)&&!Object.hasOwn(c,'cleanup')&&!Object.hasOwn(c,'provenance')&&!Object.hasOwn(c,'verificationAttempted'));
 }else{requireThat(exchanged&&Object.hasOwn(c,'cleanup'));cleanupMaterial(c.cleanup);}
 requireThat(!Object.entries(db.connections).some(([key,other])=>key!==m.businessId&&other.clientId===m.clientId));
 const client=db.clients?.[m.clientId];
 requireThat((!client&&e.noGrantIssued)||exact(client,['clientSecret','businessId','organizationId','approvalDigest'])&&typeof client.clientSecret==='string'&&client.clientSecret.length>0&&client.clientSecret.length<=4096&&!/[\r\n\0]/.test(client.clientSecret)&&client.businessId===m.businessId&&client.organizationId===m.organizationId&&client.approvalDigest===recordDigest(m));
 const next=structuredClone(db),target=next.connections[m.businessId];
 delete next.clients?.[m.clientId];delete target.cleanup;target.generation++;
 target.successorCleanup={approvalReference:e.approvalReference,reference:e.reference,custodian:e.custodian,noGrantIssuedAttested:e.noGrantIssued,providerRevocationCustodianAttested:e.providerRevocationConfirmed,consentRevokedBeforeExchange:e.consentRevokedBeforeExchange,providerRevocationVerifiedBySoftware:false};
 target.events.push({event:'successor_client_removed_locally',time:now,generation:target.generation});
 return next;
}
