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
