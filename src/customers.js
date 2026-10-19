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
export function renderCustomers(business,customers,customer=null,addresses=[],editingAddress=null,message='',error=false){
 const base='/customers?business='+encodeURIComponent(business.id);
 const input=(key,label,value='',max=160,type='text',required=false)=>`<label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" maxlength="${max}" value="${esc(value)}"${required?' required':''}>`;
 const notes=(key,label,value,max)=>`<label for="${key}">${label}</label><textarea id="${key}" name="${key}" maxlength="${max}" rows="3">${esc(value)}</textarea>`;
 const status=value=>`<label for="status">Status</label><select data-dropdown id="status" name="status"><option value="active"${value!==false?' selected':''}>Active</option><option value="inactive"${value===false?' selected':''}>Inactive</option></select>`;
 const version=row=>row?.id?`<input type="hidden" name="version" value="${esc(row.version)}">`:'';
 const c=customer??{},a=editingAddress??{};
 const customerForm=`<section class="panel" id="customer-editor"><h2>${c.id?'Edit customer':'Add customer'}</h2><form class="settings-form" method="post" action="${base}${c.id?'&amp;customer='+encodeURIComponent(c.id):''}"><input type="hidden" name="action" value="customer">${version(c)}${input('name','Customer name',c.name,160,'text',true)}${input('email','Email',c.email,254,'email')}${input('phone','Phone',c.phone,40,'tel')}${notes('private_notes','Private office notes',c.private_notes,4000)}<p class="muted">Notes belong to ${esc(business.name)} and are visible only to its owners and managers.</p>${status(c.is_active)}<button>${c.id?'Save customer':'Add customer'}</button>${c.id?` <a href="${base}">Back to customers</a>`:''}</form></section>`;
 const addressSection=c.id?`<section class="panel"><h2>Addresses for ${esc(c.name)}</h2>${addresses.length>=100?'<p>Showing the first 100 addresses.</p>':''}${addresses.length?addresses.map(r=>`<article class="catalogue-row"><h3>${esc(r.label)} · ${r.is_active?'Active':'Inactive'}</h3><p>${esc([r.address_line,r.suburb,r.city,r.postal_code].filter(Boolean).join(', '))}</p>${r.access_notes?`<p>${esc(r.access_notes)}</p>`:''}<a class="catalogue-edit" href="${base}&amp;customer=${encodeURIComponent(c.id)}&amp;address=${encodeURIComponent(r.id)}#address-editor" aria-label="Edit address ${esc(r.label)}">Edit address</a></article>`).join(''):'<p>No addresses yet.</p>'}</section><section class="panel" id="address-editor"><h2>${a.id?'Edit address':'Add address'}</h2><form class="settings-form" method="post" action="${base}&amp;customer=${encodeURIComponent(c.id)}${a.id?'&amp;address='+encodeURIComponent(a.id):''}"><input type="hidden" name="action" value="address">${version(a)}${input('label','Address label, e.g. Home or Office',a.label,80,'text',true)}${input('address_line','Street address',a.address_line,300,'text',true)}${input('suburb','Suburb',a.suburb,120)}${input('city','City',a.city,120)}${input('postal_code','Postal code',a.postal_code,20)}${notes('access_notes','Private access instructions',a.access_notes,2000)}<label for="address_status">Address status</label><select data-dropdown id="address_status" name="status"><option value="active"${a.is_active!==false?' selected':''}>Active</option><option value="inactive"${a.is_active===false?' selected':''}>Inactive</option></select><button>${a.id?'Save address':'Add address'}</button>${a.id?` <a href="${base}&amp;customer=${encodeURIComponent(c.id)}">Cancel address edit</a>`:''}</form></section>`:'';
 return `<a href="/dashboard?business=${encodeURIComponent(business.id)}">← Back to ${esc(business.name)}</a><h1>Customers and addresses</h1><p>${esc(business.name)} · Business-owned customer records</p>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}${!c.id?`<section class="panel"><h2>Customers</h2>${customers.length>=500?'<p>Showing the first 500 customers.</p>':''}${customers.length?customers.map(r=>`<article class="catalogue-row"><h3>${esc(r.name)}</h3><p>${esc([r.email,r.phone,r.is_active?'Active':'Inactive'].filter(Boolean).join(' · '))}</p><a class="catalogue-edit" href="${base}&amp;customer=${encodeURIComponent(r.id)}" aria-label="Open customer ${esc(r.name)}">Open customer</a></article>`).join(''):'<p>No customers yet.</p>'}</section>`:''}${customerForm}${addressSection}`;
}
