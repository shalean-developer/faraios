import {randomUUID} from 'node:crypto';
import {escapeHtml as esc,localDateTime} from './workspace-layout.js';
import {cleaningScopeForm} from './cleaning-profiles.js';
import {parseBookingCreate,bookingStatuses} from './bookings.js';
const money=n=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n/100);
export const customerRoute=path=>/^\/b\/([a-z][a-z0-9-]{0,62})$/.exec(path)?.[1]??null;
export async function customerOperation(client,route,action,payload={}){
 const {data,error}=await client.rpc('t25_customer_portal',{route,action,payload});
 if(error)throw Object.assign(Error(['42501'].includes(error.code)?'Customer page unavailable':error.code==='23505'?'Request already used; reopen your booking history.':error.code==='40001'||error.code==='40P01'?'Details changed. Retry the same request.':'Unable to complete this request. Check the details or contact the office.'),{status:error.code==='42501'?403:['23505','40001','40P01'].includes(error.code)?409:422});
 if(!data||typeof data!=='object')throw Error('Customer page unavailable');return data;
}
export function customerFormPayload(form,catalogue){
 const action=form.get('action'),requestId=form.get('requestId');
 if(!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(requestId??''))throw Error('Reopen the form to obtain a request key.');
 if(action==='enrol')return {action,payload:{requestId,name:form.get('name'),phone:form.get('phone')}};
 if(action==='address')return {action,payload:Object.fromEntries(['requestId','customer','label','address_line','suburb','city','postal_code'].map(k=>[k,form.get(k)??'']))};
 if(action==='book'){
  const data=new URLSearchParams(form);data.set('customer_id',form.get('customer')??'');data.set('request_key',requestId);data.set('service_quantity','1');
  if(['assessment_cents','assessment_minutes','assessment_reason','hours_override_reason','scope_distance_km','scope_distance_reason'].some(k=>form.get(k)))throw Error('This option needs office assessment.');
  const row=parseBookingCreate(data,catalogue);
  const catalogueVersions=Object.fromEntries(row.selection.map(l=>{const version=form.get('version_'+l.catalogue_id);if(!/^[1-9]\d{0,9}$/.test(version??''))throw Error('Reopen the business page to review current prices.');return [l.catalogue_id,version];}));
  return {action,payload:{requestId,customer:row.customer_id,address:row.address_id,localStart:row.local_start,selection:row.selection,scope:row.cleaning_scope,catalogueVersions}};
 }
 throw Error('Invalid customer action');
}
export function renderCustomerPortal(route,business,{account=null,history=null,serviceId='',values={},message='',signedIn=false}={}){
 const base='/b/'+route;
 const hidden=(name,value)=>`<input type="hidden" name="${name}" value="${esc(value)}">`;
 const field=(name,label,max=160)=>`<label for="${name}">${esc(label)}</label><input id="${name}" name="${name}" maxlength="${max}" value="${esc(values[name]??'')}" required>`;
 const post=(action,body)=>`<form method="post" action="${base}" class="settings-form">${hidden('action',action)}${hidden('requestId',values.action===action?values.requestId:randomUUID())}${body}</form>`;
 const customers=account?.customers??[];
 let html=`<header><h1>${esc(business.name)}</h1><p>Book with ${esc(business.name)}</p></header><nav class="catalogue-tabs" aria-label="Customer portal"><a href="${base}">Book a visit</a><a href="${base}?view=account">My account and addresses</a><a href="${base}?view=history">Booking history</a></nav>${message?`<p role="alert">${esc(message)}</p>`:''}<p class="scope">STAGING TEST ONLY. Your requested time awaits office confirmation. Submitting does not reserve cleaners or charge a payment.</p>`;
 html+=`<section class="panel"><h2>Services and prices</h2><p>Working hours: ${esc(business.opensAt)}–${esc(business.closesAt)} · ${esc(business.timeZone)}. Available days: ${business.workingDays.map(d=>['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][d]).map(esc).join(', ')}. ${business.serviceAreas.map(esc).join(', ')}</p>${business.catalogue.filter(c=>c.kind==='service').map(c=>`<article><h3>${esc(c.name)}</h3><p>${esc(c.description)}</p><p>Base ${money(c.price_cents)} / ${esc(c.unit_label)}; selected scope, extras and equipment may add to this price.</p><a href="${base}?service=${encodeURIComponent(c.id)}">Choose ${esc(c.name)}</a></article>`).join('')||'<p>No services currently available.</p>'}</section>`;
 if(!signedIn)return html+`<section class="panel"><h2>Your customer account</h2><a href="/login?next=${encodeURIComponent(base)}">Sign in to request a visit or see your own history</a><p>Use your existing staging account. No signup or password emails are sent here.</p></section>`;
 if(!customers.length&&account?.canEnrol===false)return html+'<section class="panel"><h2>Customer access unavailable</h2><p>Ask the office to verify or restore your existing customer relationship.</p></section>';
 if(!customers.length)return html+`<section class="panel"><h2>Create your relationship with ${esc(business.name)}</h2><p>This creates a new record for you. Existing history is linked only after independent office verification. Matching emails never link history.</p>${post('enrol',field('name','Your name')+field('phone','Contact phone',40)+'<button>Create my customer relationship</button>')}</section>`;
 html+=`<section class="panel"><h2>My account</h2>${customers.map(c=>`<article><h3>${esc(c.name)}</h3><p>${esc(c.phone)} ${esc(c.email)}</p><p>${c.addresses.map(a=>esc([a.label,a.address_line,a.suburb,a.city,a.postal_code].filter(Boolean).join(', '))).join('<br>')||'No saved addresses.'}</p></article>`).join('')}<p>Ask the office to correct a saved account or verify access to historical records.</p></section>`;
 const selector=key=>`<label for="customer_${key}">My customer record</label><select id="customer_${key}" name="customer">${customers.map(c=>`<option value="${esc(c.id)}"${values.customer===c.id?' selected':''}>${esc(c.name)}</option>`).join('')}</select>`;
 html+=`<section class="panel"><h2>Add my address</h2>${post('address',selector('address')+field('label','Address label',80)+field('address_line','Street address',300)+field('suburb','Suburb',120)+field('city','City',120)+field('postal_code','Postal code',20)+'<button>Save address</button>')}</section>`;
 const s=business.catalogue.find(c=>c.id===serviceId&&c.kind==='service');
 if(s){
  const cfg=s.cleaning_config;
  if(!s.cleaning_profile||!cfg||cfg.manual_duration||cfg.require_assessment)html+=`<section class="panel"><h2>${esc(s.name)}</h2><p>This service needs office assessment before it can be requested here. Contact ${esc(business.name)} to agree the scope, price and duration.</p></section>`;
  else{
   const service=structuredClone(s);if(cfg.equipment?.policy==='distance')service.cleaning_config.equipment.policy='customer';
   let scope=cleaningScopeForm(service,values).replace(/<fieldset><legend>Office assessment<\/legend>[\s\S]*?<\/fieldset>/,'<p>Options requiring assessment must be arranged with the office.</p>');
   if(cfg.equipment?.policy==='distance')scope+=hidden('scope_equipment','No')+'<p>Customer supplies equipment. Equipment delivery requires office assessment.</p>';
   html+=`<section class="panel"><h2>Request ${esc(s.name)}</h2>${post('book',selector('book')+business.catalogue.map(c=>hidden('version_'+c.id,values['version_'+c.id]??c.version)).join('')+hidden('service_id',s.id)+`<label for="address_id">My saved address</label><select id="address_id" name="address_id" required>${customers.flatMap(c=>c.addresses.map(a=>`<option value="${esc(a.id)}"${values.address_id===a.id?' selected':''}>${esc(c.name)} · ${esc(a.label)} · ${esc(a.address_line)}</option>`)).join('')}</select>`+scope+`<fieldset><legend>Optional extras</legend>${business.catalogue.filter(c=>c.kind==='extra'&&cfg.extras?.includes(c.id)).map(c=>`<label>${esc(c.name)} · ${money(c.price_cents)} / ${esc(c.unit_label)}<input name="extra_${esc(c.id)}" type="number" min="0" max="${c.pricing_model==='fixed'?1:999999}" step="1" value="${esc(values['extra_'+c.id]??0)}"></label>`).join('')||'<p>No extras available.</p>'}</fieldset><label for="local_start">Requested time (${esc(business.timeZone)})</label><input id="local_start" name="local_start" type="datetime-local" value="${esc(values.local_start??'')}" required><p>Price and duration are calculated from this business’s saved rules on submission. Review the saved total in your history before the office confirms. A requested time is not guaranteed.</p><button>Submit booking request</button>`)}</section>`;
  }
 }
 if(history){html+=`<section class="panel"><h2>My booking history</h2>${history.rows.slice(0,50).map(r=>`<article><h3>Booking ${esc(r.id)}</h3>${localDateTime(r.localStart)}<p>${esc(r.timeZone)} · ${esc(r.durationMinutes)} minutes</p><p>${r.status==='draft'?'Request awaiting office confirmation':esc(bookingStatuses[r.status]??r.status)}</p><p>${esc(Object.values(r.address).filter(Boolean).join(', '))}</p>${r.priceLines.map(l=>`<p>${esc(l.name)} · ${esc(l.quantity)} × ${money(l.rate_cents)} = ${money(l.total_cents)}</p>`).join('')}<p>Total ${money(r.totalCents)}</p><p>Booking status is separate from payment. No payment or cleaner earnings are created here.</p></article>`).join('')||'<p>No bookings available on this page.</p>'}</section>`;}
 return html;
}

export function renderCustomerAccess(business,customer,links,{message='',values={}}={}){
 const root='/customer-access?business='+encodeURIComponent(business.id)+'&amp;customer='+encodeURIComponent(customer.id);
 return `<h1>Verified customer access · ${esc(business.name)}</h1><h2>${esc(customer.name)}</h2>${message?`<p role="alert">${esc(message)}</p>`:''}<p>Business booking page: <a href="/b/${esc(links.route)}">${esc(business.name)}</a></p><p>Verify the exact Auth user ID and this business relationship independently. Matching email is insufficient. Linking grants this customer record’s booking history and addresses.</p><ul>${links.links.map(l=>`<li>${esc(l.userId)} · ${l.active?'Active':'Revoked'}</li>`).join('')||'<li>No verified links</li>'}</ul><form method="post" action="${root}" class="settings-form"><input type="hidden" name="requestId" value="${esc(values.requestId??randomUUID())}"><label for="link-user">Verified Auth user ID</label><input id="link-user" name="user" required maxlength="36" value="${esc(values.user??'')}"><label for="link-evidence">Verification or revocation evidence</label><textarea id="link-evidence" name="evidence" required maxlength="2000">${esc(values.evidence??'')}</textarea><button name="action" value="link">Grant verified access</button><button name="action" value="revoke">Revoke access</button></form><a href="/customers?business=${encodeURIComponent(business.id)}&amp;customer=${encodeURIComponent(customer.id)}">Back to customer</a>`;
}
