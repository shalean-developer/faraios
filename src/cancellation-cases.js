import {randomUUID} from 'node:crypto';
import {cancellationEvent,cancellationPolicyVersion} from './cancellation-review.js';
import {parseRand} from './earnings.js';
import {escapeHtml as esc,moduleHeading,feedback} from './workspace-layout.js';
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n/100);
const field=(name,label,value='',type='text',required=true)=>{const id='cancel-'+name+'-'+randomUUID();return `<label for="${esc(id)}">${esc(label)}</label><input id="${esc(id)}" name="${esc(name)}" type="${type}" value="${esc(value)}"${required?' required':''}>`;};
const select=(name,label,options,selected)=>`<label for="cancel-${esc(name)}">${esc(label)}</label><select id="cancel-${esc(name)}" name="${esc(name)}">${selected!==undefined&&!options.some(([v])=>v===selected)?'<option value="" selected>Choose again</option>':''}${options.map(([v,l])=>`<option value="${esc(v)}"${v===selected?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
const localTime=value=>new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(value))+' SAST';
export async function listCancellationCases(client,businessId){
 const {data,error}=await client.from('cancellation_review_cases').select('*').eq('business_id',businessId).order('created_at',{ascending:false}).limit(100);
 if(error||!Array.isArray(data)||data.some(r=>r.business_id!==businessId))throw new Error('Cancellation reviews unavailable');return data;
}
export async function readCancellationCase(client,businessId,caseId){
 const {data,error}=await client.from('cancellation_review_cases').select('*').eq('business_id',businessId).eq('id',caseId);
 if(error||data?.length!==1||data[0].business_id!==businessId)return null;
 const row=data[0],{data:events,error:eventError}=await client.from('cancellation_review_events').select('*').eq('business_id',businessId).eq('case_id',caseId).order('version');
 if(eventError||!Array.isArray(events)||events.length!==row.version)throw new Error('Incomplete cancellation history — review required');
 let state=null;
 for(const e of events){
  if(e.business_id!==businessId||e.case_id!==caseId||e.version!==(state?.version??0)+1)throw new Error('Cancellation history scope mismatch');
  state=cancellationEvent(state,{businessId,actorId:e.actor_id,role:e.actor_role,expectedVersion:e.version-1,key:e.event_key,type:e.event_type,payload:e.payload,at:new Date(e.created_at).toISOString()});
 }
 return {...row,state};
}
const date=(f,name)=>{const value=f.get(name);if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value??''))throw new Error('Record '+name+' in Johannesburg time');return value+':00+02:00';};
export function cancellationInput(form,booking){
 if(booking.time_zone!=='Africa/Johannesburg')throw new Error('This policy requires a Johannesburg booking');
 const amount=name=>parseRand(form.get(name));
 const stage=form.get('stage'),stageTimes={};
 for(const name of ['accepted','travelling','arrived','started'].slice(0,['accepted','travelling','arrived','started'].indexOf(stage)+1))stageTimes[name]=date(form,name+'_at');
 const ids=booking.assigned_staff;
 if(!ids?.length)throw new Error('An accepted assigned team is required');
 return {policyVersion:cancellationPolicyVersion,agreementKind:form.get('new_terms')==='yes'?'new_accepted':'existing',acceptanceEvidence:form.get('acceptance_evidence'),cause:form.get('cause'),action:form.get('case_action'),stage,stageTimes,
  originalStart:booking.starts_at,requestedAt:date(form,'requested_at'),accessConfirmedAt:stage==='accepted'?null:date(form,'access_at'),
  workers:ids.map(id=>({id,agreedCents:amount('pay_'+id),expenseCents:amount('expense_'+id)})),eligibleLabourCents:amount('eligible'),reasonableLossCents:amount('loss'),verifiedReceiptsCents:amount('receipts'),performedServiceCents:amount('performed'),completedRefundsCents:amount('refunded'),pendingRefundsCents:amount('pending'),reviewedCustomerFeeCents:amount('fee'),collectedPoolCents:amount('pool'),mandatoryRightsReviewed:form.get('rights')==='yes',feeMustBeWaived:form.get('waive')==='yes',
  holidays:form.get('calendar_reviewed')==='yes'?(form.get('holidays')??'').split(',').map(s=>s.trim()).filter(Boolean):null,
  ...(form.get('case_action')==='reschedule'?{newDateAccepted:form.get('replacement_accepted')==='yes',newStart:date(form,'new_start'),newAgreedTotalCents:amount('replacement_total'),newAgreementEvidence:form.get('replacement_evidence')}:{})};
}
export async function appendCancellationCase(client,{businessId,booking,record,form}){
 const type=form.get('action'),expectedVersion=Number(form.get('version'));
 if(!/^(0|[1-9]\d*)$/.test(form.get('version')??''))throw new Error('Invalid cancellation version');
 const {data:identity,error:identityError}=await client.auth.getUser();if(identityError||!identity?.user)throw new Error('Sign in again');
 const {data:members,error:memberError}=await client.from('business_memberships').select('role,status').eq('business_id',businessId).eq('user_id',identity.user.id).eq('status','active');
 if(memberError||members?.length!==1)throw new Error('Cancellation access denied');
 const role=members[0].role,key=form.get('event_key');let payload;
 if(type==='prepare')payload=cancellationInput(form,booking);
 else if(type==='approve')payload={reason:form.get('reason')};
 else if(type==='acknowledge')payload={reference:form.get('reference')};
 else if(type==='reserve_refund')payload={amountCents:parseRand(form.get('amount')),receiptReference:form.get('receipt_reference'),route:form.get('route'),originalRoute:form.get('original_route'),exceptionReason:form.get('exception_reason')};
 else payload={refundId:form.get('refund_id'),reference:form.get('reference')};
 cancellationEvent(record?.state??null,{businessId,actorId:identity.user.id,role,expectedVersion,key,type,payload,at:new Date().toISOString()});
 const {data,error}=await client.rpc('append_cancellation_review',{p_business_id:businessId,p_booking_id:booking?.id??record?.booking_id,p_case_id:record?.id??null,p_version:expectedVersion,p_key:key,p_type:type,p_payload:payload});
 if(error){const e=new Error(error.code==='40001'?'Case changed; reopen before saving':'Cancellation review could not be saved');e.status=error.code==='40001'?409:422;throw e;}return data;
}

export function renderCancellationCases(business,{rows=[],booking=null,record=null,owner=false,message='',error=false,values=null}={}){
 const base='/cancellations?business='+encodeURIComponent(business.id);
 const input=(name,label,value='',type='text',required=true)=>field(name,label,values?.get(name)??value,type,required);
 const choose=(name,label,options)=>select(name,label,options,values?.get(name));
 let html=moduleHeading({title:'Cancellation reviews',business,description:'Review the original visit, customer credit and cleaner protection before any financial action.'})+feedback(message,error)+'<p class="scope">Staging review only. Refund events are recorded simulations. No money is sent, no earnings are posted and booking status is unchanged.</p>';
 const form=(action,body)=>`<form class="settings-form panel" method="post" action="${base}${record?'&amp;case='+esc(record.id):'&amp;booking='+esc(booking.id)}"><input type="hidden" name="action" value="${action}"><input type="hidden" name="version" value="${record?.version??0}"><input type="hidden" name="event_key" value="${randomUUID()}">${body}</form>`;
 if(record){
  const s=record.state,r=s.result;
  const reserved=s.refunds.filter(refund=>refund.status!=='released').reduce((total,refund)=>total+refund.amountCents,0);
  html+=`<section class="panel"><h2>${esc(s.status)}</h2><p>Saved original start: ${esc(localTime(s.input.originalStart))} · Request: ${esc(localTime(s.input.requestedAt))}</p><p>${r.late?'Less than 24 hours':'At least 24 hours'} notice · ${esc(r.cause)} request · ${esc(r.stage)}</p><dl><dt>Reviewed customer charge</dt><dd>${money(r.customerFeeCents)}</dd><dt>Uncollected balance — no debit made</dt><dd>${money(r.customerBalanceDueCents)}</dd><dt>Reviewed ceiling</dt><dd>${money(r.feeCeilingCents)}</dd><dt>Cleaner compensation</dt><dd>${money(r.compensationTotalCents)} — ${r.companyFunded?'company-funded':'collected customer pool'}</dd><dt>Separate approved expenses</dt><dd>${money(r.expenseTotalCents)}</dd><dt>Refund available at assessment</dt><dd>${money(r.refundableCents)}</dd>${r.creditCents!==null?`<dt>Replacement credit</dt><dd>${money(r.creditCents)}</dd><dt>New balance</dt><dd>${money(r.newBalanceCents)}</dd>`:''}<dt>Review target</dt><dd>${esc(r.reviewTargetDate)}</dd><dt>Approved submission target</dt><dd>${esc(r.submissionTargetDate)}</dd></dl><p>${esc(r.independentEntitlements)}</p></section>`;
  html+='<section class="panel"><h2>Cleaner breakdown</h2><dl>'+s.input.workers.map((worker,index)=>`<dt>Cleaner ${index+1} · ${esc(worker.id.slice(0,8))}</dt><dd>Agreed: ${money(worker.agreedCents)} · Compensation: ${money(r.compensation.find(row=>row.id===worker.id.toLowerCase()).amountCents)} · Separate expenses: ${money(worker.expenseCents)}</dd>`).join('')+'</dl></section>';
  html+=`<p>Available for another refund reservation: <strong>${money(r.refundableCents-reserved)}</strong></p>`;
  if(owner&&!s.acknowledgedAt)html+=form('acknowledge','<h2>Acknowledge request</h2>'+input('reference','Acknowledgement evidence')+'<button>Record acknowledgement</button>');
  if(owner&&s.status==='prepared')html+=form('approve','<h2>Owner review</h2>'+input('reason','Review evidence and approval reason')+'<button>Approve staging assessment</button>');
  if(owner&&s.status==='approved'&&r.refundableCents>0)html+=form('reserve_refund','<h2>Reserve a simulated refund</h2>'+input('amount','Refund amount (R)')+input('receipt_reference','Verified original payment reference')+input('route','Refund route')+input('original_route','Original payment route')+input('exception_reason','Reason if using a different route','','text',false)+'<button>Reserve simulated refund</button>');
  for(const refund of s.refunds){html+=`<section class="panel"><h2>Refund ${money(refund.amountCents)}</h2><p>${esc(refund.status)} · ${esc(refund.route)}</p></section>`;if(owner&&['reserved','submitted'].includes(refund.status)){
   const action=refund.status==='reserved'?'submit_refund':'complete_refund';html+=form(action,`<input type="hidden" name="refund_id" value="${esc(refund.id)}">`+input('reference',refund.status==='reserved'?'Simulated submission reference':'Simulated completed receipt evidence')+`<button>Record simulated ${refund.status==='reserved'?'submission':'completion'}</button>`);
   if(refund.status==='reserved')html+=form('release_refund',`<input type="hidden" name="refund_id" value="${esc(refund.id)}">`+input('reference','Evidence that nothing was submitted')+'<button>Release unused reservation</button>');
  }}
  html+='<section class="panel"><h2>History</h2>'+s.events.map(e=>`<p>${esc(localTime(e.at))} · ${esc(e.type)} · ${esc(e.actorId)}</p>`).join('')+'</section>';
 }else if(booking){
  html+=`<p>${esc(booking.customer_snapshot.name)} · Original start ${esc(localTime(booking.starts_at))} · ${money(booking.total_cents)}</p>`;
  let fields='<h2>Prepare assessment</h2>'+choose('cause','Who requested the change?',[['customer','Customer'],['business','Business']])+choose('case_action','Requested action',[['cancel','Cancel visit'],['reschedule','Reschedule original slot']])+choose('stage','Dispatch stage at request',[['accepted','Accepted, before travel'],['travelling','Travelling'],['arrived','Arrived'],['started','Work started']])+input('requested_at','Request received — Johannesburg time','','datetime-local')+input('accepted_at','Cleaner acceptance — Johannesburg time','','datetime-local');
  for(const [name,label] of [['travelling_at','Departure'],['arrived_at','Arrival'],['started_at','Work started'],['access_at','Customer access confirmed']])fields+=input(name,label+' — fill when applicable','','datetime-local',false);
  fields+=choose('new_terms','Prospective cancellation terms accepted?',[['','Choose'],['yes','Yes, supported by evidence'],['no','No / existing terms — hold']])+input('acceptance_evidence','Accepted terms evidence');
  for(const [index,id] of (booking.assigned_staff??[]).entries())fields+='<fieldset><legend>Assigned cleaner '+(index+1)+' · '+esc(id.slice(0,8))+'</legend>'+input('pay_'+id,'Recorded agreed earnings (R)')+input('expense_'+id,'Approved nonduplicated expenses (R)')+'</fieldset>';
  for(const [name,label] of [['eligible','Eligible booked labour after discounts'],['loss','Supported loss after mitigation'],['receipts','Verified receipts'],['performed','Value of services already performed'],['refunded','Completed previous refunds'],['pending','Previous pending refunds'],['fee','Reviewed customer cancellation charge'],['pool','Collected compensation after required tax']])fields+=input(name,label+' (R)');
  fields+=choose('rights','Mandatory and stronger customer rights reviewed?',[['','Choose'],['yes','Yes'],['no','No — hold']])+choose('waive','Must the customer fee be waived?',[['no','No'],['yes','Yes']])+choose('calendar_reviewed','Applicable holiday calendar reviewed?',[['','Choose'],['yes','Yes']])+input('holidays','Excluded holiday dates, comma-separated (YYYY-MM-DD)','','text',false);
  fields+='<fieldset><legend>Replacement visit — rescheduling only</legend>'+input('new_start','Accepted new start — Johannesburg time','','datetime-local',false)+input('replacement_total','Accepted new total (R)','','text',false)+input('replacement_evidence','Accepted replacement date and price evidence','','text',false)+choose('replacement_accepted','Customer accepted replacement?',[['no','No'],['yes','Yes']])+'</fieldset><button>Prepare staging assessment</button>';
  html+=form('prepare',fields);
 }else html+='<section class="panel"><h2>Saved reviews</h2>'+rows.map(row=>`<p><a href="${base}&amp;case=${esc(row.id)}">Review ${esc(row.id.slice(0,8))}</a> · v${row.version}</p>`).join('')+'<p>Open a booking to prepare a cancellation review. Existing terms remain protected.</p></section>';
 return html;
}
