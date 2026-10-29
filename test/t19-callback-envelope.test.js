import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sealCallback,consumeCallback} from '../src/t19-callback-envelope.js';
const pair=()=>crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['encrypt','decrypt']);
test('callback encrypted round trip, session isolation, replay, tampering and expiry',async()=>{
 const {publicKey,privateKey}=await pair(),now=1000,state='a'.repeat(64),code='synthetic-code';
 const envelope=await sealCallback(publicKey,{state,code},now);
 assert(!Buffer.from(envelope,'base64url').toString().includes(code));
 // Models the existing atomic database consume contract; not hosted DB proof.
 const durable=new Set();let exchanges=0;
 const adapter=()=>({async callback(sid,p){if(sid!=='original-session'||p.state!==state||durable.has(state))throw Error('denied');durable.add(state);exchanges++;return {accepted:true};}});
 await assert.rejects(consumeCallback(privateKey,envelope,'other-session',adapter(),now));
 assert.equal(exchanges,0);
 assert.deepEqual(await consumeCallback(privateKey,envelope,'original-session',adapter(),now),{accepted:true});
 await assert.rejects(consumeCallback(privateKey,envelope,'original-session',adapter(),now));
 assert.equal(exchanges,1);
 await assert.rejects(consumeCallback(privateKey,envelope,'original-session',adapter(),now+120000));
 const bytes=Buffer.from(envelope,'base64url');bytes[50]^=1;
 await assert.rejects(consumeCallback(privateKey,bytes.toString('base64url'),'original-session',adapter(),now));
 await assert.rejects(consumeCallback((await pair()).privateKey,envelope,'original-session',adapter(),now));
 const unknown={async callback(){throw Error('sensitive-provider-detail');}};
 await assert.rejects(consumeCallback(privateKey,envelope,'original-session',unknown,now),e=>e.message==='callback_handoff_denied');
});
test('concurrent delivery invokes the atomic consume winner once',async()=>{
 const {publicKey,privateKey}=await pair(),state='b'.repeat(64),envelope=await sealCallback(publicKey,{state,code:'dummy'},1000);
 let consumed=false;const oauth={async callback(){if(consumed)throw Error('replay');consumed=true;return true;}};
 const outcomes=await Promise.allSettled(Array.from({length:8},()=>consumeCallback(privateKey,envelope,'session',oauth,1000)));
 assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);
});

test('relay returns only encrypted fragment to a fixed origin and refuses ambiguous requests',async()=>{
 const {createCallbackRelay}=await import('../src/t19-callback-relay.js');
 const {publicKey,privateKey}=await pair(),state='c'.repeat(64);
 const relay=createCallbackRelay({publicKey,returnUrl:'https://staging.example/accounting/zoho/return',now:()=>1000});
 const request=new Request('https://worker.example/accounting/zoho/callback?code=synthetic-only&state='+state,{headers:{Referer:'https://example.invalid/?sensitive=dummy'}});
 const response=await relay(request),destination=new URL(response.headers.get('Location'));
 assert.equal(response.status,303);assert.equal(destination.search,'');
 assert.equal(response.headers.get('Referrer-Policy'),'no-referrer');
 const result=await consumeCallback(privateKey,destination.hash.slice(1),'original-session',{callback:async(sid,p)=>({sid,...p})},1000);
 assert.equal(result.code,'synthetic-only');assert.equal(result.state,state);
 for(const suffix of ['&state='+state,'&redirect=https://evil.example','&code=second'])assert.equal((await relay(new Request(request.url+suffix))).status,403);
 assert.equal((await relay(new Request(request.url,{method:'POST'}))).status,403);
});
test('same-origin receiver completes the synthetic HTTP handoff and denies cross-origin requests',async()=>{
 const {createCallbackRelay,createCallbackReturn}=await import('../src/t19-callback-relay.js');
 const {publicKey,privateKey}=await pair(),origin='https://staging.example',state='d'.repeat(64);
 const relay=createCallbackRelay({publicKey,returnUrl:origin+'/accounting/zoho/return',now:()=>1000});
 const r=await relay(new Request('https://worker.example/accounting/zoho/callback?code=dummy&state='+state));
 const envelope=new URL(r.headers.get('Location')).hash.slice(1);
 let exchanges=0;
 const receiver=createCallbackReturn({origin,privateKey,consume:consumeCallback,readSession:async()=> 'verified-session',oauth:{async callback(sid,p){assert.equal(sid,'verified-session');assert.equal(p.state,state);exchanges++;}},now:()=>1000});
 const post=from=>new Request(origin+'/accounting/zoho/return',{method:'POST',headers:{Origin:from,'Content-Type':'application/json'},body:JSON.stringify({envelope})});
 assert.equal((await receiver(post('https://other.example'))).status,403);assert.equal(exchanges,0);
 assert.equal((await receiver(post(origin))).status,200);assert.equal(exchanges,1);
 const page=await receiver(new Request(origin+'/accounting/zoho/return'));
 assert.equal(page.headers.get('Referrer-Policy'),'no-referrer');assert.match(await page.text(),/history.replaceState/);
});
