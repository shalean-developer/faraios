import {accessibleBusinesses} from './access.js';
const roles=new Set(['owner','manager','staff']);
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Server adapter contract: a per-request Supabase client scoped to the user's
 * verified token with a publishable key, NEVER a service_role client.
 * Never authorise from browser persona, getSession(), or user-editable metadata.
 */
export async function resolveIdentity(client) {
  const result=await client.auth.getUser();
  const user=result?.data?.user;
  if(result?.error || !uuid.test(user?.id??''))throw new Error('Unauthenticated');
  const response=await client.from('business_memberships')
    .select('business_id,user_id,role,status').eq('user_id',user.id).eq('status','active');
  if(response?.error || !Array.isArray(response?.data))throw new Error('Membership lookup unavailable');
  const memberships=response.data.map(m=>{
    if(!m||m.user_id!==user.id||!uuid.test(m.business_id??'')||!roles.has(m.role)||m.status!=='active')throw new Error('Invalid membership response');
    return {userId:user.id,businessId:m.business_id,role:m.role,status:m.status};
  });
  return {userId:user.id,memberships,businessIds:accessibleBusinesses(user.id,memberships)};
}
