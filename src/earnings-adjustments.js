// ADJ01: isolated review core. No earnings posting, bank call or paid-status write.
import {isDeepStrictEqual} from 'node:util';
const MAX=2147483647;
const fail=m=>{throw new Error(m);};
const uuid=v=>{if(typeof v!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v))fail('Invalid record reference');return v.toLowerCase();};
const amount=(v,signed=false)=>{if(!Number.isSafeInteger(v)||Math.abs(v)>MAX||(!signed&&v<0))fail('Record an explicit integer-cent amount');return v;};
const text=v=>{if(typeof v!=='string'||!v.trim()||v.length>2000)fail('Record bounded evidence text');return v.trim();};
const timestamp=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(v)||!Number.isFinite(Date.parse(v)))fail('Record an explicit zoned timestamp');const d=v.slice(0,10),day=new Date(d+'T00:00:00Z');if(day.toISOString().slice(0,10)!==d||Number(v.slice(11,13))>23||Number(v.slice(14,16))>59)fail('Invalid event date');return Date.parse(v);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const checkedSum=xs=>amount(xs.reduce((a,b)=>a+b,0),true);
const source=(state,id)=>state.sources.find(s=>s.id===uuid(id))??fail('Source earnings unavailable');
const adjustment=(state,id)=>state.adjustments.find(a=>a.id===uuid(id))??fail('Adjustment unavailable');
const currentTotal=(state,s)=>checkedSum([s.originalCents,...state.adjustments.filter(a=>a.sourceId===s.id&&a.status==='approved'&&a.kind!=='reimbursement').map(a=>a.deltaCents)]);
const owner=role=>{if(role!=='owner')fail('Owner approval required');};
const fields={register_source:['sourceId','bookingId','workerId','originalVersion','originalCents','originalPeriod','agreementEvidence','originalRecordEvidence'],propose:['sourceId','kind','deltaCents','reason','evidence','occurrenceReference','approvedRuleEvidence','supersedesId'],raise_dispute:['adjustmentId','reason','evidence'],request_review:['adjustmentId','reason','evidence'],resolve_dispute:['adjustmentId','reason','workerReviewEvidence'],approve:['adjustmentId','originalVerificationEvidence','entitlementReviewEvidence','reason','lawfulBasisEvidence','requiredAgreementEvidence','fairProcessEvidence','approvedRuleVerification'],reject:['adjustmentId','reason'],freeze_review:['adjustmentId','reference'],simulate_settlement:['adjustmentId','reference','amountCents']};

/** Trusted caller supplies fresh role/identity; persistence must independently enforce it.
 * The initial increment is a pure simulation, never an authoritative earnings ledger.
 */
export function earningsAdjustmentEvent(current,event){
 const businessId=uuid(event.businessId),actorId=uuid(event.actorId),key=uuid(event.key),at=event.at;
 timestamp(at);const {role,type}=event,payload=structuredClone(event.payload??{});
 if(!['owner','manager','staff'].includes(role))fail('Adjustment access denied');
 if(!payload||typeof payload!=='object'||Array.isArray(payload))fail('Invalid adjustment event');
 if(!fields[type]||Object.keys(payload).some(k=>!fields[type].includes(k)))fail('Unsupported adjustment action or field');
 // Canonical references make UUID casing irrelevant to replay and linked lookup.
 for(const name of ['sourceId','bookingId','workerId','adjustmentId','supersedesId'])if(Object.hasOwn(payload,name))payload[name]=uuid(payload[name]);
 if(type==='propose')payload.occurrenceReference=text(payload.occurrenceReference);
 const old=current??{businessId,version:0,sources:[],adjustments:[],events:[],execution:'disabled'};
 if(old.businessId!==businessId)fail('Business scope mismatch');
 if(role==='staff'&&!['raise_dispute','request_review'].includes(type))fail('Staff may only request review of their own adjustment');
 const duplicate=old.events.find(e=>e.key===key);
 if(duplicate){if(duplicate.type!==type||duplicate.actorId!==actorId||duplicate.role!==role||!isDeepStrictEqual(duplicate.payload,payload))fail('Event reference reused with different details');return old;}
 if(!Number.isSafeInteger(event.expectedVersion)||event.expectedVersion!==old.version)fail('History changed; reopen before saving');
 if(old.events.length&&timestamp(at)<timestamp(old.events.at(-1).at))fail('Event precedes saved history');
 const next=structuredClone(old);
 if(type==='register_source'){
  if(role==='staff')fail('Preparer access required');
  const {sourceId,bookingId,workerId}=payload;
  uuid(sourceId);uuid(bookingId);uuid(workerId);
  if(!Number.isSafeInteger(payload.originalVersion)||payload.originalVersion<1)fail('Original earnings version required');
  amount(payload.originalCents);text(payload.agreementEvidence);text(payload.originalRecordEvidence);
  if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(payload.originalPeriod??''))fail('Record original Johannesburg period');
  if(next.sources.some(s=>s.id===sourceId||s.bookingId===bookingId&&s.workerId===workerId))fail('Original source already registered; preserve its snapshot');
  next.sources.push({...payload,id:sourceId,registeredBy:actorId,at,revision:0});
 }else if(type==='propose'){
  const s=source(next,payload.sourceId);
  if(!['calculation_correction','reimbursement','additional_agreed_work'].includes(payload.kind))fail('Unsupported reason; fines, damage and refund clawbacks are not adjustments');
  const delta=amount(payload.deltaCents,true);if(!delta)fail('An adjustment must change an amount');
  if(payload.kind!=='calculation_correction'&&delta<0)fail('Only reviewed calculation corrections may propose a reduction');
  if(payload.kind==='additional_agreed_work')text(payload.approvedRuleEvidence);
  text(payload.reason);text(payload.evidence);payload.occurrenceReference=text(payload.occurrenceReference);
  const previous=next.adjustments.filter(a=>a.sourceId===s.id&&a.occurrenceReference===payload.occurrenceReference).at(-1);
  if(previous&&(previous.status!=='rejected'||payload.supersedesId!==previous.id)||!previous&&payload.supersedesId)fail('This occurrence needs a linked replacement of its rejected proposal');
  const oldCents=payload.kind==='reimbursement'?0:currentTotal(next,s),newCents=checkedSum([oldCents,delta]);
  if(newCents<0)fail('Correction cannot make earnings negative');
  next.adjustments.push({id:key,sourceId:s.id,workerId:s.workerId,bookingId:s.bookingId,originalVersion:s.originalVersion,originalPeriod:s.originalPeriod,sourceRevision:s.revision,oldCents,newCents,...payload,status:'proposed',preparedBy:actorId,preparedAt:at,disputed:false,simulation:null});
 }else{
  const a=adjustment(next,payload.adjustmentId),s=source(next,a.sourceId);
  if(role==='staff'&&actorId!==a.workerId)fail('Only your own adjustment is available');
  if(['raise_dispute','request_review'].includes(type)){
   text(payload.reason);text(payload.evidence);
   a.disputed=true;a.disputeEvidence={reason:payload.reason,evidence:payload.evidence,actorId,at};
   // Even a previously frozen review becomes ineligible until owner resolution/refreeze.
   a.frozen=null;
  }else if(type==='resolve_dispute'){
   owner(role);if(!a.disputed)fail('No open dispute');text(payload.reason);text(payload.workerReviewEvidence);
   a.disputed=false;a.resolution={...payload,actorId,at};a.frozen=null;
  }else if(type==='approve'){
   owner(role);if(a.status!=='proposed'||a.disputed)fail('Only undisputed proposals may be approved');
   text(payload.originalVerificationEvidence);text(payload.entitlementReviewEvidence);text(payload.reason);
   if(a.sourceRevision!==s.revision)fail('Source changed; prepare a linked replacement correction');
   if(a.deltaCents<0){text(payload.lawfulBasisEvidence);text(payload.requiredAgreementEvidence);text(payload.fairProcessEvidence);}
   if(a.kind==='additional_agreed_work')text(payload.approvedRuleVerification);
   a.status='approved';a.approvedBy=actorId;a.approvedAt=at;a.approval=payload;s.revision++;
  }else if(type==='reject'){
   owner(role);if(a.status!=='proposed')fail('Approved history cannot be erased or rejected');text(payload.reason);a.status='rejected';a.rejection={...payload,actorId,at};
  }else if(type==='freeze_review'){
   owner(role);if(a.status!=='approved'||a.disputed||a.simulation)fail('Review is not available to freeze');text(payload.reference);
   a.frozen={reference:payload.reference,by:actorId,at};
  }else if(type==='simulate_settlement'){
   owner(role);if(a.status!=='approved'||a.disputed||!a.frozen||a.simulation)fail('Correction needs an undisputed frozen approval and no previous simulation');
   text(payload.reference);if(amount(payload.amountCents,true)!==a.deltaCents)fail('Settle only the correction, never the original earnings again');
   a.simulation={deltaCents:a.deltaCents,reference:payload.reference,by:actorId,at,status:'simulated_only'};
  }else fail('Unsupported adjustment action');
 }
 next.version++;next.events.push({key,type,payload,actorId,role,at});return freeze(next);
}

/** Per-worker correction-only preview; no base earnings or transfer instruction. */
export function adjustmentPreview(state,{businessId,role,workerId=null}){
 if(!state||state.businessId!==uuid(businessId))fail('Business scope mismatch');
 if(!['owner','manager','staff'].includes(role))fail('Adjustment access denied');
 if(role==='staff')fail('Staff previews require a future authenticated own-record endpoint');
 const rows=state.adjustments.filter(a=>workerId===null||a.workerId===uuid(workerId)).map(a=>({adjustmentId:a.id,sourceId:a.sourceId,bookingId:a.bookingId,workerId:a.workerId,kind:a.kind,originalPeriod:a.originalPeriod,deltaCents:a.deltaCents,status:a.status,disputed:a.disputed,eligible:a.status==='approved'&&!a.disputed&&Boolean(a.frozen)&&!a.simulation,simulated:Boolean(a.simulation)}));
 return freeze({businessId:state.businessId,execution:'disabled',rows,positivePendingCents:checkedSum(rows.filter(a=>a.eligible&&a.deltaCents>0).map(a=>a.deltaCents)),reviewedReductionCents:checkedSum(rows.filter(a=>a.eligible&&a.deltaCents<0).map(a=>a.deltaCents))});
}
