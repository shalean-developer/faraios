import {randomUUID} from 'node:crypto';
import {escapeHtml as esc,moduleHeading,feedback,statusBadge} from './workspace-layout.js';
import {parseBookingAgreement,bookingStatuses} from './bookings.js';
import {cleaningScopeForm} from './cleaning-profiles.js';
import {validCustomerId} from './customers.js';
import {validPickerValue} from '../public/date-time-values.js';
import {dateTimeField} from './date-time-field.js';

export const quoteStatuses=Object.freeze({draft:'Draft',issued:'Issued',accepted:'Accepted',declined:'Declined',cancelled:'Cancelled',converted:'Converted'});
const fields='id,business_id,request_key,customer_id,address_id,agreement,status,acceptance_reference,accepted_by,accepted_at,change_reason,converted_booking_id,conversion_payload,version,created_at,updated_at';
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n/100);
const text=(form,key,max=2000)=>{const value=(form.get(key)??'').trim();if(value.length>max)throw new Error('Check '+key.replaceAll('_',' ')+'.');return value;};
const version=form=>{const n=Number(form.get('version'));if(!Number.isSafeInteger(n)||n<1)throw new Error('Reopen the quote before continuing.');return n;};
function validResult(value){if(!validCustomerId(value))throw Object.assign(new Error('Quote response unavailable.'),{status:502});return value;}
async function call(client,name,params){
 const {data,error}=await client.rpc(name,params);
 if(error){const code=error.code;throw Object.assign(new Error(code==='42501'?'Quote access denied':code==='40001'||code==='23505'?'Quote changed or request already used. Reopen it before continuing.':code==='P0001'?error.message:'Quote could not be saved.'),{status:code==='42501'?403:['40001','23505'].includes(code)?409:code==='P0001'?422:502});}
 return data;
}
export async function listQuotes(client,businessId){
 const {data,error}=await client.from('business_quotes').select(fields).eq('business_id',businessId).order('created_at',{ascending:false}).limit(200);
 if(error||!Array.isArray(data)||data.some(q=>q.business_id!==businessId))throw new Error('Quotes unavailable');return data;
}
export async function readQuote(client,businessId,id){
 if(!validCustomerId(id))return null;
 const {data,error}=await client.from('business_quotes').select(fields).eq('business_id',businessId).eq('id',id).maybeSingle();
 if(error||data&&data.business_id!==businessId)throw new Error('Quote unavailable');return data;
}
export async function quoteHandoff(client,businessId,quote){
 if(quote.status!=='converted')return null;
 const {data,error}=await client.from('quote_invoice_handoffs').select('id,business_id,quote_id,booking_id,created_at').eq('business_id',businessId).eq('quote_id',quote.id).maybeSingle();
 if(error||!data||data.business_id!==businessId||data.quote_id!==quote.id||data.booking_id!==quote.converted_booking_id)throw new Error('Invoice handoff unavailable');
 const result=await client.from('one_off_bookings').select('id,business_id,source_quote_id,status').eq('business_id',businessId).eq('id',data.booking_id).maybeSingle(),booking=result.data;
 if(result.error||!booking||booking.business_id!==businessId||booking.source_quote_id!==quote.id||!Object.hasOwn(bookingStatuses,booking.status))throw new Error('Linked booking unavailable');
 return {...data,booking_status:booking.status};
}
export function parseQuoteCreate(form,catalogue){return parseBookingAgreement(form,catalogue);}
export async function createQuote(client,businessId,form,catalogue){
 const p=parseQuoteCreate(form,catalogue);
 return validResult(await call(client,'create_quote',{p_business_id:businessId,p_request_key:p.request_key,p_customer_id:p.customer_id,p_address_id:p.address_id,p_selection:p.selection,p_cleaning_scope:p.cleaning_scope??null,p_duration_minutes:p.duration_minutes}));
}
export async function changeQuote(client,businessId,id,form){
 const status=text(form,'status',20),reference=text(form,'reference');
 if(!['issued','accepted','declined','cancelled'].includes(status))throw new Error('Choose a quote action.');
 if(['accepted','declined','cancelled'].includes(status)&&!reference)throw new Error(status==='accepted'?'Record customer acceptance evidence.':'Enter a reason.');
 return validResult(await call(client,'change_quote',{p_business_id:businessId,p_quote_id:id,p_version:version(form),p_status:status,p_reference:reference}));
}
export async function convertQuote(client,businessId,id,form){
 const local=text(form,'local_start',16),reason=text(form,'hours_override_reason');
 if(!validPickerValue(local,'datetime'))throw new Error('Enter a valid booking date and time.');
 const receipt=await call(client,'convert_quote',{p_business_id:businessId,p_quote_id:id,p_version:version(form),p_local_start:local,p_hours_override_reason:reason});
 validResult(receipt?.booking_id);validResult(receipt?.handoff_id);return receipt;
}

const select=(name,label,options,value)=>`<label for="${name}">${esc(label)}</label><select data-dropdown id="${name}" name="${name}" required>${options.map(([v,l])=>`<option value="${esc(v)}"${String(value??'')===String(v)?' selected':''}>${esc(l)}</option>`).join('')}</select>`;
const hidden=(name,value)=>`<input type="hidden" name="${name}" value="${esc(value)}">`;
function quantity(name,label,value='0'){return `<label for="${name}">${esc(label)}</label><input id="${name}" name="${name}" type="number" min="0" max="999999" step="1" value="${esc(value)}" required>`;}
function quoteDate(value,tz){return new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'short',year:'numeric',timeZone:tz??'UTC'}).format(new Date(value));}
function quoteAction(base,q,status,label,description,required=true){
 return `<form class="settings-form quote-action" method="post" action="${base}&amp;quote=${encodeURIComponent(q.id)}">${hidden('action','change')}${hidden('status',status)}${hidden('version',q.version)}<h3>${esc(label)}</h3><p>${esc(description)}</p><label for="quote-${status}-reference">${status==='accepted'?'Acceptance evidence / reference':required?'Reason':'Sharing reference (optional)'}</label><textarea id="quote-${status}-reference" name="reference" maxlength="2000" rows="3"${required?' required':''}></textarea><button${status==='cancelled'?' class="secondary"':''}>${esc(label)}</button></form>`;
}
export function renderQuotes(business,quotes,{quote=null,handoff=null,customers=[],customer=null,addresses=[],catalogue=[],values={},creating=false,filters={},message='',error=false}={}){
 const base='/quotes?business='+encodeURIComponent(business.id);let content='',actions='';
 if(quote){
  const q=quote,a=q.agreement;
  content=`<section class="panel quote-summary"><div class="quote-summary-top"><h2>${esc(a.customer_snapshot.name)}</h2>${statusBadge(q.status,quoteStatuses[q.status])}</div><p class="muted quote-reference">Quote reference: ${esc(q.id)}</p><p>${esc([a.address_snapshot.address_line,a.address_snapshot.suburb,a.address_snapshot.city,a.address_snapshot.postal_code].filter(Boolean).join(', '))}</p><p>${esc(a.customer_snapshot.email)}${a.customer_snapshot.email&&a.customer_snapshot.phone?' · ':''}${esc(a.customer_snapshot.phone)}</p><p>Created ${esc(quoteDate(q.created_at,a.time_zone))} · ${a.duration_minutes} minutes · Required team: ${a.required_team_size}</p><div class="quote-lines">${a.price_lines.map(l=>`<p><span>${esc(l.name)}<small>${l.quantity} × ${esc(money(l.rate_cents))} / ${esc(l.unit_label)}</small></span><strong>${esc(money(l.total_cents))}</strong></p>`).join('')}</div><p class="catalogue-price">Quote total: ${esc(money(a.total_cents))}</p>${a.cleaning_scope?`<details class="quote-scope"><summary>Saved service details</summary><dl>${Object.entries(a.cleaning_scope).map(([k,v])=>`<dt>${esc(k.replaceAll('_',' '))}</dt><dd>${esc(k==='assessment'?`Additional charge: ${money(v.additional_cents)}; final duration: ${v.duration_minutes} minutes; ${v.reason}`:v)}</dd>`).join('')}</dl></details>`:''}<p class="muted">The saved service, price and contact/address details stay fixed. Create a new quote if the agreement needs correcting.</p></section>`;
  if(q.accepted_at)content+=`<section class="panel"><h2>Acceptance recorded by the office</h2><p>${esc(q.acceptance_reference)}</p><p class="muted">Recorded ${esc(quoteDate(q.accepted_at,a.time_zone))} by an authorised office account.</p></section>`;
  if(q.status==='converted'){
   if(!handoff||handoff.booking_id!==q.converted_booking_id)throw new Error('Invoice handoff unavailable');
   content+=`<section class="panel"><h2>Booking created</h2><p>The booking uses this quote’s saved agreement. Manage its date, confirmation and team from Bookings.</p><p>Booking status: ${statusBadge(handoff.booking_status,bookingStatuses[handoff.booking_status])}</p><a class="button primary" href="/bookings?business=${encodeURIComponent(business.id)}&amp;booking=${encodeURIComponent(q.converted_booking_id)}">Open booking</a>${handoff.booking_status==='cancelled'?'<h3>Invoicing needs review</h3><p>This booking is cancelled. Review the agreement before preparing an invoice.</p>':'<h3>Awaiting invoicing</h3><p>Invoice preparation is pending. No invoice number or payment has been recorded by this conversion.</p>'}</section>`;
  }else{
   if(q.status==='draft')content+=`<section class="panel">${quoteAction(base,q,'issued','Mark as issued','Use this after sharing the reviewed quote with the customer.',false)}</section>`;
   if(q.status==='issued')content+=`<section class="panel quote-actions">${quoteAction(base,q,'accepted','Record customer acceptance','Record the customer’s approval received by the office.')}${quoteAction(base,q,'declined','Record decline','Record why the customer declined this quote.')}</section>`;
   if(q.status==='accepted')content+=`<section class="panel"><h2>Create booking from accepted quote</h2><p>Choose a start time in ${esc(a.time_zone)}. This creates one unassigned Draft booking and queues it for invoicing. Review and confirm it in Bookings.</p><form class="settings-form" method="post" action="${base}&amp;quote=${encodeURIComponent(q.id)}">${hidden('action','convert')}${hidden('version',q.version)}${dateTimeField({id:'local_start',label:'Booking start time',kind:'datetime',value:values.local_start??'',required:true,timeZone:a.time_zone})}<label for="quote-hours-reason">Reason for booking outside working hours (if applicable)</label><textarea id="quote-hours-reason" name="hours_override_reason" maxlength="2000" rows="2">${esc(values.hours_override_reason??'')}</textarea><button>Create draft booking</button></form></section>`;
   if(['draft','issued','accepted'].includes(q.status))content+=`<details class="panel quote-cancel"><summary>Cancel quote</summary>${quoteAction(base,q,'cancelled','Cancel quote','Record the reason. This quote will remain in history.')}</details>`;
   if(['declined','cancelled'].includes(q.status))content+=`<p class="context-note">${esc(quoteStatuses[q.status])}: ${esc(q.change_reason)}</p>`;
  }
 }else if(creating||customer||error){
  const service=catalogue.find(i=>i.id===values.service&&i.kind==='service'&&i.is_active);
  content=`<section class="panel editor-panel"><h2>1. Choose customer</h2><form class="settings-form selector-form" method="get" action="/quotes">${hidden('business',business.id)}${hidden('create','1')}${select('customer','Customer',[['','Select customer'],...customers.filter(c=>c.is_active).map(c=>[c.id,c.name])],customer?.id)}<button>Choose customer</button></form>`;
  if(customer)content+=`<h2 class="form-section-title">2. Choose service</h2><form class="settings-form selector-form" method="get" action="/quotes">${hidden('business',business.id)}${hidden('customer',customer.id)}${select('service','Service',[['','Select service'],...catalogue.filter(i=>i.kind==='service'&&i.is_active).map(i=>[i.id,i.name])],values.service)}<button>Choose service</button></form>`;
  if(customer&&service&&service.cleaning_profile&&!service.cleaning_config)content+='<p role="status">The owner must configure this service before it can be quoted.</p>';
  if(customer&&service&&(!service.cleaning_profile||service.cleaning_config)){
   const extras=catalogue.filter(i=>i.kind==='extra'&&i.is_active&&(!service.cleaning_profile||service.cleaning_config?.extras?.includes(i.id)));
   content+=`<h2 class="form-section-title">3. Quote details</h2><form class="settings-form" method="post" action="${base}">${hidden('action','create')}${hidden('request_key',values.request_key??randomUUID())}${hidden('customer_id',customer.id)}${hidden('service_id',service.id)}${select('address_id','Service address',[['','Select address'],...addresses.filter(a=>a.is_active).map(a=>[a.id,a.label+' · '+a.address_line])],values.address_id)}${service.cleaning_profile?hidden('service_quantity','1')+cleaningScopeForm(service,values):quantity('service_quantity','Service quantity — fixed price: 1; otherwise whole hours/units',values.service_quantity??'1')}<fieldset><legend>Optional extras — quantity 0 means excluded</legend>${extras.map(i=>quantity('extra_'+i.id,`${i.name} · ${money(i.price_cents)} / ${i.unit_label}`,values['extra_'+i.id]??'0')).join('')||'<p>No active extras.</p>'}</fieldset>${service.cleaning_profile?'':`<label for="quote-duration">Estimated duration (minutes)</label><input id="quote-duration" name="duration_minutes" type="number" min="15" max="1440" step="1" value="${esc(values.duration_minutes??'120')}" required>`}<p>Save the quote to review its configured prices and selected scope before issuing it. Choose the visit date when converting an accepted quote.</p><button>Save draft quote</button></form>`;
  }
  content+='</section>';
 }else{
  const q=String(filters.q??'').slice(0,120),status=Object.hasOwn(quoteStatuses,filters.status)?filters.status:'all';
  const rows=quotes.filter(r=>(status==='all'||r.status===status)&&(!q||[r.id,r.agreement.customer_snapshot.name,r.agreement.address_snapshot.address_line,...r.agreement.price_lines.map(l=>l.name)].join(' ').toLowerCase().includes(q.toLowerCase())));
  content=`<form class="list-filters" method="get" action="/quotes">${hidden('business',business.id)}<label class="search-field" for="quote-search">Search quotes<input id="quote-search" name="q" type="search" maxlength="120" value="${esc(q)}" placeholder="Customer, service or quote reference"></label><div><label for="quote-filter-status">Status</label><select data-dropdown id="quote-filter-status" name="status"><option value="all">All statuses</option>${Object.entries(quoteStatuses).map(([v,l])=>`<option value="${v}"${v===status?' selected':''}>${l}</option>`).join('')}</select></div><button>Filter</button>${q||status!=='all'?`<a class="text-action" href="${base}">Clear filters</a>`:''}</form><p class="list-count" role="status">${rows.length} of ${quotes.length} quotes${quotes.length>=200?' · Latest 200 only':''}</p><section class="panel record-list quote-list" aria-label="Quotes"><div class="record-columns" aria-hidden="true"><span>Customer / service</span><span>Created</span><span>Status</span><span>Total</span><span></span></div>${rows.map(r=>`<article class="record-row"><div class="record-primary"><h2>${esc(r.agreement.customer_snapshot.name)}</h2><p>${esc(r.agreement.price_lines[0]?.name??'Saved service')}</p></div><div class="record-date">${esc(quoteDate(r.created_at,r.agreement.time_zone))}</div><div class="record-status">${statusBadge(r.status,quoteStatuses[r.status])}</div><div class="record-amount">${esc(money(r.agreement.total_cents))}</div><a class="row-action" aria-label="Open quote for ${esc(r.agreement.customer_snapshot.name)}" href="${base}&amp;quote=${encodeURIComponent(r.id)}">Open →</a></article>`).join('')||`<div class="empty-state"><h2>${quotes.length?'No matching quotes':'No quotes yet'}</h2><p>${quotes.length?'Try another search or clear your filters.':'Create a quote from your saved services and prices.'}</p></div>`}</section>`;
  actions=`<a class="button primary" href="${base}&amp;create=1">+ New quote</a>`;
 }
 const isCreating=!quote&&(creating||customer||error);
 return moduleHeading({title:quote?'Quote details':isCreating?'New quote':'Quotes',business,description:quote?'Review the saved agreement and its acceptance and conversion history.':isCreating?'Prepare a quote using your business’s configured services and rates.':'Prepare agreements and turn accepted quotes into bookings.',actions,back:quote||isCreating?base:''})+feedback(message,error)+content;
}
