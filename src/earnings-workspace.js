import {randomUUID} from 'node:crypto';
import {parseRand} from './earnings.js';
import {escapeHtml as esc,moduleHeading,feedback} from './workspace-layout.js';
const money=c=>'R '+(c/100).toFixed(2);
export async function earningsOperation(client,action,input){
 const {data,error}=await client.rpc('t22_earnings',{action,input});
 if(error){const e=new Error('Earnings action rejected. Check saved rules, agreement, team, completion and evidence. Existing amounts remain unchanged.');e.status=422;throw e;}
 return data;
}
export function earningsFormInput(form,businessId,context){
 if(!context)throw new Error('Open the booking before recording earnings');
 const action=form.get('action');
 const common={businessId,bookingId:context.bookingId};
 if(action==='agree'){
  const result={...common,agreementId:form.get('agreementId'),kind:form.get('kind'),originalPeriod:form.get('originalPeriod'),agreementEvidence:form.get('agreementEvidence'),entitlementEvidence:form.get('entitlementEvidence')};
  if(result.kind==='new'){
   if(!context.savedRule)throw new Error('Saved business rule required');
   const version=form.get('ruleVersion');if(!/^[1-9]\d{0,8}$/.test(version??''))throw new Error('Saved rule version required');
   return {...result,serviceId:context.savedRule.service_id,ruleVersion:Number(version),eligibleCents:context.savedRule.model==='fixed_per_worker'?0:parseRand(form.get('eligible'))};
  }
  if(!['existing','recurring'].includes(result.kind))throw new Error('Choose the verified agreement kind');
  const version=form.get('originalVersion');if(!/^[1-9]\d{0,8}$/.test(version??''))throw new Error('Original agreement version required');
  return {...result,originalVersion:Number(version),workers:context.assignedStaff.map(userId=>({userId,amountCents:parseRand(form.get('worker_'+userId))}))};
 }
 if(action==='accrue'){
  if(!context.agreement)throw new Error('Saved agreement required');
  return {...common,agreementId:context.agreement.id,requestId:form.get('requestId'),completionEvidence:form.get('completionEvidence'),entitlementEvidence:form.get('entitlementEvidence')};
 }
 throw new Error('Unsupported earnings action');
}
export function renderEarningsWorkspace(business,{rows=[],context=null,owner=false,page=0,error='',values=null}={}){
 const root='/earnings?business='+encodeURIComponent(business.id),hidden=(name,value)=>`<input type="hidden" name="${name}" value="${esc(value)}">`;
 const input=(name,label,{value='',type='text',max=2000}={})=>`<label for="t22_${esc(name)}">${esc(label)}</label><input id="t22_${esc(name)}" name="${esc(name)}" type="${type}" value="${esc(values?.get(name)??value)}" maxlength="${max}" required>`;
 const target=root+(context?'&amp;booking='+encodeURIComponent(context.bookingId):'');
 const form=(action,body)=>`<form class="settings-form" method="post" action="${target}">${hidden('action',action)}${body}</form>`;
 let html=moduleHeading({title:'Earnings',business,description:'Save verified worker agreements, then record completed-work accrual separately from customer payments.'})+feedback(error,Boolean(error))+
 '<p class="scope">SYNTHETIC STAGING ONLY. These records do not activate real worker liabilities, payments or payouts. Existing and recurring agreements keep their original verified amounts. Customer payment alone never creates earnings.</p>'+
 `<section class="panel"><form method="get" action="/earnings">${hidden('business',business.id)}${input('booking','Booking ID')}<button>Open booking earnings</button></form></section>`;
 if(!context){
  return html+'<section class="panel"><h2>Saved agreements</h2>'+rows.map(row=>`<article><h3>Booking ${esc(row.bookingId)}</h3><p>${esc(row.kind)} · Original period ${esc(row.originalPeriod)} · ${row.accrued?'Accrued — synthetic':'Agreement saved; not accrued'}</p>${row.workers.map(w=>`<p>Cleaner ${esc(w.userId)}: ${money(w.amountCents)}</p>`).join('')}<a href="${root}&amp;booking=${encodeURIComponent(row.bookingId)}">Open agreement and evidence</a></article>`).join('')+(rows.length?'':'<p>No saved agreements on this page.</p>')+(page?`<a href="${root}&amp;page=${page-1}">Previous page</a>`:'')+(rows.length===100?` <a href="${root}&amp;page=${page+1}">Next page</a>`:'')+'</section>';
 }
 html+=`<section class="panel"><h2>Booking ${esc(context.bookingId)}</h2><p>Service: ${esc(context.status)} · ${context.durationMinutes} minutes · ${context.assignedStaff.length} assigned cleaners</p></section>`;
 const agreement=context.agreement;
 if(agreement){
  html+=`<section class="panel"><h2>Verified agreement</h2><p>${esc(agreement.request.kind)} · Original period ${esc(agreement.request.originalPeriod)} · Version ${esc(agreement.request.originalVersion??agreement.request.ruleVersion)}</p><p>Verified by ${esc(agreement.actor_id)} at ${esc(agreement.created_at)}</p><p>${esc(agreement.request.agreementEvidence)}</p><p>${esc(agreement.request.entitlementEvidence)}</p>${agreement.rule_snapshot?`<p>Saved rule: ${esc(agreement.rule_snapshot.model)} · ${esc(agreement.rule_snapshot.basis_definition||'Fixed per cleaner')} · ${esc(agreement.rule_snapshot.rounding||'Integer cents')}</p>`:''}${agreement.workers.map(w=>`<article><h3>Cleaner ${esc(w.userId)}</h3><p>Original agreed amount: ${money(w.amountCents)}</p>${context.accrual?`<a href="/earnings-adjustments?business=${encodeURIComponent(business.id)}&amp;source=${encodeURIComponent(w.sourceId)}">Corrections and history for this cleaner</a>`:''}</article>`).join('')}</section>`;
  if(context.accrual)html+=`<section class="panel"><h2>Accrued — synthetic</h2><p>Recorded by ${esc(context.accrual.actor_id)} at ${esc(context.accrual.created_at)}</p><p>${esc(context.accrual.request.completionEvidence)}</p><p>${esc(context.accrual.request.entitlementEvidence)}</p><p>Each cleaner’s immutable original source is linked above. Corrections are separate; this is not a paid status or transfer.</p></section>`;
  else if(owner&&context.status==='completed')html+='<section class="panel"><h2>Verify completed-work entitlement</h2>'+form('accrue',hidden('requestId',values?.get('requestId')??randomUUID())+input('completionEvidence','Completed scope evidence',{max:1800})+input('entitlementEvidence','Independent worker entitlement verification')+'<button>Record synthetic accrual once</button>')+'</section>';
  else html+='<p>Accrual requires owner verification of completed work and independent entitlement.</p>';
 }else if(owner&&context.assignedStaff.length&&context.status!=='cancelled'){
  const kind=values?.get('kind')??(context.recurring?'recurring':'existing');
  html+='<section class="panel"><h2>Record a verified agreement</h2><p>For protected terms, enter each cleaner’s verified original amount, including an explicit zero when evidenced. For a prospective new agreement, choose the saved rule and manually review eligible labour excluding fees, tax, equipment and transport. Never deduct processing fees. Confirm all worker terms and full-pay applicability separately.</p>'+form('agree',hidden('agreementId',values?.get('agreementId')??randomUUID())+
   '<label for="t22_kind">Agreement kind</label><select id="t22_kind" name="kind" required>'+[['existing','Existing protected agreement'],['recurring','Recurring protected agreement'],...(!context.recurring&&['draft','confirmed','assigned'].includes(context.status)&&context.savedRule?[['new','Prospective new agreement using saved rule']]:[])].map(([v,label])=>`<option value="${v}"${kind===v?' selected':''}>${label}</option>`).join('')+'</select>'+
   input('originalPeriod','Verified original earnings period (YYYY-MM)',{max:7})+input('agreementEvidence','Worker agreement and scope evidence')+input('entitlementEvidence','Full-pay and entitlement applicability review')+
   '<fieldset><legend>Protected agreement amounts (used for existing or recurring terms)</legend>'+input('originalVersion','Verified original agreement version',{type:'number',value:values?.get('originalVersion')??''}).replace(' required>','>')+context.assignedStaff.map(userId=>input('worker_'+userId,'Original agreed amount (R) for '+userId).replace(' required>','>')).join('')+'</fieldset>'+
   (context.savedRule?`<fieldset><legend>Prospective saved rule v${esc(context.savedRule.version)}</legend>${hidden('ruleVersion',context.savedRule.version)}<p>${esc(context.savedRule.model)} · ${esc(context.savedRule.basis_definition||'Fixed per cleaner')}</p>${context.savedRule.model==='percentage_pool'?input('eligible','Reviewed eligible labour (R)').replace(' required>','>'):''}</fieldset>`:'')+
   '<button>Save verified synthetic agreement</button>')+'</section>';
 }else html+='<p>Owner verification and an assigned team are required to save an agreement.</p>';
 return html;
}
