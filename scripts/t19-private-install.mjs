// Explicit inactive source installation only. Never loads application or private config.
import fs from 'node:fs/promises';
import {resolve,dirname,join} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyPackage,regular,hash,check,safePath} from './t19-private-package-verify.mjs';
export const HOME='/var/www/vhosts/custody-staging.faraios.com';
export const PRIVATE=HOME+'/.faraios-t19-custody';
export const TARGET=HOME+'/app';
export function installContext({platform,uid,version,source,expected}){
 check(platform==='linux'&&uid===10521&&version==='v24.22.1','INSTALL_IDENTITY_REFUSED');
 check(/^[a-f0-9]{64}$/.test(expected??'')&&source===PRIVATE+'/package-'+expected,'INSTALL_SOURCE_LOCATION_REFUSED');
}
async function absent(path){try{await fs.lstat(path);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('INSTALL_COLLISION');}
async function directory(path,privateMode=false){
 const s=await fs.lstat(path);check(s.isDirectory()&&!s.isSymbolicLink()&&[0,10521].includes(s.uid)&&!(s.mode&0o022),'INSTALL_ANCESTOR_REFUSED');
 if(privateMode)check(s.uid===10521&&(s.mode&0o777)===0o700,'INSTALL_PRIVATE_DIRECTORY_REFUSED');
}
export async function copyExclusive(source,target,manifest,{deadline=Date.now()+60000}={}){
 check(manifest.files.every(f=>safePath(f.path)),'INSTALL_PATH_REFUSED');
 const bytes=await regular(join(source,'custody-production-manifest.json'));check(JSON.stringify(await verifyPackage(source,hash(bytes)))===JSON.stringify(manifest),'INSTALL_MANIFEST_CHANGED');
 await fs.mkdir(target,{mode:0o700}); // EEXIST never replaces even an empty directory.
 const ordered=[...manifest.files].sort((a,b)=>(a.path==='_custody.cjs')-(b.path==='_custody.cjs'));
 // Entry point is copied last. Any failure retains the partial private directory.
 for(const f of [...ordered,{path:'custody-production-manifest.json',sha256:hash(await regular(join(source,'custody-production-manifest.json')))}]){
  check(Date.now()<deadline,'INSTALL_DEADLINE');const bytes=await regular(join(source,f.path));check(hash(bytes)===f.sha256,'INSTALL_INPUT_CHANGED');
  const path=join(target,f.path);await fs.mkdir(dirname(path),{recursive:true,mode:0o700});const h=await fs.open(path,'wx',0o600);
  try{await h.writeFile(bytes);await h.sync();}finally{await h.close();}
 }
 const directories=new Set([target,dirname(target)]);
 for(const f of manifest.files)for(let p=dirname(join(target,f.path));p.startsWith(target);p=dirname(p)){directories.add(p);if(p===target)break;}
 for(const path of [...directories].sort((a,b)=>b.length-a.length)){
  check(Date.now()<deadline,'INSTALL_DEADLINE');const d=await fs.open(path,'r');try{await d.sync();}finally{await d.close();}
 }
 const expected=hash(await regular(join(source,'custody-production-manifest.json')));await verifyPackage(target,expected);
}
export async function inspectInstallation(source,expected){
 installContext({platform:process.platform,uid:process.getuid?.(),version:process.version,source,expected});
 for(let p=source;;p=dirname(p)){await directory(p,p===PRIVATE||p===source);if(dirname(p)===p)break;}
 await absent(TARGET);await absent(PRIVATE+'/custody.json');await absent(PRIVATE+'/source-install-'+expected+'.json');
 const manifest=await verifyPackage(source,expected);
 check(manifest.target?.root===TARGET&&manifest.target.uid===10521&&manifest.target.privateConfig===PRIVATE+'/custody.json','INSTALL_TARGET_POLICY_REFUSED');
 return manifest;
}
async function main(){
 const [mode,expected,...extra]=process.argv.slice(2);check(['--inspect','--install-inactive'].includes(mode)&&!extra.length,'USAGE_INSPECT_OR_INSTALL_DIGEST');
 const source=resolve(dirname(fileURLToPath(import.meta.url)),'..');const manifest=await inspectInstallation(source,expected);
 if(mode==='--inspect'){console.log(JSON.stringify({status:'INACTIVE_INSTALL_INPUTS_VERIFIED_NOT_AUTHORIZED',manifestSha256:expected,files:manifest.files.length,activationAuthorized:false,pleskParkedStateVerified:false}));return;}
 await copyExclusive(source,TARGET,manifest);
 await absent(PRIVATE+'/custody.json');
 const result={status:'INACTIVE_PRIVATE_SOURCE_INSTALLED',manifestSha256:expected,files:manifest.files.length,uid:process.getuid(),node:process.version,activationAuthorized:false,applicationStarted:false,credentialsRead:false,databaseConnected:false,pleskParkedStateVerified:false};
 const h=await fs.open(PRIVATE+'/source-install-'+expected+'.json','wx',0o600);try{await h.writeFile(JSON.stringify(result));await h.sync();}finally{await h.close();}
 const d=await fs.open(PRIVATE,'r');try{await d.sync();}finally{await d.close();}console.log(JSON.stringify(result));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(e=>{console.error('T19_INACTIVE_INSTALL_STOP '+(/^[A-Z0-9_]+$/.test(e.message)?e.message:'REFUSED_OR_PARTIAL_PRESERVE_TARGET'));process.exitCode=1;});
