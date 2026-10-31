// Dedicated non-business Auth identity. No service-role key/JWT signing secret.
import {createClient} from '@supabase/supabase-js';
import {stagingDatabase} from './hosted-staging.js';
import config from '../config/staging.json' with {type:'json'};
export function standardBackendFetch(fetchImpl=globalThis.fetch){
 return async(input,init)=>{
  const r=new Request(input,init),u=new URL(r.url);
  const auth=u.pathname==='/auth/v1/token'&&r.method==='POST'&&['?grant_type=password','?grant_type=refresh_token'].includes(u.search)
   ||u.pathname==='/auth/v1/user'&&r.method==='GET'&&!u.search;
  const rpc=['/rest/v1/rpc/t19_standard_store','/rest/v1/rpc/t19_standard_jobs'].includes(u.pathname)&&r.method==='POST'&&!u.search;
  if(u.origin!==stagingDatabase||u.username||u.password||u.hash||!auth&&!rpc||['accept-profile','content-profile'].some(h=>r.headers.has(h)&&r.headers.get(h)!=='public'))throw Error('accounting_backend_request_denied');
  const signal=AbortSignal.any([r.signal,AbortSignal.timeout(12000)]);
  const response=await fetchImpl(new Request(r,{redirect:'error',signal}));
  if(response.redirected)throw Error('accounting_backend_request_denied');
  const reader=response.body?.getReader();if(!reader)throw Error('accounting_backend_response_denied');
  let size=0;const chunks=[];
  try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>262144)throw Error('accounting_backend_response_denied');chunks.push(value);}}
  finally{try{await reader.cancel();}catch{}}
  return new Response(Buffer.concat(chunks),{status:response.status,headers:response.headers});
 };
}
export async function createStandardBackendClient({email,password,principalId,fetchImpl}){
 if(typeof email!=='string'||!email.includes('@')||typeof password!=='string'||!password||!principalId)throw Error('accounting_backend_configuration_rejected');
 const client=createClient(stagingDatabase,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:standardBackendFetch(fetchImpl)}});
 async function login(){
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||data?.user?.id!==principalId)throw Error('accounting_backend_authentication_failed');
  const verified=await client.auth.getUser();if(verified.error||verified.data?.user?.id!==principalId)throw Error('accounting_backend_authentication_failed');
 }
 try{await login();}catch{throw Error('accounting_backend_authentication_failed');}
 let refreshFlight;
 return Object.freeze({async rpc(name,args){
  if(!['t19_standard_store','t19_standard_jobs'].includes(name))throw Error('accounting_backend_request_denied');
  const session=await client.auth.getSession();if(session.error||!session.data.session)throw Error('accounting_backend_authentication_failed');
  if(session.data.session.expires_at*1000<=Date.now()+60000){
   if(!refreshFlight)refreshFlight=(async()=>{const r=await client.auth.refreshSession();if(r.error||r.data.user?.id!==principalId)throw Error('accounting_backend_authentication_failed');})().finally(()=>{refreshFlight=undefined;});
   await refreshFlight;
  }
  return client.rpc(name,args);
 }});
}
