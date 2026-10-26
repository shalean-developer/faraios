import {resolveIdentity} from './identity.js';
import {createClient} from '@supabase/supabase-js';
export function createAccountingUserClientFactory({url,publishableKey}){
 const target=new URL(url);let publicKey=typeof publishableKey==='string'&&publishableKey.startsWith('sb_publishable_');
 if(!publicKey){try{publicKey=JSON.parse(Buffer.from(publishableKey.split('.')[1],'base64url').toString()).role==='anon';}catch{}}
 if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash||!publicKey)throw Error('configuration_rejected');
 return token=>createClient(url,publishableKey,{global:{headers:{Authorization:'Bearer '+token}},auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
}
// Per-request client factory MUST apply the supplied user access token to data
// requests with a publishable key. Never use service_role. No identity headers.
export function createVerifiedAccountingSessions({createUserClient,accessToken,sessionId}){
 if(typeof createUserClient!=='function'||typeof accessToken!=='string'||!accessToken||accessToken.length>16384
  ||typeof sessionId!=='string'||!sessionId)throw Error('accounting_denied');
 const client=createUserClient(accessToken);
 const api={
  async read(sid){
   if(sid!==sessionId)return null;
   try{
    const identity=await resolveIdentity({auth:{getUser:()=>client.auth.getUser(accessToken)},from:(...args)=>client.from(...args)});
    const {data,error}=await client.from('businesses').select('id,name').eq('status','active');
    if(error||!Array.isArray(data))return null;
    const businesses=data.filter(b=>identity.businessIds.includes(b.id));
    return {...identity,businesses,businessIds:businesses.map(b=>b.id),memberships:identity.memberships.filter(m=>businesses.some(b=>b.id===m.businessId))};
   }catch{return null;}
  },
  async withInvoices(sid,business,action){
   const user=await this.read(sid),role=user?.memberships.find(m=>m.businessId===business&&['owner','manager'].includes(m.role))?.role;
   if(!role)throw Error('accounting_denied');return action(client,user.businesses.find(b=>b.id===business),user.userId,role==='owner');
  },
  async withOwner(sid,business,action){return this.withInvoices(sid,business,(client,selected,_actor,owner)=>{if(!owner)throw Error('accounting_denied');return action(client,selected);});}
 };return Object.freeze(api);
}
