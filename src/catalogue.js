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
export function renderCatalogue(business,items,canManage,editing=null,message='',error=false,view='service'){
 const selected=view==='extra'?'extra':'service';
 const root='/catalogue?business='+encodeURIComponent(business.id),base=root+(selected==='extra'?'&amp;view=extra':''),s=editing??{};
 const field=(name,label,type='text',value=s[name]??'',max=120)=>`<label class="setup-field" for="${name}"${name==='team_size'?' data-setup-service-only':''}><span>${label}</span><input id="${name}" name="${name}" type="${type}" maxlength="${max}" value="${esc(value)}"${(['name','price','unit_label'].includes(name)||name==='team_size'&&s.kind==='service')?' required':''}${name==='price'?' inputmode="decimal"':''}${name==='team_size'?' min="1" max="100" step="1"':''}></label>`;
 const select=(name,label,choices,value)=>`<div class="setup-field"><label for="${name}">${label}</label><select data-dropdown id="${name}" name="${name}" required>${choices.map(([key,text])=>`<option value="${key}"${value===key?' selected':''}>${text}</option>`).join('')}</select></div>`;
 const price=s.price??(s.price_cents===undefined?'':(s.price_cents/100).toFixed(2));
 const form=canManage?`<section class="panel" id="catalogue-editor"><h2>${editing?.id?`Edit ${s.kind==='extra'?'extra':'service'}: ${esc(s.name)}`:'Add service or extra'}</h2><form class="settings-form catalogue-setup" method="post" action="${base}${editing?.id?'&amp;item='+encodeURIComponent(editing.id):''}">${editing?.id?`<input type="hidden" name="version" value="${esc(editing.version)}">`:''}${editing?.id?`<p>Item type: ${s.kind==='extra'?'Extra':'Service'}</p><input type="hidden" name="kind" value="${esc(s.kind)}">`:select('kind','Item type',[['','Select type'],['service','Service'],['extra','Extra']],s.kind)}<details class="setup-section" open><summary><span>${s.kind==='extra'?'1. Extra details':'1. Service details'}</span><small>${s.kind==='extra'?'Name and price':'Name, base price and team'}</small></summary><div class="setup-body"><div class="setup-grid">${field('name','Name')}${field('price',s.cleaning_profile?'Base visit price (R)':'Price (R)','text',price,20)}${s.kind==='extra'?'':field('team_size','Cleaners required','number',s.team_size??'',3)}${select('status','Status',[['inactive','Inactive'],['active','Active']],s.status??(s.is_active?'active':'inactive'))}</div><details class="setup-subsection"${!editing?.id?' open':''}><summary>Description and advanced details</summary><div class="setup-grid">${field('description','Description','text',s.description??'',2000)}${s.cleaning_profile?`<input type="hidden" name="pricing_model" value="fixed"><p class="muted">Cleaning profiles use a fixed base visit price plus the configured additions.</p>`:select('pricing_model','Pricing model',[['','Select pricing model'],['fixed','Fixed price'],['hourly','Per hour'],['per_unit','Per unit']],s.pricing_model)}${field('unit_label','Price unit, e.g. visit, hour or item','text',s.unit_label??'',40)}</div></details></div></details>${cleaningConfigForm(s,items)}<div class="setup-save"><p class="muted">These settings belong to ${esc(business.name)}. Existing bookings keep their saved prices.</p><button>${editing?.id?'Save changes':'Add item'}</button>${editing?.id?` <a href="${base}">Cancel edit</a>`:''}</div></form></section>`:'';
 const addForm=canManage&&!editing?.id?`<details class="catalogue-add"${error&&editing?' open':''}><summary>Add Service</summary>${form}</details>`:'';
 const tabs=`<section class="catalogue-header" aria-labelledby="catalogue-list-title"><h2 id="catalogue-list-title">Catalogue</h2><nav class="catalogue-tabs" aria-label="Catalogue category">${[['service','Services'],['extra','Extras']].map(([kind,label])=>`<a href="${root}${kind==='extra'?'&amp;view=extra':''}"${selected===kind?' aria-current="page"':''}>${label} <span>${items.filter(i=>i.kind===kind).length}</span></a>`).join('')}</nav></section>`;
 const money=value=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(value/100);
 return `<a href="/dashboard?business=${encodeURIComponent(business.id)}">← Back to ${esc(business.name)}</a>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}<section class="catalogue-top"><div class="catalogue-intro"><h1>Services, prices and extras</h1><p>${esc(business.name)} · ${canManage?'Owner configuration':'Read-only catalogue'}</p></div>${addForm}</section>${items.length>=500?'<p role="status">Showing the first 500 items.</p>':''}${canManage&&editing?.id?`<p><a href="${base}">Back to services and extras</a></p>`:tabs+[selected].map(kind=>`<section class="panel"><h2>${kind==='service'?'Services':'Extras'}</h2>${items.filter(i=>i.kind===kind).length?items.filter(i=>i.kind===kind).map(i=>`<article class="catalogue-row"><div class="catalogue-row-heading"><h3>${esc(i.name)}</h3>${canManage?`<div class="catalogue-actions"><a class="catalogue-edit" aria-label="Edit ${esc(i.name)}" href="${base}&amp;item=${encodeURIComponent(i.id)}#catalogue-editor">Edit ${kind==='service'?'service':'extra'}</a> <a class="catalogue-delete" aria-label="Delete ${esc(i.name)}" href="${base}&amp;item=${encodeURIComponent(i.id)}&amp;delete=1">Delete ${kind==='service'?'service':'extra'}</a></div>`:''}</div><div class="catalogue-meta"><span class="catalogue-price">${esc(money(i.price_cents))} <span>/ ${esc(i.unit_label)}</span></span><span class="catalogue-model">${esc(({fixed:'Fixed price',hourly:'Per hour',per_unit:'Per unit'})[i.pricing_model]??i.pricing_model)}</span><span class="catalogue-status ${i.is_active?'is-active':'is-inactive'}">${i.is_active?'Active':'Inactive'}</span></div>${i.description?`<p>${esc(i.description)}</p>`:''}${i.team_size?`<p>Team size: ${i.team_size}</p>`:''}</article>`).join(''):'<p>No items yet.</p>'}</section>`).join('')}${editing?.id?form:''}`;
}
