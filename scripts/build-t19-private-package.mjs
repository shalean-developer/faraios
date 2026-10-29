// Produces an artifact only; never accesses the hosted installation paths.
import fs from 'node:fs/promises';
import {resolve,join,dirname} from 'node:path';
import {spawn} from 'node:child_process';
import {prepare,seal} from './t19-private-package.mjs';
import {check,verifyPackage} from './t19-private-package-verify.mjs';
const [output,...extra]=process.argv.slice(2);check(output&&!extra.length&&process.versions.node==='24.22.1','NODE_24_22_1_AND_OUTPUT_REQUIRED');
const root=resolve(output);await fs.mkdir(root,{recursive:false,mode:0o700});
const env={...process.env};for(const k of Object.keys(env))if(/^(PG|SUPABASE|FARAIOS)|DATABASE_URL|TOKEN|SECRET|PASSWORD|CREDENTIAL|^NPM_CONFIG_|^NODE_OPTIONS$|^NODE_PATH$|^NODE_EXTRA_CA_CERTS$/i.test(k))delete env[k];
// npm ci previously warmed the registry-integrity-checked cache. This stage is offline.
const run=(args,cwd=root)=>new Promise((done,reject)=>{
 const c=spawn(process.execPath,args,{cwd,env,stdio:['ignore','pipe','pipe']});let bytes=0,output='';const t=setTimeout(()=>c.kill('SIGKILL'),180000);
 for(const s of [c.stdout,c.stderr])s.on('data',b=>{bytes+=b.length;if(bytes>1048576)c.kill('SIGKILL');else output+=b;});
 c.on('error',e=>{clearTimeout(t);reject(e);});c.on('close',(code,signal)=>{clearTimeout(t);code===0&&!signal?done(output):reject(Error('PACKAGE_SUBPROCESS_REFUSED '+output.slice(-1500)));});
});
const source=await prepare(root);
// Use the npm CLI belonging to the same Node installation, not a PATH-selected binary.
const npm=resolve(dirname(process.execPath),'../lib/node_modules/npm/bin/npm-cli.js');
check((await fs.stat(npm)).isFile(),'NODE_NPM_CLI_REQUIRED');
await run([npm,'ci','--omit=dev','--ignore-scripts','--offline','--no-audit','--no-fund','--registry=https://registry.npmjs.org/','--userconfig='+join(root,'absent-user-npmrc'),'--globalconfig='+join(root,'absent-global-npmrc')]);
const smoke=`import {syncBuiltinESMExports} from 'node:module';import net from 'node:net';import tls from 'node:tls';import http from 'node:http';import https from 'node:https';const refused=()=>{throw Error('IMPORT_SIDE_EFFECT_REFUSED')};for(const m of [net,tls,http,https])for(const k of ['connect','createConnection','createServer','request','get'])if(k in m)m[k]=refused;net.Server.prototype.listen=refused;net.Socket.prototype.connect=refused;globalThis.fetch=refused;syncBuiltinESMExports();await import('./src/t19-deployment.js');await import('./src/t19-managed-custody.cjs');console.log('PRIVATE_PACKAGE_IMPORT_ONLY_PASS');`;
const smokeOutput=await run(['--input-type=module','-e',smoke]);check(smokeOutput.includes('PRIVATE_PACKAGE_IMPORT_ONLY_PASS'),'PACKAGE_SMOKE_FAILED');
const result=await seal(root,source.manifestSha256);await verifyPackage(root,result.manifestSha256);
console.log(JSON.stringify({status:'INACTIVE_PRIVATE_PACKAGE_BUILD_PASS',...result,importOnlySmokePassed:true,hostInstalled:false,activationAuthorized:false}));
