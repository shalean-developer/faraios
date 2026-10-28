import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir,chmod,symlink,link} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,relative,isAbsolute} from 'node:path';
import {EventEmitter} from 'node:events';
import {loadAccountingDeployment,startAccountingCustody,deploymentProxy,accountingWebConfigPath} from '../src/t19-deployment.js';
import {createStagingFetch,stagingDatabase} from '../src/hosted-staging.js';
test('deployment config refuses unknown fields, repository secrets and disabled execution',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'faraios-deployment-'));
 t.after(async()=>{const rel=relative(tmpdir(),dir);if(!rel.startsWith('faraios-deployment-')||isAbsolute(rel))throw Error();await rm(dir,{recursive:true,force:true});});
 const secret=join(dir,'fixture.pem'),path=join(dir,'config.json');await writeFile(secret,'synthetic fixture',{mode:0o600});
 const c={version:1,mode:'web',enabled:false,endpoint:'https://127.0.0.1:9443/',tls:{caFile:secret,certFile:secret,keyFile:secret}};
 const save=async v=>writeFile(path,JSON.stringify(v),{mode:0o600});
 await save(c);const loaded=await loadAccountingDeployment(path);assert.throws(()=>deploymentProxy(loaded));
 for(const override of [{endpoint:'http://127.0.0.1/'},{endpoint:'https://a.invalid/custody/run'},{enabled:'true'},{password:'DO_NOT_EXPOSE'}]){
  await save({...c,...override});await assert.rejects(loadAccountingDeployment(path),e=>e.message==='accounting_deployment_rejected'&&!e.cause);
 }
 await save(c);await mkdir(join(dir,'.git'));await assert.rejects(loadAccountingDeployment(path));
});
test('hosted RPC opt-in permits only authenticated accounting status/enqueue transport',async()=>{
 const seen=[],dispatch=async req=>{seen.push(req.url);return new Response('{}');};
 const off=createStagingFetch(dispatch),on=createStagingFetch(dispatch,{accounting:true});
 for(const rpc of ['t19_accounting_status','t19_enqueue_invoice']){
  const url=stagingDatabase+'/rest/v1/rpc/'+rpc;
  await assert.rejects(off(url,{method:'POST'}));await on(url,{method:'POST'});
  await assert.rejects(on(url,{method:'POST',headers:{'Content-Profile':'private_t19_custody'}}));
 }
 for(const rpc of ['runtime','t19_disconnect','finish_invoice_sync'])await assert.rejects(on(stagingDatabase+'/rest/v1/rpc/'+rpc,{method:'POST'}));
 assert.equal(seen.length,2);
});
test('custody launcher binds loopback and closes database exactly once on shutdown/start failure',async()=>{
 let closed=0;const server=new EventEmitter();
 server.listen=(port,host)=>{assert.equal(host,'127.0.0.1');assert.equal(port,9443);queueMicrotask(()=>server.emit('listening'));};
 server.close=cb=>cb();server.closeAllConnections=()=>{};
 const c={mode:'custody',enabled:true,port:9443,database:{},tls:{},createUserClient:()=>{}};
 const deps={connect:async()=>({database:{},query:()=>{},close:async()=>{closed++;}}),createService:()=>server};
 const app=await startAccountingCustody(c,deps);await Promise.all([app.close(),app.close()]);assert.equal(closed,1);
 await assert.rejects(startAccountingCustody({...c,enabled:false},deps));assert.equal(closed,1);
 await assert.rejects(startAccountingCustody(c,{...deps,createService:()=>{throw Error('SECRET');}}),{message:'accounting_deployment_rejected'});assert.equal(closed,2);
});

// Real filesystem checks for private subscription directories; dummy values
// never start listeners, connect to databases, read a token or invoke providers.
test('non-root private config locations retain symlink, hardlink, mode and ancestor denial',async t=>{
 const base=await mkdtemp(join(tmpdir(),'faraios-private-path-'));t.after(()=>rm(base,{recursive:true,force:true}));
 const dir=join(base,'private');await mkdir(dir,{mode:0o700});
 const secret=join(dir,'fixture.pem'),path=join(dir,'web.json');await writeFile(secret,'synthetic fixture',{mode:0o600});
 const c={version:1,mode:'web',enabled:false,endpoint:'https://127.0.0.1:9443/',tls:{caFile:secret,certFile:secret,keyFile:secret}};
 await writeFile(path,JSON.stringify(c),{mode:0o600});
 assert.equal((await loadAccountingDeployment(path)).enabled,false);
 const denied=async p=>assert.rejects(loadAccountingDeployment(p),{message:'accounting_deployment_rejected'});
 const alias=join(base,'alias');await symlink(dir,alias);await denied(join(alias,'web.json'));
 const fileAlias=join(dir,'alias.json');await symlink(path,fileAlias);await denied(fileAlias);
 const hard=join(dir,'copy.json');await link(path,hard);await denied(path);await rm(hard);
 await chmod(secret,0o644);await denied(path);await chmod(secret,0o600);
 await chmod(dir,0o777);await denied(path);await chmod(dir,0o700);
 await writeFile(secret,'x'.repeat(65537));await denied(path);
 await writeFile(secret,'synthetic fixture');assert.equal((await loadAccountingDeployment(path)).mode,'web');
 await mkdir(join(base,'.git'));await denied(path);
});
test('web configuration location accepts only an explicit versioned source setting',()=>{
 assert.equal(accountingWebConfigPath({version:1,webConfigFile:'/private/web.json'}),'/private/web.json');
 for(const value of [{version:1,webConfigFile:'relative.json'},{version:2,webConfigFile:'/private/web.json'},
  {version:1,webConfigFile:'/private/web.json',approved:true},{version:1,webConfigFile:null},null]){
  assert.throws(()=>accountingWebConfigPath(value),{message:'accounting_deployment_rejected'});
 }
});
