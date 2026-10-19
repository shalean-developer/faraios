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
export function renderCatalogueDelete(business,item){
 const base='/catalogue?business='+encodeURIComponent(business.id);
 return `<h1>Delete ${item.kind==='extra'?'extra':'service'}?</h1><p>Delete <strong>${esc(item.name)}</strong> from ${esc(business.name)}? This removes the saved item. Its audit history is retained.</p><form method="post" action="${base}&amp;item=${encodeURIComponent(item.id)}"><input type="hidden" name="action" value="delete"><input type="hidden" name="version" value="${esc(item.version)}"><button>Confirm delete</button> <a href="${base}">Cancel</a></form>`;
}
export function renderCatalogue(business,items,canManage,editing=null,message='',error=false){
 const base='/catalogue?business='+encodeURIComponent(business.id),s=editing??{};
 const field=(name,label,type='text',value=s[name]??'',max=120)=>`<label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" maxlength="${max}" value="${esc(value)}"${['name','price','unit_label'].includes(name)?' required':''}${name==='price'?' inputmode="decimal"':''}>`;
 const select=(name,label,choices,value)=>`<label for="${name}">${label}</label><select data-dropdown id="${name}" name="${name}" required>${choices.map(([key,text])=>`<option value="${key}"${value===key?' selected':''}>${text}</option>`).join('')}</select>`;
 const price=s.price??(s.price_cents===undefined?'':(s.price_cents/100).toFixed(2));
 const form=canManage?`<section class="panel" id="catalogue-editor"><h2>${editing?.id?`Edit ${s.kind==='extra'?'extra':'service'}: ${esc(s.name)}`:'Add service or extra'}</h2><form class="settings-form" method="post" action="${base}${editing?.id?'&amp;item='+encodeURIComponent(editing.id):''}">${editing?.id?`<input type="hidden" name="version" value="${esc(editing.version)}">`:''}${editing?.id?`<p>Item type: ${s.kind==='extra'?'Extra':'Service'}</p><input type="hidden" name="kind" value="${esc(s.kind)}">`:select('kind','Item type',[['','Select type'],['service','Service'],['extra','Extra']],s.kind)}${field('name','Name')}${field('description','Description','text',s.description??'',2000)}${select('pricing_model','Pricing model',[['','Select pricing model'],['fixed','Fixed price'],['hourly','Per hour'],['per_unit','Per unit']],s.pricing_model)}${field('price','Price (ZAR)','text',price,20)}${field('unit_label','Unit label, e.g. visit, hour or room','text',s.unit_label??'',40)}${field('team_size','Team size — required for services; ignored for extras','number',s.team_size??'',3)}${select('status','Status',[['inactive','Inactive'],['active','Active']],s.status??(s.is_active?'active':'inactive'))}${cleaningConfigForm(s,items)}<p class="muted">Prices belong to ${esc(business.name)}. Saved bookings keep their original price and configuration snapshots.</p><button>${editing?.id?'Save changes':'Add item'}</button>${editing?.id?` <a href="${base}">Cancel edit</a>`:''}</form></section>`:'';
 const money=value=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(value/100);
 return `<a href="/dashboard?business=${encodeURIComponent(business.id)}">← Back to ${esc(business.name)}</a><h1>Services, prices and extras</h1><p>${esc(business.name)} · ${canManage?'Owner configuration':'Read-only catalogue'}</p>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}${items.length>=500?'<p role="status">Showing the first 500 items.</p>':''}${['service','extra'].map(kind=>`<section class="panel"><h2>${kind==='service'?'Services':'Extras'}</h2>${items.filter(i=>i.kind===kind).length?items.filter(i=>i.kind===kind).map(i=>`<article class="catalogue-row"><div class="catalogue-row-heading"><h3>${esc(i.name)}</h3>${canManage?`<div class="catalogue-actions"><a class="catalogue-edit" aria-label="Edit ${esc(i.name)}" href="${base}&amp;item=${encodeURIComponent(i.id)}#catalogue-editor">Edit ${kind==='service'?'service':'extra'}</a> <a class="catalogue-delete" aria-label="Delete ${esc(i.name)}" href="${base}&amp;item=${encodeURIComponent(i.id)}&amp;delete=1">Delete ${kind==='service'?'service':'extra'}</a></div>`:''}</div><div class="catalogue-meta"><span class="catalogue-price">${esc(money(i.price_cents))} <span>/ ${esc(i.unit_label)}</span></span><span class="catalogue-model">${esc(({fixed:'Fixed price',hourly:'Per hour',per_unit:'Per unit'})[i.pricing_model]??i.pricing_model)}</span><span class="catalogue-status ${i.is_active?'is-active':'is-inactive'}">${i.is_active?'Active':'Inactive'}</span></div>${i.description?`<p>${esc(i.description)}</p>`:''}${i.team_size?`<p>Team size: ${i.team_size}</p>`:''}</article>`).join(''):'<p>No items yet.</p>'}</section>`).join('')}${form}`;
}
