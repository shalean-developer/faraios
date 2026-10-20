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
 const invoiceResult=await client.from('business_invoices').select('id,business_id,booking_id,source_quote_id,sync_status').eq('business_id',businessId).eq('booking_id',booking.id).maybeSingle(),invoice=invoiceResult.data;
 if(invoiceResult.error||invoice&&(invoice.business_id!==businessId||invoice.booking_id!==booking.id||invoice.source_quote_id!==quote.id))throw new Error('Invoice unavailable');
 return {...data,booking_status:booking.status,invoice};
}
export async function quoteAcceptanceActor(client,businessId,quote){
 if(!quote.accepted_by)return null;
 const {data,error}=await client.rpc('quote_acceptance_actor',{p_business_id:businessId,p_quote_id:quote.id});
 if(error?.code==='42501')throw Object.assign(new Error('Quote access denied'),{status:403});
 if(error||!data)return {available:false};
 if(data.business_id!==businessId||data.quote_id!==quote.id||data.actor_id!==quote.accepted_by)throw new Error('Acceptance record unavailable');
 return typeof data.label==='string'&&data.label.trim()?{available:true,label:data.label.trim()}:{available:false};
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
export function quoteAddress(address){
 const parts=[address.address_line,address.suburb,address.city,address.postal_code].flatMap(v=>String(v??'').split(',')).map(v=>v.trim()).filter(Boolean);
 return parts.filter((v,i)=>i===0||v.toLocaleLowerCase()!==parts[i-1].toLocaleLowerCase()).join(', ');
}
const durationLabel=minutes=>`${Math.floor(minutes/60)?Math.floor(minutes/60)+'h ':''}${minutes%60?minutes%60+'m':''}`.trim();
function quoteTimestamp(value,tz){return new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23',timeZone:tz??'UTC'}).format(new Date(value));}
function priceTable(lines,label){
 return `<table class="quote-price-table"><caption class="sr-only">${esc(label)}</caption><thead><tr><th scope="col">Item</th><th scope="col" class="quote-quantity">Qty</th><th scope="col" class="quote-rate">Rate</th><th scope="col" class="quote-amount">Amount</th></tr></thead><tbody>${lines.map(l=>`<tr><th scope="row">${esc(l.name)}<small class="quote-mobile-rate">${l.quantity} × ${esc(money(l.rate_cents))} / ${esc(l.unit_label)}</small></th><td class="quote-quantity">${l.quantity}</td><td class="quote-rate">${esc(money(l.rate_cents))}<small>/ ${esc(l.unit_label)}</small></td><td class="quote-amount">${esc(money(l.total_cents))}</td></tr>`).join('')}</tbody></table>`;
}
function quoteDetail(q,handoff,actor,business){
 const a=q.agreement,converted=q.status==='converted';
 if(converted&&(!handoff||handoff.booking_id!==q.converted_booking_id))throw new Error('Invoice handoff unavailable');
 const cancelled=converted&&handoff.booking_status==='cancelled';
 const ref=q.id.slice(0,8).toUpperCase()+'…'+q.id.slice(-4).toUpperCase();
 const bookingUrl='/bookings?business='+encodeURIComponent(business.id)+'&amp;booking='+encodeURIComponent(q.converted_booking_id??'');
 const primary=converted?`<a class="button primary" href="${bookingUrl}">Open booking</a>`:['draft','issued','accepted'].includes(q.status)?`<a class="button primary" href="#quote-next-step">${q.status==='draft'?'Review and issue':q.status==='issued'?'Record customer response':'Choose booking time'}</a>`:'';
 const charged=a.price_lines.filter(l=>l.total_cents!==0),noCharge=a.price_lines.filter(l=>l.total_cents===0);
 const summary=`<section class="panel quote-overview" aria-label="Quote summary"><div class="quote-overview-head"><div><h2>${esc(a.customer_snapshot.name)}</h2><p class="quote-display-reference">Quote ${esc(ref)}</p></div><div class="quote-total"><span>Quote total</span><strong>${esc(money(a.total_cents))}</strong></div></div><div class="quote-state-row"><span>Quote: ${statusBadge(q.status,quoteStatuses[q.status])}</span>${converted?`<span>Booking: ${statusBadge(handoff.booking_status,bookingStatuses[handoff.booking_status])}</span>`:''}</div>${converted?`<div class="quote-status-note${cancelled?' is-warning':''}"><strong>${cancelled?'Invoicing needs review':handoff.invoice?'Internal invoice draft prepared':'Awaiting invoicing'}</strong><p>${cancelled?'This booking is cancelled. Review the agreement before preparing an invoice.':handoff.invoice?'Open the internal invoice to review its separate accounting status. No payment is recorded by quote conversion.':'Invoice preparation is pending. No invoice number or payment has been recorded by this conversion.'}</p></div>`:''}<div class="quote-summary-actions">${primary}${handoff?.invoice?`<a class="button secondary" href="/invoices?business=${encodeURIComponent(business.id)}&amp;invoice=${encodeURIComponent(handoff.invoice.id)}">Open invoice</a>`:''}<div class="quote-reference-control" data-quote-reference><button type="button" class="secondary" data-copy-reference hidden aria-describedby="quote-copy-status">Copy reference</button><span id="quote-copy-status" class="quote-copy-status" role="status" aria-live="polite"></span><details class="quote-reference-full"><summary>Full reference</summary><label for="full-quote-reference" class="sr-only">Full quote reference</label><input id="full-quote-reference" readonly value="${esc(q.id)}"><p>Use the full reference when matching records.</p></details></div></div></section>`;
 const customer=`<section class="panel quote-customer"><h2>Customer and visit</h2><p class="quote-address">${esc(quoteAddress(a.address_snapshot))}</p><p class="quote-contact">${a.customer_snapshot.email?`<a href="mailto:${esc(a.customer_snapshot.email)}">${esc(a.customer_snapshot.email)}</a>`:''}${a.customer_snapshot.phone?`<a href="tel:${esc(a.customer_snapshot.phone.replace(/[^+0-9]/g,''))}">${esc(a.customer_snapshot.phone)}</a>`:''}</p><dl class="quote-facts"><div><dt>Duration</dt><dd>${esc(durationLabel(a.duration_minutes))}</dd></div><div><dt>Required team</dt><dd>${a.required_team_size} ${a.required_team_size===1?'staff member':'staff members'}</dd></div><div><dt>Created</dt><dd>${esc(quoteDate(q.created_at,a.time_zone))}</dd></div></dl>${a.cleaning_scope?`<details class="quote-scope"><summary>Saved service details</summary><dl>${Object.entries(a.cleaning_scope).map(([k,v])=>`<dt>${esc(k.replaceAll('_',' '))}</dt><dd>${esc(k==='assessment'?`Additional charge: ${money(v.additional_cents)}; final duration: ${durationLabel(v.duration_minutes)}; ${v.reason}`:v)}</dd>`).join('')}</dl></details>`:''}</section>`;
 const prices=`<section class="panel quote-pricing"><h2>Price breakdown</h2>${charged.length?priceTable(charged,'Quote charges'):'<p>No charged items.</p>'}${noCharge.length?`<details class="quote-no-charge"${charged.length?'':' open'}><summary>No-charge details (${noCharge.length})</summary>${priceTable(noCharge,'Saved no-charge details')}</details>`:''}<div class="quote-price-total"><span>Quote total</span><strong>${esc(money(a.total_cents))}</strong></div><p class="quote-snapshot-note">Saved agreement. Create a new quote if these details need correcting.</p></section>`;
 const acceptance=q.accepted_at?`<section class="panel quote-acceptance"><h2>Acceptance recorded by the office</h2><dl><dt>Recorded by</dt><dd>${actor?.available?esc(actor.label):'Account label unavailable'}<small>Current account label</small></dd><dt>Recorded at</dt><dd><time datetime="${esc(q.accepted_at)}">${esc(quoteTimestamp(q.accepted_at,a.time_zone))}</time><small>${esc(a.time_zone)}</small></dd><dt>Evidence / reference</dt><dd class="quote-evidence">${esc(q.acceptance_reference)}</dd></dl><details class="quote-actor-id"><summary>Recorded account ID</summary><p>${esc(q.accepted_by??'Unavailable')}</p></details></section>`:'';
 return {summary,body:`<div class="quote-detail-grid"><div class="quote-detail-main">${prices}</div><div class="quote-detail-side">${customer}${acceptance}</div></div>`};
}
function quoteAction(base,q,status,label,description,required=true){
 return `<form class="settings-form quote-action" method="post" action="${base}&amp;quote=${encodeURIComponent(q.id)}">${hidden('action','change')}${hidden('status',status)}${hidden('version',q.version)}<h3>${esc(label)}</h3><p>${esc(description)}</p><label for="quote-${status}-reference">${status==='accepted'?'Acceptance evidence / reference':required?'Reason':'Sharing reference (optional)'}</label><textarea id="quote-${status}-reference" name="reference" maxlength="2000" rows="3"${required?' required':''}></textarea><button${status==='cancelled'?' class="secondary"':''}>${esc(label)}</button></form>`;
}
export function renderQuotes(business,quotes,{quote=null,handoff=null,actor=null,customers=[],customer=null,addresses=[],catalogue=[],values={},creating=false,filters={},message='',error=false}={}){
 const base='/quotes?business='+encodeURIComponent(business.id);let content='',actions='';
 if(quote){
  const q=quote,a=q.agreement;
  const detail=quoteDetail(q,handoff,actor,business);
  content=detail.summary;
  let next='';
  if(q.status!=='converted'){
   if(q.status==='draft')next+=`<section class="panel">${quoteAction(base,q,'issued','Mark as issued','Use this after sharing the reviewed quote with the customer.',false)}</section>`;
   if(q.status==='issued')next+=`<section class="panel quote-actions">${quoteAction(base,q,'accepted','Record customer acceptance','Record the customer’s approval received by the office.')}${quoteAction(base,q,'declined','Record decline','Record why the customer declined this quote.')}</section>`;
   if(q.status==='accepted')next+=`<section class="panel"><h2>Create booking from accepted quote</h2><p>Choose a start time in ${esc(a.time_zone)}. This creates one unassigned Draft booking and queues it for invoicing. Review and confirm it in Bookings.</p><form class="settings-form" method="post" action="${base}&amp;quote=${encodeURIComponent(q.id)}">${hidden('action','convert')}${hidden('version',q.version)}${dateTimeField({id:'local_start',label:'Booking start time',kind:'datetime',value:values.local_start??'',required:true,timeZone:a.time_zone})}<label for="quote-hours-reason">Reason for booking outside working hours (if applicable)</label><textarea id="quote-hours-reason" name="hours_override_reason" maxlength="2000" rows="2">${esc(values.hours_override_reason??'')}</textarea><button>Create draft booking</button></form></section>`;
   if(['draft','issued','accepted'].includes(q.status))next+=`<details class="panel quote-cancel"><summary>Cancel quote</summary>${quoteAction(base,q,'cancelled','Cancel quote','Record the reason. This quote will remain in history.')}</details>`;
   if(['declined','cancelled'].includes(q.status))next+=`<p class="context-note">${esc(quoteStatuses[q.status])}: ${esc(q.change_reason)}</p>`;
  }
  content=`<div class="quote-detail">${content}${detail.body}${next?`<div id="quote-next-step" tabindex="-1" class="quote-next-step">${next}</div>`:''}</div>`;
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
