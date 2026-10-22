import {parseRand} from './earnings.js';
import {moduleHeading,feedback,escapeHtml as esc} from './workspace-layout.js';

const MAX=2147483647;
const validId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const money=cents=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(cents/100);
const columns='business_id,user_id,version,effective_month,enabled,amount_cents,change_reason,actor_user_id,created_at';

export function allowanceMonth(value){
 if(typeof value!=='string'||! /^(?:[2-9][0-9]{3})-(?:0[1-9]|1[0-2])$/.test(value))throw new Error('Choose a valid calendar month.');
 return value+'-01';
}

export function parseSupervisorAllowance(form){
 const enabled=form.get('allowance_enabled'),version=form.get('allowance_version')??'';
 if(!['yes','no'].includes(enabled)||!/^(0|[1-9][0-9]*)$/.test(version)||Number(version)>=MAX)throw new Error('Reopen the allowance settings before saving.');
 const month=allowanceMonth(form.get('effective_month'));
 const reason=(form.get('allowance_reason')??'').trim();
 if(!reason||reason.length>500)throw new Error('Enter a reason within 500 characters.');
 const amount=enabled==='yes'?parseRand(form.get('allowance_amount')):0;
 if(enabled==='yes'&&amount<=0)throw new Error('Enter a monthly allowance greater than zero.');
 return {p_version:Number(version),p_enabled:enabled==='yes',p_amount_cents:amount,p_effective_month:month,p_reason:reason};
}

export async function readSupervisorAllowances(client,businessId){
 if(!validId(businessId))throw new Error('Invalid allowance business.');
 const {data:context,error}=await client.rpc('supervisor_allowance_context',{p_business_id:businessId});
 if(error||context?.business_id!==businessId)throw new Error('Supervisor allowances unavailable.');
 const changes=[];
 for(let start=0;;start+=500){
  const {data,error:readError}=await client.from('supervisor_allowance_changes').select(columns).eq('business_id',businessId).order('user_id').order('version').range(start,start+499);
  if(readError||!Array.isArray(data)||data.some(row=>row.business_id!==businessId))throw new Error('Supervisor allowance history unavailable.');
  changes.push(...data);
  if(data.length<500)return {context,changes};
 }
}

export async function saveSupervisorAllowance(client,businessId,userId,form){
 if(!validId(businessId)||!validId(userId))throw new Error('Choose a staff account in this business.');
 const {data,error}=await client.rpc('configure_supervisor_allowance',{...parseSupervisorAllowance(form),p_business_id:businessId,p_user_id:userId});
 if(error||!Number.isInteger(data)||data<1){
  const e=new Error(error?.code==='40001'?'This allowance changed. Reopen it before saving.':error?.code==='42501'?'Allowance access denied':'Allowance could not be saved. Check the staff account, future month and amount.');
  e.status=error?.code==='40001'?409:error?.code==='42501'?403:422;throw e;
 }
 return data;
}

/** Planning only: no accrual, booking mutation, adjustment, freeze or payment. */
export function previewMonthlyEarnings({businessId,userId,month,changes,bookingCents=null}){
 if(!validId(businessId)||!validId(userId))throw new Error('Invalid allowance scope.');
 const period=allowanceMonth(month);
 if(bookingCents!==null&&(!Number.isSafeInteger(bookingCents)||bookingCents<0||bookingCents>MAX))throw new Error('Enter a supported booking earnings amount.');
 if(!Array.isArray(changes)||changes.some(row=>row.business_id!==businessId))throw new Error('Allowance scope mismatch.');
 const policy=changes.filter(row=>row.user_id===userId&&row.effective_month<=period).sort((a,b)=>b.effective_month.localeCompare(a.effective_month)||b.version-a.version)[0];
 const allowanceCents=policy?.enabled?policy.amount_cents:0;
 if(!Number.isSafeInteger(allowanceCents)||allowanceCents<0||allowanceCents>MAX)throw new Error('Allowance amount unavailable.');
 const totalCents=bookingCents===null?null:bookingCents+allowanceCents;
 if(totalCents!==null&&totalCents>MAX)throw new Error('Combined preview exceeds the supported limit.');
 return Object.freeze({kind:'preview',businessId,userId,month,bookingCents,allowanceCents,totalCents,policyVersion:policy?.version??0});
}

export function renderSupervisorAllowances(business,{context,changes,accounts,profiles=[]},{owner=false,userId=null,month=context.current_month.slice(0,7),preview=null,values=null,message='',error=false}={}){
 const root='/supervisor-allowances?business='+encodeURIComponent(business.id);
 const current=context.current_month.slice(0,7),next=context.next_month.slice(0,7);
 const recipients=new Map(accounts.map(a=>[a.user_id,{...a,active:true}]));
 for(const row of changes)if(!recipients.has(row.user_id))recipients.set(row.user_id,{user_id:row.user_id,label:profiles.find(p=>p.user_id===row.user_id)?.display_name??'Former staff account '+row.user_id.slice(-6),active:false});
 const selected=recipients.get(userId),own=changes.filter(row=>row.user_id===userId),version=Math.max(0,...own.map(row=>row.version));
 const state=(id,period)=>previewMonthlyEarnings({businessId:business.id,userId:id,month:period,changes});
 const heading=moduleHeading({title:'Supervisor allowances',business,description:'Optional monthly pay in addition to booking earnings.',back:'/earnings-rules?business='+encodeURIComponent(business.id)})+feedback(message,error);
 const note='<p class="scope">Setup and previews only. No allowance is accrued or paid here. Booking earnings stay separate. Changes start in a future month and preserve earlier periods and accepted terms.</p>';
 if(!userId)return heading+note+`<section class="panel"><h2>Staff accounts</h2><p>Allowances default to Off. Choose a staff member assigned a supervisor role to configure their allowance.</p>${[...recipients.values()].map(a=>{const p=state(a.user_id,current);return `<article class="allowance-person"><h3>${esc(a.label)}${a.active?'':' <small>Inactive</small>'}</h3><p>This month: ${p.allowanceCents?money(p.allowanceCents):'Off'}</p><a href="${root}&amp;staff=${encodeURIComponent(a.user_id)}">${owner&&a.active?'Configure':'View'} allowance</a></article>`;}).join('')||'<p>No authorised staff accounts yet. Create staff membership first.</p>'}</section>`;
 if(!selected)throw new Error('Staff account unavailable.');
 const target=root+'&amp;staff='+encodeURIComponent(userId),v=values??{},p=state(userId,month),nextState=state(userId,next);
 const on=v.allowance_enabled??(nextState.allowanceCents?'yes':'no');
 const amount=v.allowance_amount??(nextState.allowanceCents?(nextState.allowanceCents/100).toFixed(2):'');
 const setup=owner&&selected.active?`<section class="panel editor-panel"><h2>Schedule a change</h2><form class="settings-form" method="post" action="${target}"><input type="hidden" name="action" value="save"><input type="hidden" name="allowance_version" value="${version}"><div class="form-grid"><div class="form-field"><label for="allowance_enabled">Monthly allowance</label><select data-dropdown id="allowance_enabled" name="allowance_enabled"><option value="no"${on==='no'?' selected':''}>Off — booking earnings only</option><option value="yes"${on==='yes'?' selected':''}>On — add monthly allowance</option></select></div><div class="form-field"><label for="allowance_amount">Monthly amount when On (R)</label><input id="allowance_amount" name="allowance_amount" inputmode="decimal" maxlength="11" value="${esc(amount)}"><small>Added once per calendar month, separately from booking earnings.</small></div><div class="form-field"><label for="effective_month">Effective month</label><input id="effective_month" name="effective_month" type="month" min="${next}" value="${esc(v.effective_month??next)}" required><small>Earliest: ${next}, using ${esc(context.time_zone)}.</small></div></div><label for="allowance_reason">Reason and agreed terms</label><textarea id="allowance_reason" name="allowance_reason" maxlength="500" required>${esc(v.allowance_reason??'')}</textarea><p class="muted">Confirm this person’s supervisor role and agreed terms before saving. Off schedules no allowance from the selected month; it does not remove earlier records. Review any later scheduled changes below.</p><button>Save allowance change</button></form></section>`:`<p class="scope">${owner?'This staff account is inactive. History is preserved; changes require active staff membership.':'Owner access is required to change allowances.'}</p>`;
 const view=preview??p;
 const previewForm=`<section class="panel editor-panel"><h2>Monthly earnings preview</h2><form class="settings-form" method="post" action="${target}"><input type="hidden" name="action" value="preview"><div class="form-grid"><div class="form-field"><label for="preview_month">Calendar month</label><input id="preview_month" name="preview_month" type="month" value="${esc(month)}" required></div><div class="form-field"><label for="booking_earnings">Booking earnings for this month (R)</label><input id="booking_earnings" name="booking_earnings" inputmode="decimal" maxlength="11" value="${preview?.bookingCents==null?'':esc((preview.bookingCents/100).toFixed(2))}"><small>Optional planning input. This is not a verified ledger total.</small></div></div><button>Calculate preview</button></form><dl class="allowance-totals"><dt>Booking earnings</dt><dd>${view.bookingCents===null?'Not entered':money(view.bookingCents)}</dd><dt>Monthly allowance · ${esc(month)}</dt><dd>${money(view.allowanceCents)}</dd><dt>Combined preview</dt><dd>${view.totalCents===null?'Enter booking earnings to calculate':money(view.totalCents)}</dd></dl><p class="muted">Full calendar-month preview; no automatic prorating, deductions or payout instruction. Any agreed adjustments and full pay obligations need separate review.</p></section>`;
 const history=`<section class="panel"><h2>Change history</h2>${own.toSorted((a,b)=>b.version-a.version).map(r=>`<article class="allowance-history"><h3>v${r.version} · From ${esc(r.effective_month.slice(0,7))}: ${r.enabled?money(r.amount_cents)+' per month':'Off'}</h3><p>${esc(r.change_reason)}</p><p class="muted">Saved ${esc(r.created_at)} · Actor ${esc(r.actor_user_id)}</p></article>`).join('')||'<p>No changes saved. Allowance is Off.</p>'}</section>`;
 return heading+note+`<h2>${esc(selected.label)}</h2><p>Current month (${current}): <strong>${state(userId,current).allowanceCents?money(state(userId,current).allowanceCents):'Off'}</strong>. Saved version: ${version}.</p>`+setup+previewForm+history;
}
