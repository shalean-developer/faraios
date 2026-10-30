import test from 'node:test';
import assert from 'node:assert/strict';
import https from 'node:https';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createAccountingHandler} from '../src/t19-accounting-api.js';
import {sealCallback} from '../src/t19-callback-envelope.js';

test('real HTTPS adapter preserves original session, scoped cookie, replay denial and bounded encrypted POST',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'t19-return-'));
 t.after(()=>rm(dir,{recursive:true,force:true}));
 await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1']);
 const tls={key:await readFile(join(dir,'key.pem')),cert:await readFile(join(dir,'cert.pem'))};
 const keys=await crypto.subtle.generateKey({name:'RSA-OAEP',modulusLength:3072,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},false,['encrypt','decrypt']);
 let handler,exchanges=0,consumed=false;const seen=[];
 const sessions=new Set(['original','other']);
 const server=https.createServer(tls,(req,res)=>{seen.push(req.url);handler(req,res);});server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const origin='https://127.0.0.1:'+server.address().port,state='a'.repeat(64),code='synthetic-'+ 'x'.repeat(3000);
 handler=createAccountingHandler({origin,sessionCookie:'app_session',callbackPrivateKey:keys.privateKey,
  sessions:{read:async sid=>sessions.has(sid)?{userId:'verified-user'}:null,withOwner:async(s,b,fn)=>fn()},
  oauth:{begin:async()=>({authorizationUrl:'https://provider.invalid/consent'}),callback:async(sid,p)=>{
   if(sid!=='original'||p.state!==state||consumed)throw Error('denied');consumed=true;exchanges++;assert.equal(p.code,code);
  }}});
 const request=(path,{method='GET',body,cookie='__Secure-faraios_accounting_callback=original',from=origin}={})=>new Promise((resolve,reject)=>{
  const r=https.request(origin+path,{method,ca:tls.cert,headers:{Cookie:cookie,Origin:from,'Content-Type':'application/json'}},response=>{
   const chunks=[];response.on('data',x=>chunks.push(x));response.on('end',()=>resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks).toString()}));
  });r.on('error',reject);r.end(body);
 });
 const connect=await request('/accounting/11111111-1111-1111-1111-111111111111/connect',{method:'POST',cookie:'app_session=original',body:JSON.stringify({connection:'22222222-2222-2222-2222-222222222222'})});
 assert.equal(connect.status,303);assert.match(connect.headers['set-cookie'][0],/Path=\/accounting\/zoho\/;/);assert.match(connect.headers['set-cookie'][0],/HttpOnly; SameSite=Lax/);
 const page=await request('/accounting/zoho/return');assert.equal(page.status,200);assert.equal(page.headers['set-cookie'],undefined);assert.match(page.body,/history.replaceState/);
 const envelope=await sealCallback(keys.publicKey,{state,code}),body=JSON.stringify({envelope});assert(body.length>2048);
 assert.equal((await request('/accounting/zoho/return',{method:'POST',body,cookie:'__Secure-faraios_accounting_callback=missing'})).status,401);
 assert.equal((await request('/accounting/zoho/return',{method:'POST',body,from:'https://attacker.invalid'})).status,403);
 assert.equal((await request('/accounting/zoho/return',{method:'POST',body,cookie:'__Secure-faraios_accounting_callback=other'})).status,403);
 assert.equal(exchanges,0);
 const result=await request('/accounting/zoho/return',{method:'POST',body});assert.equal(result.status,200);assert.match(result.headers['set-cookie'][0],/Max-Age=0/);
 assert.equal((await request('/accounting/zoho/return',{method:'POST',body})).status,403);assert.equal(exchanges,1);
 assert.equal((await request('/accounting/zoho/callback?code=dummy&state='+state)).status,403);
 assert.equal((await request('/accounting/zoho/return?envelope=dummy')).status,403);
 assert.equal((await request('/accounting/zoho/return',{method:'POST',body:'x'.repeat(17001)})).status,403);
 sessions.delete('original');assert.equal((await request('/accounting/zoho/return')).status,401);
 assert(seen.every(url=>!url.includes(code)&&!url.includes(envelope)));
});

test('proxy carries a large encrypted return only with its verified callback session across actual mTLS',async t=>{
 const {createAccountingProxy}=await import('../src/t19-accounting-proxy.js');
 const {Readable}=await import('node:stream');
 const dir=await mkdtemp(join(tmpdir(),'t19-return-proxy-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 await promisify(execFile)('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=IP:127.0.0.1','-addext','extendedKeyUsage=serverAuth,clientAuth']);
 const tls={key:await readFile(join(dir,'key.pem')),cert:await readFile(join(dir,'cert.pem'))};tls.ca=tls.cert;
 let count=0;
 const server=https.createServer({...tls,requestCert:true,rejectUnauthorized:true},async(req,res)=>{
  assert.equal(req.socket.authorized,true);assert.equal(req.url,'/accounting/zoho/return');
  assert.equal(req.headers.cookie,'__Secure-faraios_accounting_callback=original');
  assert.equal(req.headers.authorization,'Bearer verified-dummy-token');assert.equal(req.headers['x-faraios-session'],'original');
  let body='';for await(const chunk of req)body+=chunk;assert.equal(body.length,5000);count++;res.end('dummy-success');
 });server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>new Promise(r=>{server.closeAllConnections();server.close(r);}));
 const proxy=createAccountingProxy({endpoint:'https://127.0.0.1:'+server.address().port+'/',tls});
 const invoke=async(url,body)=>{
  const req=Readable.from([body]);Object.assign(req,{url,method:'POST',headers:{cookie:'app_session=other; __Secure-faraios_accounting_callback=original',origin:'https://staging.example','content-type':'application/json',authorization:'Bearer forged','x-faraios-session':'forged'}});
  const out={};const res={writeHead(status){out.status=status;},end(body){out.body=body?.toString();}};
  await proxy({req,res,origin:'https://staging.example',cookieName:'app_session',auth:{withAccountingSession:async(sid,fn)=>{assert.equal(sid,'original');return fn({auth:{getSession:async()=>({data:{session:{access_token:'verified-dummy-token'}}})}});}}});return out;
 };
 assert.equal((await invoke('/accounting/zoho/return','x'.repeat(5000))).body,'dummy-success');assert.equal(count,1);
 assert.equal((await invoke('/accounting/zoho/return','x'.repeat(17001))).status,403);assert.equal(count,1);
});
