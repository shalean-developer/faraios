// T31 no-outbound staff invitation: owner receives single-use token to deliver manually.
// Actual email sending requires separate activation; recipient must independently verify identity.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function parseStaffInvitation(form){
 const email=String(form.get('email')??'').trim().toLowerCase(),role=form.get('role');
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!['staff','manager'].includes(role))
  throw Error('Check invitation email and role');
 return {email,role};
}
export async function createStaffInvitation(client,businessId,{email,role}) {
 if(!uuid.test(businessId))throw Error('Invalid business');
 const {data,error}=await client.rpc('t31_invite_staff',{p_business:businessId,p_email:email,p_role:role});
 if(error||!uuid.test(data??''))throw Error('Invitation could not be created');
 return data;
}
export async function acceptStaffInvitation(client,token) {
 if(!uuid.test(token??''))throw Error('Check invitation code');
 const {data,error}=await client.rpc('t31_accept_invite',{p_token:token});
 if(error||!uuid.test(data??''))throw Error('Invitation is unavailable or does not match your verified account');
 return data;
}
export const escapeInvitation=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

export async function listBusinessMembers(client,businessId){
 if(!uuid.test(businessId))throw Error('Invalid business');
 const {data,error}=await client.rpc('t31_staff_members',{p_business:businessId});
 if(error||!Array.isArray(data)||data.some(m=>!uuid.test(m.user_id)||!['owner','manager','staff'].includes(m.role)||!['active','suspended'].includes(m.status)))throw Error('Team access unavailable');
 return data;
}
export async function suspendBusinessMember(client,businessId,userId){
 if(!uuid.test(businessId)||!uuid.test(userId))throw Error('Invalid membership');
 const {data,error}=await client.rpc('t31_suspend_member',{p_business:businessId,p_user:userId});
 if(error||data!==true)throw Error('Membership change denied');
}

export function renderTeamAccess(business,users,currentUserId){
 const businessId=encodeURIComponent(business.id),e=escapeInvitation;
 const shortId=value=>e(value.slice(0,8)+'…'+value.slice(-4));
 const roles={owner:'Owner',manager:'Manager',staff:'Cleaner'};
 const rows=users.map(user=>{
  const self=user.user_id===currentUserId;
  return '<tr><td><strong>'+ (self?'You':'Member '+shortId(user.user_id))+'</strong><div class="member-id">ID <code>'+shortId(user.user_id)+'</code></div></td>'
   +'<td>'+roles[user.role]+'</td><td><span class="member-status '+(user.status==='active'?'is-active':'is-suspended')+'">'+(user.status==='active'?'Active':'Suspended')+'</span></td><td>'
   +(user.role==='owner'?'<span class="muted">Owner access</span>':user.status==='active'?'<form method="post" action="/team-members?business='+businessId+'"><input type="hidden" name="user" value="'+e(user.user_id)+'"><button class="secondary" type="submit" aria-label="Suspend access for member '+e(user.user_id.slice(-8))+'">Suspend access</button></form>':'<span class="muted">Access suspended</span>')+'</td></tr>';
 }).join('');
 return '<section class="team-access"><header class="team-access-heading"><div><h1>Team access</h1><p>Choose who can access this business.</p></div><a class="button" href="/team-invite?business='+businessId+'">Invite team member</a></header>'
  +'<section class="panel"><h2>Members <span class="member-count">'+users.length+'</span></h2><p class="muted">Only owners can invite people or suspend access.</p>'
  +'<div class="team-table-scroll"><table class="team-access-table"><caption class="sr-only">Business members and access</caption><thead><tr><th scope="col">Member</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Access</th></tr></thead><tbody>'+rows+'</tbody></table></div>'
  +(users.length?'':'<p>No members to display.</p>')+'</section><aside class="team-invite-note" aria-labelledby="invite-guide-title"><h2 id="invite-guide-title">Invitations</h2><ol><li>Create an invite.</li><li>Share the code privately.</li><li>They sign in and accept.</li></ol><p>No invitation email is sent.</p></aside></section>';
}

export function renderStaffInvitation(business,values={},detail=''){
 const back='/team-members?business='+encodeURIComponent(business.id),e=escapeInvitation;
 return '<section class="ui-page"><a class="module-back" href="'+back+'">← Back to access</a><h1>Invite member</h1><p>Give a manager or cleaner access to this business.</p>'
 +'<form class="panel ui-form" method="post" action="/team-invite?business='+encodeURIComponent(business.id)+'"><h2>Invitation</h2><div class="form-field"><label for="invite-email">Email</label><input id="invite-email" name="email" type="email" autocomplete="email" maxlength="254" value="'+e(values.email)+'" required></div>'
 +'<div class="form-field"><label for="invite-role">Role</label><select data-dropdown id="invite-role" name="role"><option value="staff"'+(values.role==='manager'?'':' selected')+'>Cleaner</option><option value="manager"'+(values.role==='manager'?' selected':'')+'>Manager</option></select></div><p class="muted">Share the code privately. No invitation email is sent.</p>'
 +'<div class="form-actions"><button type="submit">Create invitation</button><a class="button secondary" href="'+back+'">Cancel</a></div></form>'+ (detail?'<section class="panel invitation-result">'+detail+'</section>':'')+'</section>';
}
export function renderAcceptInvitation(message=''){
 return '<section class="ui-page"><a class="module-back" href="/dashboard">← Back to overview</a><h1>Join business</h1><p>Use the code shared by your business owner.</p>'
 +(message?'<p class="feedback feedback-error" role="alert">'+escapeInvitation(message)+'</p>':'')
 +'<form class="panel ui-form" method="post" action="/accept-invite"><div class="form-field"><label for="invite-code">Invitation code</label><input id="invite-code" name="token" maxlength="36" spellcheck="false" autocapitalize="none" aria-describedby="invite-code-help" required><small id="invite-code-help">Sign in with the verified email used for your invite.</small></div><div class="form-actions"><button type="submit">Join business</button><a class="button secondary" href="/dashboard">Cancel</a></div></form></section>';
}
