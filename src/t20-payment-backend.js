// Inactive backend-only composition. No credentials/config/network at import.
import {createClient} from '@supabase/supabase-js';
import config from '../config/staging.json' with {type:'json'};
const origin='https://xdmfyrsauvqznkloroxg.supabase.co';
const denied=()=>new Error('payment_backend_denied');
export function paymentBackendFetch(fetchImpl=globalThis.fetch){
 return async(input,init)=>{
  try{
   const q=new Request(input,init),u=new URL(q.url);
   const auth=q.method==='POST'&&u.pathname==='/auth/v1/token'&&['?grant_type=password','?grant_type=refresh_token'].includes(u.search)
    ||q.method==='GET'&&u.pathname==='/auth/v1/user'&&!u.search
    ||q.method==='POST'&&u.pathname==='/auth/v1/logout'&&u.search==='?scope=local';
   const rpc=q.method==='POST'&&['/rest/v1/rpc/t20_payment_backend','/rest/v1/rpc/t20_payment_checkout'].includes(u.pathname)&&!u.search;
   if(u.origin!==origin||u.username||u.password||u.hash||!auth&&!rpc||['accept-profile','content-profile'].some(h=>q.headers.has(h)&&q.headers.get(h)!=='public'))throw denied();
   const response=await fetchImpl(new Request(q,{redirect:'error',signal:AbortSignal.any([q.signal,AbortSignal.timeout(12000)])}));
   if(response.redirected)throw denied();
   if(!response.body){if(response.status===204&&q.method==='POST'&&u.pathname==='/auth/v1/logout')return new Response(null,{status:204,headers:response.headers});throw denied();}
   const reader=response.body.getReader(),chunks=[];let size=0;
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)throw denied();chunks.push(value);}}finally{await reader.cancel().catch(()=>{});}
   return new Response(Buffer.concat(chunks),{status:response.status,headers:response.headers});
  }catch{throw denied();}
 };
}
export async function createPaymentBackend({email,password,principalId,fetchImpl}){
 if(config.url!==origin||typeof email!=='string'||!email.includes('@')||typeof password!=='string'||!password||typeof principalId!=='string'||!/^[0-9a-f-]{36}$/i.test(principalId))throw denied();
 const client=createClient(origin,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:paymentBackendFetch(fetchImpl)}});
 let closed=false,refresh;
 try{
  const login=await client.auth.signInWithPassword({email,password});
  if(login.error||login.data?.user?.id!==principalId)throw denied();
  const verified=await client.auth.getUser();if(verified.error||verified.data?.user?.id!==principalId)throw denied();
 }catch{try{await client.auth.signOut({scope:'local'});}catch{}throw denied();}
 return Object.freeze({
  async rpc(action,input){
   try{
    if(closed||!['health','lookup','publish','claim','finish'].includes(action))throw denied();
    const s=await client.auth.getSession();if(s.error||!s.data?.session)throw denied();
    if(s.data.session.expires_at*1000<=Date.now()+60000){
     if(!refresh)refresh=(async()=>{const v=await client.auth.refreshSession();if(v.error||v.data?.user?.id!==principalId)throw denied();})().finally(()=>{refresh=undefined;});
     await refresh;
    }
    const r=await client.rpc(['claim','finish'].includes(action)?'t20_payment_checkout':'t20_payment_backend',{action,input});if(r.error)throw denied();return r.data;
   }catch{throw denied();}
  },
  async close(){if(closed)return;closed=true;try{const r=await client.auth.signOut({scope:'local'});if(r.error)throw denied();}catch{throw denied();}}
 });
}
