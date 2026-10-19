import {parseCleaningConfig,cleaningConfigForm} from './cleaning-profiles.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseCatalogueItem(form,previous=null){
 const text=(key,max,required=false)=>{const value=(form.get(key)??'').trim();if((required&&!value)||value.length>max)throw new Error(`Check ${key.replaceAll('_',' ')}.`);return value;};
 const kind=text('kind',10,true),pricing_model=text('pricing_model',10,true);
 if(!['service','extra'].includes(kind)||!['fixed','hourly','per_unit'].includes(pricing_model))throw new Error('Select an item type and pricing model.');
 if(form.get('cleaning_profile')&&pricing_model!=='fixed')throw new Error('Cleaning profiles require fixed base visit pricing.');
 const raw=text('price',20,true);if(!/^\d+(\.\d{1,2})?$/.test(raw))throw new Error('Enter a Rand amount with at most two decimal places.');
 const [whole,fraction='']=raw.split('.');const amount=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(amount>2147483647n)throw new Error('Price exceeds the supported amount.');
 const team=text('team_size',3);if(kind==='service'&&(!/^\d+$/.test(team)||Number(team)<1||Number(team)>100))throw new Error('Enter a service team size between 1 and 100.');
 const status=text('status',10,true);if(!['active','inactive'].includes(status))throw new Error('Select an item status.');
 return {...parseCleaningConfig(form,kind,previous),kind,name:text('name',120,true),description:text('description',2000),pricing_model,unit_label:text('unit_label',40,true),price_cents:Number(amount),currency:'ZAR',team_size:kind==='service'?Number(team):null,is_active:status==='active'};
}
export async function listCatalogue(client,businessId){
 const {data,error}=await client.from('business_catalogue').select('id,business_id,kind,name,description,pricing_model,unit_label,price_cents,currency,team_size,is_active,version,cleaning_profile,cleaning_config').eq('business_id',businessId).order('name').limit(500);
 if(error||!Array.isArray(data)||data.some(r=>r.business_id!==businessId))throw new Error('Catalogue unavailable');return data;
}
export async function saveCatalogueItem(client,businessId,item,{id,version}={}){
 let query;
 if(id){
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)||!Number.isSafeInteger(version)||version<1)throw new Error('Invalid item reference');
  query=client.from('business_catalogue').update(item).eq('business_id',businessId).eq('id',id).eq('version',version);
 }else query=client.from('business_catalogue').insert({...item,business_id:businessId});
 const {data,error}=await query.select('id');
 if(error)throw new Error('Catalogue could not be saved');
 if(data?.length!==1){const error=new Error('This item changed or is unavailable. Reopen it before saving.');error.status=409;throw error;}
 return data[0].id;
}
export async function deleteCatalogueItem(client,businessId,id,version){
 if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id??'')||!Number.isSafeInteger(version)||version<1)throw new Error('Invalid item reference');
 const {data,error}=await client.from('business_catalogue').delete().eq('business_id',businessId).eq('id',id).eq('version',version).select('id');
 if(error)throw new Error('Catalogue item could not be deleted');
 if(data?.length!==1){const conflict=new Error('This item changed or is unavailable. Reopen it before deleting.');conflict.status=409;throw conflict;}
}
export function renderCatalogueDelete(business,item,view='service'){
 const base='/catalogue?business='+encodeURIComponent(business.id)+(view==='extra'?'&amp;view=extra':'');
 return `<h1>Delete ${item.kind==='extra'?'extra':'service'}?</h1><p>Delete <strong>${esc(item.name)}</strong> from ${esc(business.name)}? This removes the saved item. Its audit history is retained.</p><form method="post" action="${base}&amp;item=${encodeURIComponent(item.id)}"><input type="hidden" name="action" value="delete"><input type="hidden" name="version" value="${esc(item.version)}"><button>Confirm delete</button> <a href="${base}">Cancel</a></form>`;
}

export function renderCatalogueDeactivate(business,item,view='service'){
 const base='/catalogue?business='+encodeURIComponent(business.id)+(view==='extra'?'&amp;view=extra':'');
 return `<h1>Deactivate ${esc(item.name)}?</h1><p>This removes the item from new bookings. Saved bookings keep their existing prices.</p><form method="post" action="${base}&amp;item=${encodeURIComponent(item.id)}"><input type="hidden" name="action" value="deactivate"><input type="hidden" name="version" value="${item.version}"><button>Confirm deactivate</button> <a href="${base}">Cancel</a></form>`;
}
export function renderCatalogue(business,items,canManage,editing=null,message='',error=false,view='service',options={}){
 const selected=view==='extra'?'extra':'service',root='/catalogue?business='+encodeURIComponent(business.id);
 const search=String(options.q??'').slice(0,120),status=['active','inactive'].includes(options.status)?options.status:'all',service=String(options.service??'');
 const filters=(search?'&amp;q='+encodeURIComponent(search):'')+(status!=='all'?'&amp;status='+status:'')+(service?'&amp;service='+encodeURIComponent(service):'');
 const base=root+(selected==='extra'?'&amp;view=extra':'')+filters;
 const editingForm=canManage&&!!editing,s=editing??{},kind=s.kind==='extra'?'extra':'service',label=kind==='extra'?'extra':'service';
 const money=v=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(v/100);
 const input=(name,title,type='text',value=s[name]??'',required=true)=>`<label class="setup-field"><span>${title}</span><input id="${name}" name="${name}" type="${type}" value="${esc(value)}"${required?' required':''}${name==='team_size'?' min="1" max="100" step="1"':''} maxlength="${name==='description'?2000:name==='price'?20:120}"></label>`;
 const select=(name,title,choices,value)=>`<div class="setup-field"><label for="${name}">${title}</label><select data-dropdown id="${name}" name="${name}" required>${choices.map(([v,t])=>`<option value="${esc(v)}"${v===value?' selected':''}>${esc(t)}</option>`).join('')}</select></div>`;
 const title=editingForm?`${s.id?'Edit':'Add'} ${label}`:'Services & extras';
 const intro=`<a href="/dashboard?business=${encodeURIComponent(business.id)}">← Back to ${esc(business.name)}</a><section class="catalogue-top"><div class="catalogue-intro"><h1>${title}</h1><p>${esc(business.name)} · ${canManage?'Owner configuration':'Read-only catalogue'}</p></div>${canManage&&!editingForm?`<a class="catalogue-add-link" href="${base}&amp;create=${selected}">+ Add ${selected==='extra'?'Extra':'Service'}</a>`:''}</section>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}`;
 if(editingForm){
  const price=s.price??(s.price_cents==null?'':(s.price_cents/100).toFixed(2));
  return intro+`<p><a href="${base}">← Back to ${selected==='extra'?'extras':'services'}</a></p><section class="panel" id="catalogue-editor"><form class="settings-form catalogue-setup" method="post" action="${base}${s.id?'&amp;item='+encodeURIComponent(s.id):''}#catalogue-editor"><input type="hidden" name="kind" value="${kind}">${s.id?`<input type="hidden" name="version" value="${esc(s.version)}">`:''}<h2>${kind==='extra'?'Extra details':'Service details'}</h2><div class="setup-grid">${input('name','Name')}${input('price',s.cleaning_profile?'Base visit price (R)':'Price (R)','text',price)}${kind==='service'?input('team_size','Cleaners required','number',s.team_size??''):''}${select('status','Status',[['inactive','Inactive'],['active','Active']],s.status??(s.is_active?'active':'inactive'))}${select('pricing_model','Pricing model',[['','Select pricing model'],['fixed','Fixed price'],['hourly','Per hour'],['per_unit','Per unit']],s.pricing_model??(s.cleaning_profile?'fixed':''))}${input('unit_label','Charging unit (visit, hour, item)', 'text',s.unit_label??'visit')}</div><details class="setup-subsection"><summary>Description (optional)</summary>${input('description','Description','text',s.description??'',false)}</details>${cleaningConfigForm(s,items)}<div class="setup-save"><p class="muted">Settings belong to ${esc(business.name)}. Saved bookings keep their prices.</p><button type="submit">${s.id?'Save changes':`Create ${label}`}</button> <a href="${base}">Cancel${s.id?' edit':''}</a></div></form></section>`;
 }
 const tabs=`<nav class="catalogue-tabs" aria-label="Catalogue category">${[['service','Services'],['extra','Extras']].map(([k,t])=>`<a href="${root}${k==='extra'?'&amp;view=extra':''}"${selected===k?' aria-current="page"':''}>${t} <span>${items.filter(i=>i.kind===k).length}</span></a>`).join('')}</nav>`;
 const services=items.filter(i=>i.kind==='service'),applies=i=>services.filter(s=>s.cleaning_config?.extras?.includes(i.id));
 const rows=items.filter(i=>i.kind===selected&&(!search||(i.name+' '+i.description).toLowerCase().includes(search.toLowerCase()))&&(status==='all'||i.is_active===(status==='active'))&&(selected!=='extra'||!service||applies(i).some(s=>s.id===service)));
 const filterForm=`<form class="catalogue-filters" method="get" action="/catalogue"><input type="hidden" name="business" value="${esc(business.id)}"><input type="hidden" name="view" value="${selected}"><label>Search ${selected==='extra'?'extras':'services'}<input type="search" name="q" maxlength="120" value="${esc(search)}" placeholder="Search by name or description"></label><div class="catalogue-filter-field"><label for="catalogue-status">Status</label><select data-dropdown id="catalogue-status" name="status"><option value="all">All statuses</option>${[['active','Active'],['inactive','Inactive']].map(([v,t])=>`<option value="${v}"${status===v?' selected':''}>${t}</option>`).join('')}</select></div>${selected==='extra'?`<div class="catalogue-filter-field"><label for="catalogue-service">Applies to</label><select data-dropdown id="catalogue-service" name="service"><option value="">All services</option>${services.map(s=>`<option value="${esc(s.id)}"${service===s.id?' selected':''}>${esc(s.name)}</option>`).join('')}</select></div>`:''}<button type="submit">Filter</button>${search||status!=='all'||service?`<a href="${root}${selected==='extra'?'&amp;view=extra':''}">Clear filters</a>`:''}</form>`;
 return intro+`<section class="catalogue-toolbar">${tabs}${filterForm}</section><p class="catalogue-result-count" role="status">${rows.length} of ${items.filter(i=>i.kind===selected).length} ${selected==='extra'?'extras':'services'}</p>${items.length>=500?'<p>Showing the first 500 catalogue items.</p>':''}<section class="panel catalogue-list" aria-label="${selected==='extra'?'Extras':'Services'}"><div class="catalogue-columns" aria-hidden="true"><span>Name</span><span>${selected==='extra'?'Charge':'Base price / rate'}</span><span>${selected==='extra'?'Applies to':'Team / base duration'}</span><span>Status</span><span>Actions</span></div>${rows.map(i=>{
 const memberships=applies(i),cfg=i.cleaning_config,assessment=cfg?.manual_duration;
 const description=i.description?`<p class="catalogue-description">${esc(i.description)}</p>`:'';
 const timing=assessment?'Assessment required':cfg?`${cfg.base_minutes} min base`:i.cleaning_profile?'Setup incomplete':'Duration set per booking';
 const actions=canManage?`<div class="catalogue-actions"><a class="catalogue-edit" aria-label="Edit ${esc(i.name)}" href="${base}&amp;item=${encodeURIComponent(i.id)}#catalogue-editor">Edit ${selected==='extra'?'extra':'service'}</a><details class="catalogue-more"><summary aria-label="Actions for ${esc(i.name)}">Actions</summary><div>${i.is_active?`<a href="${base}&amp;item=${encodeURIComponent(i.id)}&amp;deactivate=1">Deactivate</a>`:`<a href="${base}&amp;item=${encodeURIComponent(i.id)}#catalogue-editor">Edit to activate</a>`}<a class="catalogue-delete" aria-label="Delete ${esc(i.name)}" href="${base}&amp;item=${encodeURIComponent(i.id)}&amp;delete=1">Delete ${selected==='extra'?'extra':'service'}</a></div></details></div>`:'<span class="muted">Read only</span>';
 return `<article class="catalogue-row catalogue-compact"><div class="catalogue-name"><h3>${esc(i.name)}</h3>${description}</div><div class="catalogue-price"><span class="sr-only">${i.cleaning_profile?'Base price':'Charge'}: </span>${esc(money(i.price_cents))}<small>${i.cleaning_profile?'Base · room charges and extras added':i.pricing_model==='hourly'?'Per hour':'Per '+esc(i.unit_label)}</small></div><div class="catalogue-scope">${selected==='extra'?(memberships.length?memberships.map(s=>`<span class="catalogue-service-chip">${esc(s.name)}</span>`).join(''):'<span class="muted">Not linked to a service</span>'):`<span>${esc(i.team_size)} ${i.team_size===1?'cleaner':'cleaners'}</span><small>${esc(timing)}</small>`}</div><span class="catalogue-status ${i.is_active?'is-active':'is-inactive'}">${i.is_active?'Active':'Inactive'}</span>${actions}</article>`;
 }).join('')||'<p>No matching items. Adjust or clear your filters.</p>'}</section>`;
}
