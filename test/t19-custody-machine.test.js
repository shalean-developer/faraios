import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,connect} from 'node:tls';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createCustodyMachineAuthenticator} from '../src/t19-custody-machine.js';

test('machine identity uses actual verified TLS peer and current server record',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'faraios-custody-tls-'));
 const sockets=new Set();let server;
 try{
  const openssl=process.platform==='win32'?'C:/Program Files/Git/usr/bin/openssl.exe':'openssl';
  await promisify(execFile)(openssl,['req','-x509','-newkey','rsa:2048','-nodes','-keyout',join(dir,'key.pem'),'-out',join(dir,'cert.pem'),'-days','1','-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost','-addext','extendedKeyUsage=serverAuth,clientAuth']);
  const key=await readFile(join(dir,'key.pem')),cert=await readFile(join(dir,'cert.pem'));
  let active=true,wrongPin=false,lookupCalls=0,lookupError=false;
  const auth=createCustodyMachineAuthenticator({findMachineByFingerprint:async fingerprint=>{
   lookupCalls++;if(lookupError)throw Object.assign(Error('private-backend'),{cause:Error('private-backend')});
   return {id:'test-machine',active,fingerprint256:wrongPin?'not-the-pin':fingerprint};
  }});
  // rejectUnauthorized=false allows the test to reach our verifier with an
  // unauthenticated TLS peer. Operational listener must use true, independently.
  server=createServer({key,cert,ca:cert,requestCert:true,rejectUnauthorized:false},socket=>{
   sockets.add(socket);socket.on('error',()=>{});
  });
  server.listen(0,'127.0.0.1');await once(server,'listening');
  async function pair(withCertificate){
   const accepted=once(server,'secureConnection');
   const client=connect({host:'127.0.0.1',port:server.address().port,servername:'localhost',ca:cert,...(withCertificate?{key,cert}:{})});
   sockets.add(client);client.on('error',()=>{});await once(client,'secureConnect');
   return (await accepted)[0];
  }
  const verified=await pair(true);
  assert.equal(verified.authorized,true);
  const pin=createHash('sha256').update(verified.getPeerCertificate().raw).digest('hex');assert.equal(pin.length,64);
  assert.deepEqual(await auth(verified),{id:'test-machine',active:true});
  active=false;await assert.rejects(auth(verified),{code:'custody_denied'});
  active=true;wrongPin=true;await assert.rejects(auth(verified),{code:'custody_denied'});
  wrongPin=false;lookupError=true;
  await assert.rejects(auth(verified),e=>e.message==='custody_denied'&&e.cause===undefined&&!e.stack.includes('private-backend'));
  lookupError=false;
  const before=lookupCalls,anonymous=await pair(false);
  assert.notEqual(anonymous.authorized,true);await assert.rejects(auth(anonymous),{code:'custody_denied'});assert.equal(lookupCalls,before);
  await assert.rejects(auth({encrypted:true,authorized:true,headers:{'x-client-cert':cert.toString()}}),{code:'custody_denied'});
  assert.equal(lookupCalls,before);
 }finally{
  for(const socket of sockets)socket.destroy();
  if(server)await new Promise(resolve=>server.close(resolve));
  await rm(dir,{recursive:true,force:true});
 }
});

