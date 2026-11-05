// T31: authenticated, business-independent owner bootstrap adapter.
// No service-role credentials, tenant IDs or privileged support inputs.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function validateBusinessProvisioning({name,requestId}={}) {
  if(typeof name!=='string'||name!==name.trim()||name.length<1||name.length>160||/[\u0000-\u001f\u007f]/.test(name))throw new Error('Check business name');
  if(typeof requestId!=='string'||!UUID.test(requestId))throw new Error('Invalid request identifier');
  return {name,requestId:requestId.toLowerCase()};
}
export async function provisionBusiness(client,input) {
  const {name,requestId}=validateBusinessProvisioning(input);
  // A client must be backed by the caller's verified Supabase session, never service_role.
  const {data:auth,error:authError}=await client.auth.getUser();
  if(authError||!UUID.test(auth?.user?.id??'')||auth.user?.is_anonymous===true)throw new Error('Sign in before creating a business');
  const {data,error}=await client.rpc('t31_provision_business',{p_name:name,p_request_id:requestId});
  if(error||!UUID.test(data??''))throw new Error('Business creation unavailable; retry with the same request identifier');
  const businessId=data;
  // Response must be backed by a current owner membership; never trust the RPC value alone.
  const membership=await client.from('business_memberships').select('business_id,user_id,role,status')
    .eq('business_id',businessId).eq('user_id',auth.user.id).eq('status','active');
  if(membership.error||membership.data?.length!==1||membership.data[0]?.role!=='owner'||membership.data[0]?.business_id!==businessId||membership.data[0]?.user_id!==auth.user.id)throw new Error('Business ownership verification unavailable');
  return {businessId};
}
