// CANCEL01–03. Pure, versioned assessment/workflow; never executes a refund,
// changes a booking, posts earnings or infers acceptance of worker terms.
import {validDate,validPickerValue} from '../public/date-time-values.js';
import {isDeepStrictEqual} from 'node:util';
export const cancellationPolicyVersion='shalean-cancel-20261021-v1';
const MAX=2147483647;
const fail=m=>{throw new Error(m);};
const cents=(n,name)=>{if(!Number.isSafeInteger(n)||n<0||n>MAX)fail('Invalid '+name);return n;};
const text=(s,name)=>{if(typeof s!=='string'||!s.trim()||s.length>2000)fail('Record '+name);return s.trim();};
const timestamp=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:[0-5]\d(?:\.\d{3})?(?:Z|[+-](?:[01]\d|2[0-3]):[0-5]\d)$/.test(s)||!validPickerValue(s.slice(0,16),'datetime')||!Number.isFinite(Date.parse(s)))fail('Use a valid timestamp with an explicit time zone');return Date.parse(s);};
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const sum=values=>{const n=values.reduce((a,b)=>a+b,0);return cents(n,'total');};
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);

function workers(rows){
 if(!Array.isArray(rows)||rows.length>100)fail('Check accepted cleaner earnings');
 const seen=new Set();return rows.map(w=>{
  if(!uuid(w.id)||seen.has(w.id.toLowerCase()))fail('Use distinct cleaner references');seen.add(w.id.toLowerCase());
  return {id:w.id.toLowerCase(),agreedCents:cents(w.agreedCents,'agreed cleaner earnings'),expenseCents:cents(w.expenseCents,'approved nonduplicated expense')};
 }).sort((a,b)=>a.id.localeCompare(b.id));
}

// Largest-remainder cents allocation; zero-weight cleaners receive no pool share.
export function allocateCancellationPool(poolCents,rows){
 cents(poolCents,'compensation pool');const team=workers(rows),total=sum(team.map(w=>w.agreedCents));
 if(poolCents&&!total)fail('A positive pool needs positive accepted earnings');
 if(!total)return team.map(w=>({id:w.id,amountCents:0}));
 const weighted=team.map(w=>{const n=BigInt(poolCents)*BigInt(w.agreedCents);return {id:w.id,amountCents:Number(n/BigInt(total)),remainder:n%BigInt(total)};});
 let left=poolCents-weighted.reduce((a,w)=>a+w.amountCents,0);
 const ranked=[...weighted].sort((a,b)=>a.remainder===b.remainder?a.id.localeCompare(b.id):a.remainder>b.remainder?-1:1);
 for(let i=0;i<left;i++)ranked[i].amountCents++;
 return weighted.map(({id,amountCents})=>({id,amountCents}));
}

// Business-day targets are dates in Johannesburg. Holiday calendar must be
// supplied explicitly; there is no unverified default national holiday list.
export function refundTargetDate(requestedAt,days,holidays){
 timestamp(requestedAt);if(![1,5].includes(days)||!Array.isArray(holidays)||holidays.some(d=>!validDate(d)))fail('Supply a reviewed holiday calendar');
 const local=new Date(Date.parse(requestedAt)+2*3600000).toISOString().slice(0,10);
 const date=new Date(local+'T12:00:00Z');let remaining=days;
 while(remaining){date.setUTCDate(date.getUTCDate()+1);if(![0,6].includes(date.getUTCDay())&&!holidays.includes(date.toISOString().slice(0,10)))remaining--;}
 return date.toISOString().slice(0,10);
}

export function assessCancellation(input){
 if(input.policyVersion!==cancellationPolicyVersion)fail('Use the reviewed policy version');
 if(input.agreementKind!=='new_accepted')fail('Existing or unaccepted terms need separate review');
 text(input.acceptanceEvidence,'prospective acceptance evidence');
 if(!['customer','business'].includes(input.cause)||!['cancel','reschedule'].includes(input.action))fail('Choose cancellation cause and action');
 if(!['accepted','travelling','arrived','started'].includes(input.stage))fail('Record the dispatch stage');
 const start=timestamp(input.originalStart),requested=timestamp(input.requestedAt);
 const late=start-requested<24*3600000;
 const stages=['accepted','travelling','arrived','started'],index=stages.indexOf(input.stage);
 let prior=-Infinity;
 for(let i=0;i<=index;i++){
  const t=timestamp(input.stageTimes?.[stages[i]]);if(t<prior||t>requested)fail('Dispatch timestamps must be ordered and no later than the request');prior=t;
 }
 if(index>=1){const confirmed=timestamp(input.accessConfirmedAt);if(confirmed>timestamp(input.stageTimes.travelling))fail('Confirm customer access before dispatch');}
 const team=workers(input.workers);if(!team.length)fail('Record the accepted team');
 const eligible=cents(input.eligibleLabourCents,'eligible labour after discounts'),loss=cents(input.reasonableLossCents,'reviewed mitigated loss');
 const receipts=cents(input.verifiedReceiptsCents,'verified receipts'),performed=cents(input.performedServiceCents,'performed service value');
 const completed=cents(input.completedRefundsCents,'completed refunds'),pending=cents(input.pendingRefundsCents,'pending refunds');
 const fee=cents(input.reviewedCustomerFeeCents,'reviewed customer charge');
 const pool=cents(input.collectedPoolCents,'collected compensation after required tax');
 const rights=input.mandatoryRightsReviewed;if(typeof rights!=='boolean'||!rights)fail('Review mandatory and stronger customer rights first');
 if(typeof input.feeMustBeWaived!=='boolean')fail('Record whether stronger rights waive the fee');
 const feeCeiling=input.cause==='customer'&&late&&!input.feeMustBeWaived?Math.min(Math.floor(eligible/2),30000,loss):0;
 if(fee>feeCeiling)fail('Customer charge exceeds the reviewed whole-booking ceiling');
 if(completed+pending>receipts)fail('Previous refunds exceed verified receipts');
 const retainedFee=Math.min(fee,Math.max(0,receipts-performed-completed-pending));
 if(pool>retainedFee)fail('Pool cannot exceed lawfully retained collected compensation');
 if(input.cause==='business'&&pool)fail('Business cancellation is company-funded');
 const remaining=Math.max(0,receipts-performed-retainedFee-completed-pending);
 const businessTier=input.cause==='business'?(index>=2?100:index>=1||late?50:0):0;
 const compensation=input.cause==='business'?team.map(w=>({id:w.id,amountCents:Math.ceil(w.agreedCents*businessTier/100)})):allocateCancellationPool(pool,team);
 const expenses=team.map(w=>({id:w.id,amountCents:w.expenseCents}));
 let creditCents=null,newBalanceCents=null;
 if(input.action==='reschedule'){
  if(input.newDateAccepted!==true)fail('Record customer acceptance of the replacement date or use cancellation');
  if(timestamp(input.newStart)<=requested)fail('Replacement date must be after the request');
  const price=cents(input.newAgreedTotalCents,'accepted replacement price');text(input.newAgreementEvidence,'accepted replacement date and price evidence');
  creditCents=remaining;newBalanceCents=Math.max(0,price-creditCents);
 }
 return freeze({policyVersion:input.policyVersion,cause:input.cause,action:input.action,late,stage:input.stage,feeCeilingCents:feeCeiling,customerFeeCents:fee,retainedFeeCents:retainedFee,customerBalanceDueCents:Math.max(0,performed+fee-receipts+completed+pending),
  compensation,companyFunded:input.cause==='business',compensationTotalCents:sum(compensation.map(w=>w.amountCents)),expenses,expenseTotalCents:sum(expenses.map(w=>w.amountCents)),
  refundableCents:input.action==='cancel'?remaining:Math.max(0,remaining-input.newAgreedTotalCents),creditCents,newBalanceCents,
  reviewTargetDate:refundTargetDate(input.requestedAt,1,input.holidays),submissionTargetDate:refundTargetDate(input.requestedAt,5,input.holidays),
  independentEntitlements:'Separate review required; the optional pool does not extinguish work, expenses or stronger entitlements.',execution:'disabled'});
}

// Append-only case workflow. Persist the returned record with compare-and-swap
// version protection. Replays match payload as well as key, not only an amount.
export function cancellationEvent(current,{businessId,actorId,role,expectedVersion,key,type,payload={},at}){
 if(!uuid(businessId)||!uuid(actorId)||!uuid(key))fail('Invalid case scope or event reference');timestamp(at);
 if(!['owner','manager'].includes(role))fail('Cancellation access denied');
 const old=current??{businessId,version:0,status:'none',events:[],refunds:[],input:null,result:null};
 if(old.businessId!==businessId)fail('Business scope mismatch');
 const duplicate=old.events.find(e=>e.key===key);
 if(duplicate){if(duplicate.type!==type||!isDeepStrictEqual(duplicate.payload,payload)||duplicate.actorId!==actorId)fail('Event key reused with different details');return old;}
 if(old.version!==expectedVersion)fail('Case changed; reopen before saving');
 if(old.events.length&&Date.parse(at)<Date.parse(old.events.at(-1).at))fail('Event time precedes case history');
 const next=structuredClone(old);
 if(type==='prepare'){
  if(old.status!=='none')fail('The original-slot assessment already exists');
  if(timestamp(payload.requestedAt)>timestamp(at))fail('Request cannot be in the future');
  next.result=assessCancellation(payload);next.input=structuredClone(payload);next.status='prepared';
 }else{
  if(role!=='owner')fail('Owner approval required');
  if(type==='approve'){
   if(old.status!=='prepared')fail('Only a prepared case can be approved');text(payload.reason,'approval reason');next.status='approved';
  }else if(type==='acknowledge'){
   if(!['prepared','approved'].includes(old.status)||old.acknowledgedAt)fail('Case cannot be acknowledged again');text(payload.reference,'acknowledgement evidence');next.acknowledgedAt=at;
  }else if(type==='reserve_refund'){
   if(old.status!=='approved')fail('Approve the case before reserving a refund');
   const amount=cents(payload.amountCents,'refund amount');if(!amount)fail('Refund amount must be positive');
   text(payload.receiptReference,'verified original payment reference');text(payload.route,'refund route');
   text(payload.originalRoute,'original payment route');
   if(payload.route!==payload.originalRoute)text(payload.exceptionReason,'reviewed original-route exception');
   const reserved=sum(old.refunds.filter(r=>r.status!=='released').map(r=>r.amountCents));
   if(amount>old.result.refundableCents-reserved)fail('Refund exceeds remaining verified receipts');
   next.refunds.push({id:key,amountCents:amount,route:payload.route,status:'reserved'});
  }else if(['submit_refund','complete_refund','release_refund'].includes(type)){
   const r=next.refunds.find(r=>r.id===payload.refundId);if(!r)fail('Refund reservation unavailable');
   text(payload.reference,'refund evidence');
   if(type==='submit_refund'){if(r.status!=='reserved')fail('Refund is not reserved');r.status='submitted';r.submissionReference=payload.reference;r.submittedAt=at;}
   if(type==='complete_refund'){if(r.status!=='submitted')fail('Confirm submission before completion');r.status='completed';r.completionReference=payload.reference;r.completedAt=at;}
   if(type==='release_refund'){if(r.status!=='reserved')fail('Submitted or uncertain refunds cannot release reserved money');r.status='released';r.releaseReference=payload.reference;}
  }else fail('Unsupported cancellation action');
 }
 next.version++;next.events.push({key,type,payload:structuredClone(payload),actorId,at});return freeze(next);
}
