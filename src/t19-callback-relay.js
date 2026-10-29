// Inactive factory: explicit public key and fixed return URL, no configuration
// discovery. Must not be mounted until host logging and session tests pass.
import {sealCallback} from './t19-callback-envelope.js';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff'};
export function createCallbackRelay({publicKey,returnUrl,now=Date.now}){
 const target=new URL(returnUrl);
 if(target.protocol!=='https:'||target.username||target.password||target.search||target.hash||target.pathname!=='/accounting/zoho/return')throw Error('callback_configuration_denied');
 return async request=>{
  try{
   const u=new URL(request.url);
   if(request.method!=='GET'||u.pathname!=='/accounting/zoho/callback'||u.search.length>8192)throw Error();
   const entries=[...u.searchParams];
   if(entries.length!==2||u.searchParams.getAll('state').length!==1||u.searchParams.getAll('code').length!==1)throw Error();
   const envelope=await sealCallback(publicKey,{state:u.searchParams.get('state'),code:u.searchParams.get('code')},now());
   // Fragment is ciphertext and never sent in the return HTTP request. No
   // caller-supplied destination, code/state query or incoming Referer forwarded.
   return new Response(null,{status:303,headers:{...headers,Location:target.href+'#'+envelope}});
  }catch{return new Response('OAuth unavailable',{status:403,headers});}
 };
}

// Same-origin return page and receiver. readSession is the existing trusted
// session adapter, never a caller-selected identity. Deployment must supply it.
export function createCallbackReturn({origin,privateKey,readSession,oauth,consume,now=Date.now}){
 const base=new URL(origin);
 if(base.protocol!=='https:'||base.origin!==origin||typeof readSession!=='function'||typeof consume!=='function')throw Error('callback_configuration_denied');
 return async request=>{
  const u=new URL(request.url);
  if(u.origin!==origin||u.pathname!=='/accounting/zoho/return'||u.search)return new Response('Unavailable',{status:403,headers});
  if(request.method==='GET'){
   const nonce=btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24))));
   const script=`const envelope=location.hash.slice(1);history.replaceState(null,'','/accounting/zoho/return');if(envelope&&envelope.length<=16384){fetch('/accounting/zoho/return',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({envelope})}).then(r=>{document.body.textContent=r.ok?'Connection verification completed':'Connection verification unavailable';}).catch(()=>{document.body.textContent='Connection verification unavailable';});}`;
   return new Response('<!doctype html><meta charset="utf-8"><title>Accounting connection</title><body>Verifying connection<script nonce="'+nonce+'">'+script+'</script>',{headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':"default-src 'none'; script-src 'nonce-"+nonce+"'; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'none'"}});
  }
  try{
   if(request.method!=='POST'||request.headers.get('Origin')!==origin||request.headers.get('Content-Type')!=='application/json')throw Error();
   // Read with a byte cap even when Content-Length is absent or dishonest.
   const reader=request.body?.getReader();if(!reader)throw Error();let size=0;const parts=[];
   try{for(;;){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>17000)throw Error();parts.push(value);}}finally{await reader.cancel();}
   const bytes=new Uint8Array(size);let at=0;for(const part of parts){bytes.set(part,at);at+=part.length;}
   const payload=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
   if(Object.keys(payload).join(',')!=='envelope')throw Error();
   await consume(privateKey,payload.envelope,await readSession(request),oauth,now());
   return new Response('Verified',{status:200,headers});
  }catch{return new Response('Connection verification unavailable',{status:403,headers});}
 };
}
