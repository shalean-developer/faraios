// Trusted custody-internal adapter; no environment reads, worker token export,
// scheduler, automatic retries or live default transport. Deployment is gated.
import {bindingKey,credentialBinding} from './t19-c1.js';
import {zohoDomains} from './zoho-books.js';
const failure=()=>Object.assign(new Error('provider_unavailable'),{code:'provider_unavailable'});
const text=v=>typeof v==='string'&&v.length>0&&v.length<=4096&&!/[\r\n\0]/.test(v);
const clock=v=>Number.isSafeInteger(v)&&v>=0;

export function createZohoCustodyProvider({fetchImpl,now=Date.now}={}){
 if(typeof fetchImpl!=='function'||typeof now!=='function')throw failure();
 return Object.freeze({async refresh(input,material){
  let timer,reader;const controller=new AbortController();
  try{
   const b=credentialBinding(input);
   // Vault material carries its authenticated binding. Never accept caller pins.
   if(b.provider!=='zoho'||!['staging','production'].includes(b.environment)
     ||bindingKey(material?.binding)!==bindingKey(b)
     ||!Object.hasOwn(zohoDomains,material?.api_domain)
     ||![material.client_id,material.client_secret,material.refresh_token].every(text))throw failure();
   const domain=material.api_domain;
   const body=new URLSearchParams({grant_type:'refresh_token',client_id:material.client_id,
    client_secret:material.client_secret,refresh_token:material.refresh_token});
   const started=now();if(!clock(started))throw failure();
   const timeout=new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(failure());},12000);});
   const work=(async()=>{
    const response=await fetchImpl(zohoDomains[domain]+'/oauth/v2/token',{
     method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body,
     redirect:'error',signal:controller.signal,cache:'no-store'});
    if(response.redirected||!response.body?.getReader)throw failure();
    const length=response.headers?.get('content-length');
    if(length!=null&&(!/^\d+$/.test(length)||Number(length)>32768))throw failure();
    reader=response.body.getReader();const chunks=[];let size=0;
    while(true){const {done,value}=await reader.read();if(done)break;
     size+=value.byteLength;if(size>32768)throw failure();chunks.push(value);}
    const value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(chunks)));
    if(!value||typeof value!=='object'||Array.isArray(value))throw failure();
    // Only an explicit token-endpoint response can classify reauthorisation.
    // Zoho documents invalid_code for a deleted refresh token. Ambiguous HTTP,
    // proxy, permission and malformed responses must stay uncertain.
    if([200,400].includes(response.status)&&['invalid_code','invalid_grant'].includes(value.error)
      &&value.access_token===undefined&&value.refresh_token===undefined)return Object.freeze({kind:'invalid_grant'});
    if(!response.ok||value.error!==undefined||!text(value.access_token)||value.token_type!=='Bearer'
      ||value.api_domain!==domain||!Number.isSafeInteger(value.expires_in)||value.expires_in<1||value.expires_in>3600
      ||(value.refresh_token!==undefined&&!text(value.refresh_token)))throw failure();
    const finished=now(),expiresAt=started+value.expires_in*1000;
    if(!clock(finished)||finished<started||!Number.isSafeInteger(expiresAt)||finished>=expiresAt)throw failure();
    // Internal-only outcome. The core exports only status, never this token.
    return Object.freeze({kind:'success',access_token:value.access_token,expires_at:expiresAt,
     ...(value.refresh_token===undefined?{}:{refresh_token:value.refresh_token})});
   })();
   return await Promise.race([work,timeout]);
  }catch{throw failure();}
  finally{
   clearTimeout(timer);controller.abort();
   // Never let a broken transport's cancel promise prevent deadline completion.
   if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}
  }
 }});
}
