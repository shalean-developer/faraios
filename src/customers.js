import {moduleHeading,feedback,statusBadge} from './workspace-layout.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const validCustomerId=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
export function parseCustomerForm(form,address=false){
 const text=(key,max,required=false)=>{const value=(form.get(key)??'').trim();if((required&&!value)||value.length>max)throw new Error(`Check ${key.replaceAll('_',' ')}.`);return value;};
 const status=text('status',10,true);if(!['active','inactive'].includes(status))throw new Error('Select a valid status.');
 if(address)return {label:text('label',80,true),address_line:text('address_line',300,true),suburb:text('suburb',120),city:text('city',120),postal_code:text('postal_code',20),access_notes:text('access_notes',2000),is_active:status==='active'};
 const email=text('email',254);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Enter a valid email address.');
 return {name:text('name',160,true),email,phone:text('phone',40),private_notes:text('private_notes',4000),is_active:status==='active'};
}
export async function listCustomers(client,businessId){
 const {data,error}=await client.from('business_customers').select('id,business_id,name,email,phone,is_active,version').eq('business_id',businessId).order('name').limit(500);
 if(error||!Array.isArray(data)||data.some(r=>r.business_id!==businessId))throw new Error('Customers unavailable');return data;
}
export async function readCustomer(client,businessId,id){
 if(!validCustomerId(id))return null;
 const {data,error}=await client.from('business_customers').select('id,business_id,name,email,phone,private_notes,is_active,version').eq('business_id',businessId).eq('id',id).maybeSingle();
 if(error)throw new Error('Customer unavailable');if(data&&data.business_id!==businessId)throw new Error('Customer scope mismatch');return data;
}
export async function listAddresses(client,businessId,customerId){
 const {data,error}=await client.from('customer_addresses').select('id,business_id,customer_id,label,address_line,suburb,city,postal_code,access_notes,is_active,version').eq('business_id',businessId).eq('customer_id',customerId).order('label').limit(100);
 if(error||!Array.isArray(data)||data.some(r=>r.business_id!==businessId||r.customer_id!==customerId))throw new Error('Addresses unavailable');return data;
}
export async function readAddress(client,businessId,customerId,id){
 if(!validCustomerId(id)||!validCustomerId(customerId))return null;
 const {data,error}=await client.from('customer_addresses').select('id,business_id,customer_id,label,address_line,suburb,city,postal_code,access_notes,is_active,version').eq('business_id',businessId).eq('customer_id',customerId).eq('id',id).maybeSingle();
 if(error)throw new Error('Address unavailable');if(data&&(data.business_id!==businessId||data.customer_id!==customerId))throw new Error('Address scope mismatch');return data;
}
export async function saveCustomerRecord(client,businessId,row,{id,version,customerId}={}){
 const address=customerId!==undefined;
 if(address&&!validCustomerId(customerId))throw new Error('Invalid customer reference');
 let query=client.from(address?'customer_addresses':'business_customers');
 if(id){
  if(!validCustomerId(id)||!Number.isSafeInteger(version)||version<1)throw new Error('Invalid record reference');
  query=query.update(row).eq('business_id',businessId).eq('id',id).eq('version',version);
  if(address)query=query.eq('customer_id',customerId);
 }else query=query.insert({...row,business_id:businessId,...(address?{customer_id:customerId}:{})});
 const {data,error}=await query.select('id');if(error)throw new Error('Record could not be saved');
 if(data?.length!==1){const conflict=new Error('This record changed or is unavailable. Reopen it before saving.');conflict.status=409;throw conflict;}return data[0].id;
}
export function renderCustomers(business,customers,customer=null,addresses=[],editingAddress=null,message='',error=false,{creating=false,q='',status='all'}={}){
 const base='/customers?business='+encodeURIComponent(business.id),c=customer??{},a=editingAddress??{};
 const input=(key,label,value='',max=160,type='text',required=false,prefix='customer-')=>`<div class="form-field"><label for="${prefix+key}">${label}</label><input id="${prefix+key}" name="${key}" type="${type}" maxlength="${max}" value="${esc(value)}"${required?' required':''}></div>`;
 const notes=(key,label,value,max,prefix='customer-')=>`<div class="form-field form-wide"><label for="${prefix+key}">${label}</label><textarea id="${prefix+key}" name="${key}" maxlength="${max}" rows="3">${esc(value)}</textarea></div>`;
 const statusField=(value,prefix)=>`<div class="form-field"><label for="${prefix}-status">Status</label><select data-dropdown id="${prefix}-status" name="status"><option value="active"${value!==false?' selected':''}>Active</option><option value="inactive"${value===false?' selected':''}>Inactive</option></select></div>`;
 const version=row=>row?.id?`<input type="hidden" name="version" value="${esc(row.version)}">`:'';
 const editing=creating||!!customer||error;
 const actions=!editing?`<a class="button primary" href="${base}&amp;create=1">+ Add customer</a>`:'';
 let body=moduleHeading({title:c.id?'Customer details':editing?'Add customer':'Customers',business,description:editing?'Manage contact details, private notes and saved addresses.':'Keep customer contact details and service addresses in one place.',actions,back:editing?base:''})+feedback(message,error);
 if(!editing){
  const query=String(q??'').slice(0,120),filter=['active','inactive'].includes(status)?status:'all';
  const rows=customers.filter(r=>(filter==='all'||r.is_active===(filter==='active'))&&(!query||[r.name,r.email,r.phone].join(' ').toLowerCase().includes(query.toLowerCase())));
  return body+`<form class="list-filters" method="get" action="/customers"><input type="hidden" name="business" value="${esc(business.id)}"><label class="search-field" for="customer-search">Search customers<input id="customer-search" type="search" name="q" maxlength="120" value="${esc(query)}" placeholder="Name, email or phone"></label><div><label for="customer-filter-status">Status</label><select data-dropdown id="customer-filter-status" name="status"><option value="all">All statuses</option>${['active','inactive'].map(v=>`<option value="${v}"${filter===v?' selected':''}>${v==='active'?'Active':'Inactive'}</option>`).join('')}</select></div><button>Filter</button>${query||filter!=='all'?`<a class="text-action" href="${base}">Clear filters</a>`:''}</form><p class="list-count" role="status">${rows.length} of ${customers.length} customers${customers.length>=500?' · First 500 customers only':''}</p><section class="panel record-list customer-list" aria-label="Customers"><div class="record-columns" aria-hidden="true"><span>Customer</span><span>Email</span><span>Phone</span><span>Status</span><span></span></div>${rows.map(r=>`<article class="record-row"><div class="record-primary"><h2>${esc(r.name)}</h2></div><div class="record-contact"><span class="mobile-label">Email</span>${esc(r.email||'No email saved')}</div><div class="record-contact"><span class="mobile-label">Phone</span>${esc(r.phone||'No phone saved')}</div><div class="record-status">${statusBadge(r.is_active?'active':'inactive',r.is_active?'Active':'Inactive')}</div><a class="row-action" href="${base}&amp;customer=${encodeURIComponent(r.id)}" aria-label="Open customer ${esc(r.name)}">Open <span aria-hidden="true">→</span></a></article>`).join('')||`<div class="empty-state"><h2>${customers.length?'No matching customers':'No customers yet'}</h2><p>${customers.length?'Try another search or clear your filters.':'Add a customer to save their contact details and booking addresses.'}</p></div>`}</section>`;
 }
 body+=`<div class="customer-detail-grid"><section class="panel editor-panel" id="customer-editor"><h2>${c.id?'Contact details':'Customer details'}</h2><form class="settings-form" method="post" action="${base}${c.id?'&amp;customer='+encodeURIComponent(c.id):''}"><input type="hidden" name="action" value="customer">${version(c)}<div class="form-grid">${input('name','Customer name',c.name,160,'text',true)}${input('email','Email',c.email,254,'email')}${input('phone','Phone',c.phone,40,'tel')}${statusField(c.is_active,'customer')}${notes('private_notes','Private office notes',c.private_notes,4000)}</div><p class="muted">Private office notes are visible only to ${esc(business.name)} owners and managers.</p><div class="form-actions"><button>${c.id?'Save customer':'Add customer'}</button><a class="button secondary" href="${base}">Cancel</a></div></form></section>`;
 if(c.id)body+=`<section class="panel editor-panel"><h2>Addresses</h2>${addresses.length>=100?'<p class="muted">Showing the first 100 addresses.</p>':''}${addresses.map(r=>`<article class="address-row"><div><h3>${esc(r.label)}</h3>${statusBadge(r.is_active?'active':'inactive',r.is_active?'Active':'Inactive')}<p>${esc([r.address_line,r.suburb,r.city,r.postal_code].filter(Boolean).join(', '))}</p>${r.access_notes?`<details><summary>Private access instructions</summary><p>${esc(r.access_notes)}</p></details>`:''}</div><a class="row-action" href="${base}&amp;customer=${encodeURIComponent(c.id)}&amp;address=${encodeURIComponent(r.id)}#address-editor" aria-label="Edit address ${esc(r.label)}">Edit</a></article>`).join('')||'<p class="muted">No addresses yet. Add a service address before creating a booking.</p>'}<details class="address-editor" id="address-editor"${editingAddress?' open':''}><summary>${a.id?'Edit address':'Add address'}</summary><form class="settings-form" method="post" action="${base}&amp;customer=${encodeURIComponent(c.id)}${a.id?'&amp;address='+encodeURIComponent(a.id):''}"><input type="hidden" name="action" value="address">${version(a)}<div class="form-grid">${input('label','Address label, e.g. Home or Office',a.label,80,'text',true,'address-')}${input('address_line','Street address',a.address_line,300,'text',true,'address-')}${input('suburb','Suburb',a.suburb,120,'text',false,'address-')}${input('city','City',a.city,120,'text',false,'address-')}${input('postal_code','Postal code',a.postal_code,20,'text',false,'address-')}${statusField(a.is_active,'address')}${notes('access_notes','Private access instructions',a.access_notes,2000,'address-')}</div><div class="form-actions"><button>${a.id?'Save address':'Add address'}</button><a class="button secondary" href="${base}&amp;customer=${encodeURIComponent(c.id)}">Cancel address edit</a></div></form></details></section>`;
 if(c.id)body+=`<section class="panel"><a href="/customer-access?business=${encodeURIComponent(business.id)}&amp;customer=${encodeURIComponent(c.id)}">Verify or revoke customer portal access</a></section>`;
 return body+'</div>';
}
