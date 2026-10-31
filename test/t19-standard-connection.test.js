import test from 'node:test';
import assert from 'node:assert/strict';
import {createTokenCipher,standardConfig} from '../src/t19-standard-secrets.js';
import {createStandardConnection} from '../src/t19-standard-connection.js';
import {createStandardProvider} from '../src/t19-standard-provider.js';
const config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.example.test',ZOHO_CLIENT_ID:'dummy-client',ZOHO_CLIENT_SECRET:'dummy-secret',ZOHO_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),ZOHO_TOKEN_KEY_ID:'test-v1',ZOHO_API_DOMAIN:'https://www.zohoapis.com'});
function fixture(){
 let clock=1000,role='owner',refreshes=0,revocationFails=false;
 const states=new Map(),connections=new Map(),locks=new Map();
 const store={
  async begin(s){states.set(s.digest,{...s});},async state(d){return states.get(d);},
  async consume(d,a,s,n){const p=states.get(d);assert.ok(p&&p.actor===a&&p.sessionDigest===s&&p.expiresAt>n);states.delete(d);},
  async resolve(){},
  async connection(e,b){return connections.get(e+':'+b)??null;},
  async lock(e,b,fn){const k=e+':'+b,old=locks.get(k)??Promise.resolve();let release;const next=new Promise(r=>release=r);locks.set(k,next);await old;try{return await fn();}finally{release();}},
  async save(c){connections.set(c.environment+':'+c.businessId,structuredClone(c));},
  async publish(c,organization){Object.assign(connections.get(c.environment+':'+c.businessId),{status:'connected',organization});},
  async refresh(c,envelope){connections.get(c.environment+':'+c.businessId).envelope=envelope;},
  async disable(c){connections.get(c.environment+':'+c.businessId).status='revocation_pending';},
  async revoked(c){Object.assign(connections.get(c.environment+':'+c.businessId),{status:'disconnected',envelope:null});}
 };
 const provider={consent:s=>'https://accounts.zoho.com/?state='+s,async exchange(){return {access_token:'dummy-access',refresh_token:'dummy-refresh',expires_in:3600};},async organization(_t,id){return {id,name:'Synthetic organisation',currency:'ZAR'};},async refresh(){refreshes++;return {access_token:'dummy-refreshed',expires_in:3600};},async revoke(){if(revocationFails)throw Error('synthetic');}};
 const sessions={async read(sid){return sid==='session'?{userId:'actor',businessIds:['a','b'],memberships:['a','b'].map(businessId=>({businessId,role}))}:null;}};
 const cipher=createTokenCipher(config),api=createStandardConnection({config,cipher,provider,store,sessions,now:()=>clock});
 const connect=async(b='a',o='123')=>{const u=await api.begin('session',{businessId:b,organizationId:o});const state=new URL(u.authorizationUrl).searchParams.get('state');return {state,result:await api.callback('session',{state,code:'dummy-code'})};};
 return {api,connect,connections,cipher,provider,setRole:v=>role=v,setTime:v=>clock=v,setRevokeFail:v=>revocationFails=v,refreshes:()=>refreshes};
}
test('AES-GCM binds every credential identity and detects tampering',()=>{
 const cipher=createTokenCipher(config),b={environment:'staging',businessId:'a',connectionId:'c',generation:1,organizationId:'123',apiDomain:config.apiDomain,clientId:config.clientId};
 const envelope=cipher.seal(b,{refreshToken:'synthetic-secret'});
 assert.ok(!JSON.stringify(envelope).includes('synthetic-secret'));assert.equal(cipher.open(b,envelope).refreshToken,'synthetic-secret');
 for(const delta of [{environment:'production'},{businessId:'b'},{connectionId:'d'},{generation:2},{organizationId:'456'},{clientId:'other'},{apiDomain:'https://www.zohoapis.eu'}])assert.throws(()=>cipher.open({...b,...delta},envelope));
 assert.throws(()=>cipher.open(b,{...envelope,body:'AAAA'}));
});
test('owner callback stores ciphertext and returns only verified organisation',async()=>{
 const f=fixture();const {state,result}=await f.connect();assert.equal(result.organization.id,'123');
 assert.ok(!JSON.stringify(await f.api.status('session',{businessId:'a'})).includes('dummy-access'));
 assert.ok(!JSON.stringify([...f.connections.values()]).includes('dummy-refresh'));
 await assert.rejects(()=>f.api.callback('session',{state,code:'dummy-code'}));
});
test('OAuth rejects wrong session, expired state and removed owner',async()=>{
 for(const kind of ['session','expiry','owner']){
  const f=fixture(),u=await f.api.begin('session',{businessId:'a',organizationId:'123'}),state=new URL(u.authorizationUrl).searchParams.get('state');
  if(kind==='expiry')f.setTime(301001);if(kind==='owner')f.setRole('manager');
  await assert.rejects(()=>f.api.callback(kind==='session'?'other':'session',{state,code:'dummy-code'}));assert.equal(f.connections.size,0);
 }
});
test('concurrent access refreshes once and disconnect fences subsequent access',async()=>{
 const f=fixture();await f.connect();f.setTime(3600000);
 const results=await Promise.all(Array.from({length:8},()=>f.api.access('a',t=>t)));
 assert.ok(results.every(t=>t==='dummy-refreshed'));assert.equal(f.refreshes(),1);
 assert.equal((await f.api.disconnect('session',{businessId:'a'})).providerRevoked,true);
 await assert.rejects(()=>f.api.access('a',()=>assert.fail()));
});
test('failed revocation stays disabled, retains encrypted retry material',async()=>{
 const f=fixture();await f.connect();f.setRevokeFail(true);
 assert.equal((await f.api.disconnect('session',{businessId:'a'})).status,'revocation_pending');
 await assert.rejects(()=>f.api.access('a',()=>assert.fail()));
 f.setRevokeFail(false);assert.equal((await f.api.disconnect('session',{businessId:'a'})).status,'disconnected');
});
test('business tokens cannot be substituted; non-owner cannot disconnect',async()=>{
 const f=fixture();await f.connect('a','123');await f.connect('b','456');
 const a=f.connections.get('staging:a'),b=f.connections.get('staging:b');b.envelope=a.envelope;
 await assert.rejects(()=>f.api.access('b',()=>assert.fail()));
 f.setRole('manager');await assert.rejects(()=>f.api.disconnect('session',{businessId:'a'}));
});
test('failed organisation verification leaves a disabled revocable grant',async()=>{
 const f=fixture();f.provider.organization=async()=>{throw Error('synthetic');};await assert.rejects(()=>f.connect());
 assert.equal(f.connections.get('staging:a').status,'revocation_pending');await assert.rejects(()=>f.api.access('a',()=>assert.fail()));
});
test('provider never puts credentials in URL; regional token mismatch is rejected',async()=>{
 const calls=[];
 const provider=createStandardProvider({...config,fetchImpl:async(url,options)=>{calls.push({url,options});return Response.json({access_token:'synthetic',expires_in:3600,api_domain:'https://www.zohoapis.eu'});}});
 await assert.rejects(()=>provider.refresh('dummy-refresh'));
 assert.ok(!calls[0].url.includes('dummy'));assert.equal(calls[0].options.redirect,'error');assert.equal(calls[0].options.body.get('client_secret'),'dummy-secret');
 const u=new URL(provider.consent('synthetic-state'));assert.equal(u.searchParams.get('access_type'),'offline');assert.equal(u.searchParams.get('prompt'),'consent');
});
test('private owner provisioning uses encrypted independent grants and ordinary refresh/disconnect',async()=>{
 const f=fixture();
 await f.api.provision('session',{businessId:'a',organizationId:'123',refreshToken:'synthetic-private-a'});
 await f.api.provision('session',{businessId:'b',organizationId:'456',refreshToken:'synthetic-private-b'});
 const a=f.connections.get('staging:a'),b=f.connections.get('staging:b');
 assert.equal(f.cipher.open(a,a.envelope).refreshToken,'synthetic-private-a');
 assert.equal(f.cipher.open(b,b.envelope).refreshToken,'synthetic-private-b');
 assert.ok(!JSON.stringify([...f.connections.values()]).includes('synthetic-private'));
 assert.equal(f.refreshes(),2);
 await f.api.access('a',()=>{});assert.equal(f.refreshes(),3);
 await assert.rejects(()=>f.api.provision('session',{businessId:'a',organizationId:'123',refreshToken:'replacement'}));
 await f.api.disconnect('session',{businessId:'a'});
 assert.equal(b.status,'connected');await assert.rejects(()=>f.api.access('a',()=>{}));
});
test('private provisioning denies non-owner and preserves revocable ciphertext on provider failure',async()=>{
 const f=fixture();f.setRole('manager');
 await assert.rejects(()=>f.api.provision('session',{businessId:'a',organizationId:'123',refreshToken:'synthetic-private'}));assert.equal(f.connections.size,0);
 f.setRole('owner');f.provider.organization=async()=>{throw Error('synthetic-private must not escape');};
 await assert.rejects(()=>f.api.provision('session',{businessId:'a',organizationId:'123',refreshToken:'synthetic-private'}));
 assert.equal(f.connections.get('staging:a').status,'revocation_pending');
 await assert.rejects(()=>f.api.access('a',()=>assert.fail()));
 await f.api.disconnect('session',{businessId:'a'});assert.equal(f.connections.get('staging:a').envelope,null);
});
test('Self Client exchange runs only after owner checks and never returns grant material',async()=>{
 const f=fixture();let exchanges=0;
 f.provider.exchangePrivateCode=async code=>{assert.equal(code,'synthetic-code');exchanges++;return {refresh_token:'synthetic-issued-refresh'};};
 f.setRole('manager');await assert.rejects(()=>f.api.provision('session',{businessId:'a',organizationId:'123',grantCode:'synthetic-code'}));assert.equal(exchanges,0);
 f.setRole('owner');const result=await f.api.provision('session',{businessId:'a',organizationId:'123',grantCode:'synthetic-code'});
 assert.equal(exchanges,1);assert.ok(!JSON.stringify(result).includes('synthetic'));assert.equal(f.cipher.open(f.connections.get('staging:a'),f.connections.get('staging:a').envelope).refreshToken,'synthetic-issued-refresh');
});
test('Self Client token exchange puts code and credentials in POST body without redirect',async()=>{
 let request;
 const p=createStandardProvider({...config,fetchImpl:async(url,options)=>{request={url,options};return Response.json({access_token:'synthetic-access',refresh_token:'synthetic-refresh',expires_in:3600,api_domain:config.apiDomain});}});
 await p.exchangePrivateCode('synthetic-code');
 assert.equal(request.url,'https://accounts.zoho.com/oauth/v2/token');assert.equal(request.options.method,'POST');
 assert.equal(request.options.body.get('code'),'synthetic-code');assert.equal(request.options.body.has('redirect_uri'),false);assert.equal(request.options.redirect,'error');
});
