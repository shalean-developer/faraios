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
