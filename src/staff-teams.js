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
export function renderStaffTeams(business,accounts,profiles,teams,canManage,{kind='profile',editing=null,values=null,message='',error=false}={}){
 const base='/staff?business='+encodeURIComponent(business.id),label=id=>accounts.find(a=>a.user_id===id)?.label??'Unavailable staff account',s=values??editing??{};
 const input=(key,title,value='',max=160)=>`<label for="${key}">${title}</label><input id="${key}" name="${key}" value="${esc(value)}" maxlength="${max}"${key==='phone'?'':' required'}>`;
 const choices=selected=>accounts.map(a=>`<label class="day"><input type="checkbox" name="members" value="${esc(a.user_id)}"${selected.includes(a.user_id)?' checked':''}> ${esc(a.label)}</label>`).join('');
 const list=kind==='team'?teams:profiles;
 let result=`<h1>Staff &amp; teams</h1><p>${esc(business.name)} · ${canManage?'Owner setup':'Read-only setup; teams can be used for booking assignment'}</p><p class="muted">Only staff with active membership in this business can be added. Saving a profile or team never grants access to another business.</p>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}<nav class="catalogue-tabs" aria-label="Staff category"><a href="${base}"${kind==='profile'?' aria-current="page"':''}>Staff</a><a href="${base}&amp;view=team"${kind==='team'?' aria-current="page"':''}>Teams</a></nav><section class="panel"><h2>${kind==='team'?'Saved teams':'Staff profiles'}</h2>${list.map(r=>`<article class="catalogue-row"><div><h3>${esc(kind==='team'?r.name:r.display_name)}</h3><p>${kind==='team'?`${r.is_active?'Active':'Inactive'} · ${r.members.map(id=>esc(label(id))).join(', ')}`:esc(r.phone||'No contact number saved')}</p></div>${canManage?`<a href="${base}&amp;view=${kind}&amp;item=${encodeURIComponent(r.id)}#staff-editor">Edit</a>${kind==='team'&&r.is_active?`<form method="post" action="${base}&amp;view=team&amp;item=${encodeURIComponent(r.id)}"><input type="hidden" name="kind" value="team"><input type="hidden" name="action" value="deactivate"><input type="hidden" name="version" value="${r.version}"><button class="secondary">Deactivate team</button></form>`:''}`:''}</article>`).join('')||'<p>No saved records yet.</p>'}</section>`;
 if(!canManage)return result;
 result+=`<section class="panel" id="staff-editor"><h2>${editing?'Edit':'Add'} ${kind==='team'?'team':'staff profile'}</h2>${accounts.length?`<form class="settings-form" method="post" action="${base}&amp;view=${kind}${editing?'&amp;item='+encodeURIComponent(editing.id):''}"><input type="hidden" name="kind" value="${kind}">${editing?`<input type="hidden" name="version" value="${editing.version}">`:''}${kind==='profile'?`${editing?`<input type="hidden" name="user_id" value="${esc(editing.user_id)}"><p>Account: ${esc(label(editing.user_id))}</p>`:`<label for="user_id">Staff account</label><select data-dropdown id="user_id" name="user_id" required><option value="">Select staff account</option>${accounts.filter(a=>!profiles.some(p=>p.user_id===a.user_id)).map(a=>`<option value="${esc(a.user_id)}"${s.user_id===a.user_id?' selected':''}>${esc(a.label)}</option>`).join('')}</select>`}${input('display_name','Display name',s.display_name)}${input('phone','Contact number (optional)',s.phone,40)}`:`${input('name','Team name',s.name,120)}<fieldset><legend>Team members</legend>${choices(s.members??[])}</fieldset><label for="status">Status</label><select data-dropdown name="status" id="status"><option value="active"${s.is_active===false?'':' selected'}>Active</option><option value="inactive"${s.is_active===false?' selected':''}>Inactive</option></select>`}<button>Save ${kind==='team'?'team':'profile'}</button> <a href="${base}&amp;view=${kind}">Cancel</a></form>`:'<p>No active staff accounts. The owner must authorise a staff membership before creating profiles or teams.</p>'}</section>`;
 return result;
}
