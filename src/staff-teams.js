import {validCustomerId} from './customers.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export async function staffAccounts(client,businessId){const {data,error}=await client.rpc('staff_context',{p_business_id:businessId});if(error||!Array.isArray(data))throw new Error('Staff list unavailable');return data;}
export async function listStaffRecords(client,businessId,kind){
 const rows=[],seen=new Set();for(let start=0;;start+=500){const {data,error}=await client.from(kind==='team'?'staff_teams':'staff_profiles').select('*').eq('business_id',businessId).order('id').range(start,start+499);if(error||!Array.isArray(data)||data.some(r=>r.business_id!==businessId||seen.has(r.id)))throw new Error('Staff records unavailable');for(const row of data){seen.add(row.id);rows.push(row);}if(data.length<500)return rows;}
}
export function parseStaffRecord(form,kind){
 const text=(key,max,required=false)=>{const v=(form.get(key)??'').trim();if(v.length>max||required&&!v)throw new Error('Check '+key.replaceAll('_',' ')+'.');return v;};
 if(kind==='profile'){const user_id=text('user_id',36,true);if(!validCustomerId(user_id))throw new Error('Select an authorised staff account.');return {user_id,display_name:text('display_name',160,true),phone:text('phone',40)};}
 if(kind!=='team')throw new Error('Invalid staff record type.');
 const members=form.getAll('members');if(!members.length||members.length>100||!members.every(validCustomerId)||new Set(members).size!==members.length)throw new Error('Select between 1 and 100 distinct staff.');
 const status=text('status',10,true);if(!['active','inactive'].includes(status))throw new Error('Select team status.');
 return {name:text('name',120,true),members,is_active:status==='active'};
}
export async function saveStaffRecord(client,businessId,kind,row,{id,version}={}){
 const table=kind==='team'?'staff_teams':'staff_profiles';let q;
 if(id){if(!validCustomerId(id)||!Number.isSafeInteger(version)||version<1)throw new Error('Invalid staff record version');q=client.from(table).update(row).eq('business_id',businessId).eq('id',id).eq('version',version);}
 else q=client.from(table).insert({...row,business_id:businessId});
 const {data,error}=await q.select('id');if(error)throw new Error('Staff record could not be saved. Check active membership and try again.');if(data?.length!==1){const e=new Error('This record changed. Reopen it before saving.');e.status=409;throw e;}return data[0].id;
}
export async function resolveAssignedTeam(client,businessId,form){
 const id=form.get('team_id');if(!id)return form;
 if(!validCustomerId(id))throw new Error('Select an active team.');
 const teams=await listStaffRecords(client,businessId,'team'),team=teams.find(t=>t.id===id&&t.is_active);if(!team)throw new Error('This team is unavailable.');
 const accounts=await staffAccounts(client,businessId);if(team.members.some(id=>!accounts.some(a=>a.user_id===id)))throw new Error('This team contains staff without active business membership. Update the team first.');
 const next=new URLSearchParams(form);next.delete('assigned_staff');for(const member of team.members)next.append('assigned_staff',member);return next;
}
export function renderStaffTeams(business,accounts,profiles,teams,canManage,{kind='profile',editing=null,creating=false,values=null,message='',error=false}={}){
 const base='/staff?business='+encodeURIComponent(business.id),category=kind==='team'?'Teams':'Staff',itemLabel=kind==='team'?'team':'staff profile',back=base+(kind==='team'?'&amp;view=team':'');
 const label=id=>accounts.find(a=>a.user_id===id)?.label??'Unavailable staff account',s=values??editing??{};
 const available=accounts.filter(a=>!profiles.some(p=>p.user_id===a.user_id));
 const focused=canManage&&!!(editing||creating||values),canAdd=kind==='team'?accounts.length>0:available.length>0;
 const input=(key,title,value='',max=160)=>`<label class="setup-field"><span>${title}</span><input id="${key}" name="${key}" value="${esc(value)}" maxlength="${max}"${key==='phone'?'':' required'}></label>`;
 const choices=selected=>accounts.map(a=>`<label class="day"><input type="checkbox" name="members" value="${esc(a.user_id)}"${selected.includes(a.user_id)?' checked':''}> ${esc(a.label)}</label>`).join('');
 const title=focused?`${editing?'Edit':'Add'} ${itemLabel}`:'Staff &amp; teams';
 const intro=`${focused?`<a class="catalogue-back" href="${back}">← Back to ${category.toLowerCase()}</a>`:''}<section class="catalogue-top${focused?' catalogue-editor-top':''}"><div class="catalogue-intro"><h1>${title}</h1><p>${esc(business.name)}${focused?'':` · ${canManage?'Owner setup':'Read-only setup'}`}</p></div>${canManage&&!focused?(canAdd?`<a class="catalogue-add-link" href="${back}&amp;create=${kind}">+ Add ${kind==='team'?'Team':'Staff profile'}</a>`:`<button class="catalogue-add-link" disabled>+ Add ${kind==='team'?'Team':'Staff profile'}</button>`):''}</section>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}`;
 if(focused){
  if(!editing&&!canAdd)return intro+`<section class="panel"><p>${accounts.length?'All authorised staff accounts already have profiles. Edit an existing profile from the Staff list.':'No active staff accounts. An owner must authorise staff membership before creating profiles or teams.'}</p><a href="${back}">Back to ${category.toLowerCase()}</a></section>`;
  const fields=kind==='profile'?`${editing?`<input type="hidden" name="user_id" value="${esc(editing.user_id)}"><p>Account: ${esc(label(editing.user_id))}</p>`:`<div class="setup-field"><label for="user_id">Staff account</label><select data-dropdown id="user_id" name="user_id" required><option value="">Select staff account</option>${available.map(a=>`<option value="${esc(a.user_id)}"${s.user_id===a.user_id?' selected':''}>${esc(a.label)}</option>`).join('')}</select></div>`}${input('display_name','Display name',s.display_name)}${input('phone','Contact number (optional)',s.phone,40)}`:`${input('name','Team name',s.name,120)}<div class="setup-field"><label for="status">Status</label><select data-dropdown name="status" id="status"><option value="active"${s.is_active===false?'':' selected'}>Active</option><option value="inactive"${s.is_active===false?' selected':''}>Inactive</option></select></div>`;
  return intro+`<section class="panel" id="staff-editor"><form class="settings-form catalogue-setup" method="post" action="${back}${editing?'&amp;item='+encodeURIComponent(editing.id):''}"><input type="hidden" name="kind" value="${kind}">${editing?`<input type="hidden" name="version" value="${editing.version}">`:''}<h2>${kind==='team'?'Team details':'Profile details'}</h2><div class="setup-grid">${fields}</div>${kind==='team'?`<fieldset><legend>Team members</legend>${choices(s.members??[])||'<p>No active staff accounts. Existing teams can be deactivated from the list.</p>'}</fieldset>`:''}<div class="setup-save"><p class="muted">Settings belong to ${esc(business.name)}. Saving this record does not grant business access.</p><button>Save ${kind==='team'?'team':'profile'}</button> <a href="${back}">Cancel${editing?' edit':''}</a></div></form></section>`;
 }
 const list=kind==='team'?teams:profiles;
 const tabs=`<nav class="catalogue-tabs" aria-label="Staff category"><a href="${base}"${kind==='profile'?' aria-current="page"':''}>Staff <span>${profiles.length}</span></a><a href="${base}&amp;view=team"${kind==='team'?' aria-current="page"':''}>Teams <span>${teams.length}</span></a></nav>`;
 const help=!canManage?'View staff and teams here; use saved teams when assigning bookings.':!canAdd?(accounts.length?'All authorised staff accounts already have profiles. Use Edit to update them.':'No active staff accounts. Authorise staff membership before creating profiles or teams.'):'Profiles and teams use existing authorised staff accounts.';
 const rows=list.map(r=>{
  const active=kind==='team'?r.is_active:accounts.some(a=>a.user_id===r.user_id);
  const actions=canManage?`<div class="catalogue-actions"><a class="catalogue-edit" href="${back}&amp;item=${encodeURIComponent(r.id)}" aria-label="Edit ${esc(kind==='team'?r.name:r.display_name)}">Edit</a>${kind==='team'&&r.is_active?`<details class="catalogue-more"><summary aria-label="Actions for ${esc(r.name)}">Actions</summary><div><form method="post" action="${back}&amp;item=${encodeURIComponent(r.id)}"><input type="hidden" name="kind" value="team"><input type="hidden" name="action" value="deactivate"><input type="hidden" name="version" value="${r.version}"><button class="secondary">Deactivate team</button></form></div></details>`:''}</div>`:'<span class="muted">Read only</span>';
  return `<article class="catalogue-row catalogue-compact"><div class="catalogue-name"><h3>${esc(kind==='team'?r.name:r.display_name)}</h3></div><div class="catalogue-price">${kind==='team'?`${r.members.length}<small>staff members</small>`:esc(r.phone||'No contact number')}</div><div class="catalogue-scope"><p class="catalogue-description">${kind==='team'?r.members.map(id=>esc(label(id))).join(', '):esc(label(r.user_id))}</p></div><span class="catalogue-status ${active?'is-active':'is-inactive'}">${active?'Active':'Inactive'}</span>${actions}</article>`;
 }).join('');
 return intro+`<section class="catalogue-toolbar">${tabs}</section><p class="catalogue-result-count" role="status">${list.length} ${kind==='team'?'teams':'staff profiles'}</p><section class="panel catalogue-list" aria-label="${category}"><div class="catalogue-columns" aria-hidden="true"><span>Name</span><span>${kind==='team'?'Team size':'Contact'}</span><span>${kind==='team'?'Members':'Staff account'}</span><span>Status</span><span>Actions</span></div>${rows||`<p>No saved ${kind==='team'?'teams':'staff profiles'} yet.</p>`}</section><p class="muted">${help}</p>`;
}
