// Portable Web Crypto handoff. Inactive: no listener, keys, logging or provider calls.
const fail=()=>Error('callback_handoff_denied');
const enc=new TextEncoder();
const encode=b=>btoa(String.fromCharCode(...new Uint8Array(b))).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const decode=s=>{if(typeof s!=='string'||s.length>16384||!/^[A-Za-z0-9_-]+$/.test(s))throw fail();const b=Uint8Array.from(atob(s.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));if(encode(b)!==s)throw fail();return b;};
const text=s=>typeof s==='string'&&s.length>0&&enc.encode(s).length<=4096&&!/[\r\n\0]/.test(s);
const label=enc.encode('faraios:t19:callback:v1');
// The Worker receives only the custody public key. The original session stays
// on FaraiOS; existing oauth.consume provides durable state/session ownership.
export async function sealCallback(publicKey,{state,code},now=Date.now()){
 try{
  if(!/^[a-f0-9]{64}$/.test(state)||!text(code)||!Number.isSafeInteger(now))throw fail();
  const aes=await crypto.subtle.generateKey({name:'AES-GCM',length:256},true,['encrypt']);
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const payload=enc.encode(JSON.stringify({version:1,state,code,expiresAt:now+120000}));
  const ciphertext=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:label},aes,payload);
  const wrapped=await crypto.subtle.encrypt({name:'RSA-OAEP',label},publicKey,await crypto.subtle.exportKey('raw',aes));
  return encode(enc.encode(JSON.stringify({iv:encode(iv),wrapped:encode(wrapped),ciphertext:encode(ciphertext)})));
 }catch{throw fail();}
}
export async function consumeCallback(privateKey,envelope,sid,oauth,now=Date.now()){
 try{
  if(!text(sid)||typeof oauth?.callback!=='function'||!Number.isSafeInteger(now))throw fail();
  const e=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decode(envelope)));
  if(Object.keys(e).sort().join(',')!=='ciphertext,iv,wrapped')throw fail();
  const iv=decode(e.iv);if(iv.length!==12)throw fail();
  const raw=await crypto.subtle.decrypt({name:'RSA-OAEP',label},privateKey,decode(e.wrapped));
  const aes=await crypto.subtle.importKey('raw',raw,{name:'AES-GCM'},false,['decrypt']);
  const bytes=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:label},aes,decode(e.ciphertext));
  const p=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
  if(Object.keys(p).sort().join(',')!=='code,expiresAt,state,version'||p.version!==1||!Number.isSafeInteger(p.expiresAt)||p.expiresAt<=now||p.expiresAt>now+120000||!/^[a-f0-9]{64}$/.test(p.state)||!text(p.code))throw fail();
  // No token exchange here. The existing custody flow must independently
  // authenticate sid and atomically consume its server-bound state first.
  return await oauth.callback(sid,{state:p.state,code:p.code});
 }catch{throw fail();}
}
