import {randomUUID} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {earningsAdjustmentEvent} from './earnings-adjustments.js';
import {parseRand} from './earnings.js';
import {escapeHtml as esc,moduleHeading,feedback} from './workspace-layout.js';
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n/100);
export async function listAdjustmentSources(client,businessId){
 const rows=[];for(let start=0;;start+=500){const {data,error}=await client.from('adjustment_review_sources').select('*').eq('business_id',businessId).order('id').range(start,start+499);if(error||!Array.isArray(data)||data.some(x=>x.business_id!==businessId||!x.synthetic_only))throw new Error('Adjustment reviews unavailable');rows.push(...data);if(data.length<500)return rows;}
}
export async function readAdjustmentSource(client,businessId,sourceId){
 const {data,error}=await client.from('adjustment_review_sources').select('*').eq('business_id',businessId).eq('id',sourceId);
 if(error||!Array.isArray(data))throw new Error('Adjustment source unavailable');if(data.length!==1)return null;
 const row=data[0];if(row.business_id!==businessId||row.id!==sourceId||!row.synthetic_only)throw new Error('Adjustment source scope mismatch');
 const events=[];for(let start=0;;start+=500){const {data,error}=await client.from('adjustment_review_events').select('*').eq('business_id',businessId).eq('source_id',sourceId).order('version').range(start,start+499);if(error||!Array.isArray(data))throw new Error('Adjustment history unavailable');events.push(...data);if(data.length<500)break;}
 if(events.length!==row.version||!row.version)throw new Error('Incomplete adjustment history');let state=null;
 for(const e of events){if(e.business_id!==businessId||e.source_id!==sourceId||e.version!==(state?.version??0)+1)throw new Error('Adjustment history scope mismatch');state=earningsAdjustmentEvent(state,{businessId,actorId:e.actor_id,role:e.actor_role,expectedVersion:e.version-1,key:e.event_key,type:e.event_type,payload:e.payload,at:new Date(e.created_at).toISOString()});}
 if(state.sources.length!==1||state.sources[0].id!==row.id||state.sources[0].revision!==row.revision||!isDeepStrictEqual(events[0].payload,row.original_payload))throw new Error('Adjustment source history mismatch');return {...row,state};
}
// Review amounts are deliberately separate from accrued earnings and settlement.
export function teamEarningsReview(records,businessId){
 const seen=new Set();
 return records.map(record=>{
  if(record.business_id!==businessId||!record.synthetic_only||record.state?.businessId!==businessId||record.state.sources.length!==1)throw new Error('Team review scope mismatch');
  const source=record.state.sources[0];
  if(source.id!==record.id||source.workerId!==record.worker_id||source.bookingId!==record.booking_id||seen.has(source.id))throw new Error('Team review source mismatch');
  seen.add(source.id);
  const approved=record.state.adjustments.filter(a=>a.status==='approved');
  const sum=values=>{const n=values.reduce((a,b)=>a+b,0);if(!Number.isSafeInteger(n)||Math.abs(n)>2147483647)throw new Error('Review amount exceeds supported limit');return n;};
  return {sourceId:source.id,bookingId:source.bookingId,workerId:source.workerId,originalCents:source.originalCents,
   reviewedCents:sum([source.originalCents,...approved.filter(a=>a.kind!=='reimbursement').map(a=>a.deltaCents)]),
   reimbursementCents:sum(approved.filter(a=>a.kind==='reimbursement').map(a=>a.deltaCents)),
   disputed:record.state.adjustments.some(a=>a.disputed),pending:record.state.adjustments.filter(a=>a.status==='proposed').length};
 });
}
const signedRand=v=>{const s=String(v??'').trim();return s.startsWith('-')?-parseRand(s.slice(1)):parseRand(s);};
export function adjustmentPayload(form,{businessId,booking,record}){
 const type=form.get('action'),adjustmentId=form.get('adjustment_id');
 if(type==='register_source'){
  if(!booking||booking.business_id!==businessId)throw new Error('Choose a booking in this business');const workerId=form.get('worker_id');
  if(!booking.assigned_staff?.includes(workerId))throw new Error('Choose an assigned cleaner');
  if(!/^[1-9]\d{0,8}$/.test(form.get('original_version')??''))throw new Error('Record original version');
  return{sourceId:form.get('source_id'),bookingId:booking.id,workerId,originalVersion:Number(form.get('original_version')),originalCents:parseRand(form.get('original_amount')),originalPeriod:form.get('original_period'),agreementEvidence:form.get('agreement_evidence'),originalRecordEvidence:form.get('original_evidence')};
 }
 if(!record)throw new Error('Choose a source review');
 if(type==='propose')return{sourceId:record.id,kind:form.get('kind'),deltaCents:signedRand(form.get('delta')),reason:form.get('reason'),evidence:form.get('evidence'),occurrenceReference:form.get('occurrence'),...(form.get('rule_evidence')?{approvedRuleEvidence:form.get('rule_evidence')}:{}),...(form.get('supersedes')?{supersedesId:form.get('supersedes')}:{} )};
 if(type==='approve')return{adjustmentId,reason:form.get('reason'),originalVerificationEvidence:form.get('original_verification'),entitlementReviewEvidence:form.get('entitlement_review'),...(form.get('lawful_basis')?{lawfulBasisEvidence:form.get('lawful_basis')}:{}),...(form.get('required_agreement')?{requiredAgreementEvidence:form.get('required_agreement')}:{}),...(form.get('fair_process')?{fairProcessEvidence:form.get('fair_process')}:{}),...(form.get('rule_verification')?{approvedRuleVerification:form.get('rule_verification')}:{} )};
 if(['raise_dispute','request_review'].includes(type))return{adjustmentId,reason:form.get('reason'),evidence:form.get('evidence')};
 if(type==='resolve_dispute')return{adjustmentId,reason:form.get('reason'),workerReviewEvidence:form.get('worker_review')};
 if(type==='reject')return{adjustmentId,reason:form.get('reason')};
 if(type==='freeze_review')return{adjustmentId,reference:form.get('reference')};
 if(type==='simulate_settlement')return{adjustmentId,reference:form.get('reference'),amountCents:signedRand(form.get('amount'))};
 throw new Error('Unsupported adjustment action');
}
export async function appendAdjustmentReview(client,{businessId,booking,record,form,role,userId}){
 if(!/^(0|[1-9]\d{0,8})$/.test(form.get('version')??''))throw new Error('Invalid review version');
 const type=form.get('action'),payload=adjustmentPayload(form,{businessId,booking,record}),version=Number(form.get('version')),key=form.get('event_key');
 earningsAdjustmentEvent(record?.state??null,{businessId,actorId:userId,role,key,expectedVersion:version,type,payload,at:new Date().toISOString()});
 const {data,error}=await client.rpc('append_earnings_adjustment',{p_business_id:businessId,p_source_id:record?.id??payload.sourceId,p_version:version,p_key:key,p_type:type,p_payload:payload});
 if(error){const e=new Error(error.code==='40001'?'History changed; reopen before saving':'Adjustment could not be saved; review evidence and scope');e.status=error.code==='40001'?409:422;throw e;}return data;
}
export function renderAdjustmentReviews(business,{rows=[],team=[],booking=null,record=null,role='manager',message='',error=false,values=null}={}){
 const root='/earnings-adjustments?business='+encodeURIComponent(business.id),owner=role==='owner',staff=role==='staff';
 const input=(name,label,{value='',required=true,type='text'}={})=>{const id=randomUUID();return `<label for="${id}">${esc(label)}</label><input id="${id}" name="${esc(name)}" type="${type}" value="${esc(values?.get(name)??value)}"${required?' required':''} maxlength="2000">`;};
 const select=(name,label,choices)=>{const id=randomUUID(),selected=values?.get(name)??'';return `<label for="${id}">${esc(label)}</label><select id="${id}" name="${name}" required><option value="">Choose</option>${choices.map(([v,l])=>`<option value="${esc(v)}"${selected===v?' selected':''}>${esc(l)}</option>`).join('')}</select>`;};
 const form=(action,title,body,adjustmentId='')=>`<form class="panel settings-form" method="post" action="${root}${record?'&amp;source='+esc(record.id):'&amp;booking='+esc(booking.id)}"><h2>${esc(title)}</h2><input type="hidden" name="action" value="${action}"><input type="hidden" name="version" value="${record?.version??0}"><input type="hidden" name="event_key" value="${randomUUID()}">${adjustmentId?`<input type="hidden" name="adjustment_id" value="${esc(adjustmentId)}">`:''}${body}</form>`;
 let html=moduleHeading({title:'Earnings adjustments',business,description:'Review linked corrections while preserving original earnings.'})+feedback(message,error)+'<p class="scope">Synthetic staging review only. Amounts and evidence here do not create earned pay, mark a real payment paid or send money. Actual agreements and full pay obligations need separate verification.</p>';
 if(record){const s=record.state.sources[0];html+=`<section class="panel"><h2>Original source</h2><p>Booking ${esc(s.bookingId)} · Cleaner ${esc(s.workerId)}</p><dl><dt>Original amount</dt><dd>${money(s.originalCents)}</dd><dt>Original version / period</dt><dd>v${s.originalVersion} · ${esc(s.originalPeriod)}</dd></dl><p>${esc(s.originalRecordEvidence)}</p><p>${esc(s.agreementEvidence)}</p></section>`;
  for(const a of record.state.adjustments){html+=`<section class="panel"><h2>${esc(a.kind.replaceAll('_',' '))} · ${money(a.deltaCents)}</h2><p>${esc(a.status)}${a.disputed?' · Disputed':''}${a.frozen?' · Review frozen':''}${a.simulation?' · Simulated only':''}</p><p>Original period ${esc(a.originalPeriod)} · Reference ${esc(a.id)}</p><dl><dt>Reviewed previous amount</dt><dd>${money(a.oldCents)}</dd><dt>Reviewed new amount</dt><dd>${money(a.newCents)}</dd></dl><p>${esc(a.reason)}</p><p>${esc(a.evidence)}</p>${a.supersedesId?`<p>Replaces rejected proposal ${esc(a.supersedesId)}</p>`:''}</section>`;
   html+=form('raise_dispute','Request worker review',input('reason','Review reason')+input('evidence','Review evidence')+'<button>Record review request</button>',a.id);
   if(owner){if(a.disputed)html+=form('resolve_dispute','Resolve review request',input('reason','Resolution reason')+input('worker_review','Worker review evidence')+'<button>Record resolution</button>',a.id);
    if(a.status==='proposed'){if(!a.disputed)html+=form('approve','Owner approval',input('reason','Approval reason')+input('original_verification','Original amount and version verification')+input('entitlement_review','Full pay and entitlement review')+(a.deltaCents<0?input('lawful_basis','Verified lawful basis')+input('required_agreement','Required specific agreement evidence')+input('fair_process','Fair process evidence'):'')+(a.kind==='additional_agreed_work'?input('rule_verification','Approved rule and cap verification'):'')+'<button>Approve synthetic correction</button>',a.id);html+=form('reject','Reject proposal',input('reason','Rejection reason')+'<button>Reject proposal</button>',a.id);}
    if(a.status==='approved'&&!a.disputed&&!a.simulation){html+=form('freeze_review','Freeze reviewed correction',input('reference','Review reference')+'<button>Freeze review</button>',a.id);if(a.frozen)html+=form('simulate_settlement','Correction-only simulation',`<p>Only ${money(a.deltaCents)} is simulated; the original is excluded.</p><input type="hidden" name="amount" value="${(a.deltaCents/100).toFixed(2)}">`+input('reference','Simulation reference')+'<button>Record simulation — no money sent</button>',a.id);}
   }
  }
  if(!staff)html+=form('propose','Prepare a linked correction',select('kind','Correction reason type',[['calculation_correction','Calculation correction'],['reimbursement','Reimbursement'],['additional_agreed_work','Additional agreed work']])+input('delta','Correction amount (R); minus sign for reviewed reduction')+input('occurrence','Unique source occurrence reference')+input('reason','Correction reason')+input('evidence','Correction evidence')+input('rule_evidence','Approved additional-work rule evidence',{required:false})+input('supersedes','Rejected proposal ID being replaced',{required:false})+'<button>Prepare synthetic correction</button>');
  html+='<section class="panel"><h2>Audit history</h2>'+record.state.events.map(e=>`<article><p>${esc(new Intl.DateTimeFormat('en-ZA',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Johannesburg'}).format(new Date(e.at)))} SAST · ${esc(e.type)} · ${esc(e.actorId)}</p><dl>${Object.entries(e.payload).map(([key,value])=>`<dt>${esc(key.replace(/([A-Z])/g," $1").replace(/^./,c=>c.toUpperCase()))}</dt><dd>${esc(value)}</dd>`).join('')}</dl></article>`).join('')+'</section>';
 }else if(booking&&!staff){html+=`<p>Synthetic source for booking ${esc(booking.id)}. Enter evidence-labelled example amounts; blanks remain unknown.</p>`+form('register_source','Register synthetic source',`<input type="hidden" name="source_id" value="${esc(values?.get('source_id')??randomUUID())}">`+select('worker_id','Assigned cleaner',(booking.assigned_staff??[]).map(id=>[id,id]))+input('original_amount','Original example earnings (R)')+input('original_version','Original version',{type:'number'})+input('original_period','Original period (YYYY-MM, Johannesburg)')+input('agreement_evidence','Example agreement evidence')+input('original_evidence','Example original earnings evidence')+'<button>Register synthetic source</button>');
 }else html+='<section class="panel"><h2>Saved synthetic sources</h2>'+rows.map(s=>`<p><a href="${root}&amp;source=${esc(s.id)}">Review ${esc(s.id.slice(0,8))}</a> · Cleaner ${esc(s.worker_id.slice(0,8))} · v${s.version}</p>`).join('')+(staff?'<p>Only your own linked sources are visible. Use a review request to dispute an amount.</p>':'<p>Open a booking to register a synthetic source for an assigned cleaner.</p>')+'</section>';
 if(!record&&!booking&&team.length)html+='<section class="panel"><h2>Team earnings review</h2><p>Synthetic source amounts, not accrued pay or payout balances. Reviewed earnings include approved corrections, including disputed corrections still awaiting resolution. Reimbursements remain separate. A zero or disputed worker amount does not block another worker’s review.</p>'+team.map(row=>`<article><h3>Cleaner ${esc(row.workerId)}</h3><p>Booking ${esc(row.bookingId)}</p><dl><dt>Original agreed example</dt><dd>${money(row.originalCents)}</dd><dt>Reviewed earnings example</dt><dd>${money(row.reviewedCents)}</dd><dt>Approved reimbursements</dt><dd>${money(row.reimbursementCents)}</dd><dt>Review status</dt><dd>${row.disputed?'Disputed — review separately':'No open adjustment dispute'} · ${row.pending} pending proposals</dd></dl><a href="${root}&amp;source=${esc(row.sourceId)}">Explanation and history</a></article>`).join('')+'</section>';
 return html;
}
