// Explicit parked-installation upgrade. Never starts services or reads config.
import fs from 'node:fs/promises';
import {join,resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {verifyPackage,check,regular,hash} from './t19-private-package-verify.mjs';
import {copyExclusive,installContext,PRIVATE,TARGET} from './t19-private-install.mjs';
const absent=async p=>{try{await fs.lstat(p);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('UPGRADE_COLLISION');};
async function sync(p){const d=await fs.open(p,'r');try{await d.sync();}finally{await d.close();}}
async function record(path,value){const f=await fs.open(path,'wx',0o600);try{await f.writeFile(JSON.stringify(value));await f.sync();}finally{await f.close();}await sync(dirname(path));}
export async function upgradeInactive({source,target,privateDir,previous,expected}){
 check(/^[a-f0-9]{64}$/.test(previous??'')&&/^[a-f0-9]{64}$/.test(expected??'')&&previous!==expected,'UPGRADE_DIGEST_REFUSED');
 const stage=join(privateDir,'upgrade-'+expected),backup=join(privateDir,'rollback-'+previous+'-app');
 const intent=join(privateDir,'upgrade-'+expected+'.intent.json'),result=join(privateDir,'upgrade-'+expected+'.result.json');
 await absent(join(privateDir,'custody.json'));await absent(stage);await absent(backup);await absent(intent);await absent(result);
 await verifyPackage(target,previous);const manifest=await verifyPackage(source,expected);
 // A persistent exclusive lock fences another cooperative upgrade. Preserve it
 // on every outcome; a repeated/unknown run requires explicit recovery review.
 await fs.mkdir(join(privateDir,'upgrade.lock'),{mode:0o700});await sync(privateDir);
 await record(intent,{previous,expected,target,stage,backup,activationAuthorized:false});
 await copyExclusive(source,stage,manifest);
 await verifyPackage(target,previous);await absent(join(privateDir,'custody.json'));
 await absent(backup);await fs.rename(target,backup);await sync(dirname(target));await sync(privateDir);
 // If any following action fails, preserve backup, candidate and journal. Never
 // retry, delete partial files, infer success or automatically activate/rollback.
 await absent(target);await fs.rename(stage,target);await sync(dirname(target));await sync(privateDir);
 await verifyPackage(target,expected);await verifyPackage(backup,previous);await absent(join(privateDir,'custody.json'));
 const value={status:'INACTIVE_PRIVATE_UPGRADE_VERIFIED',previous,expected,backup,activationAuthorized:false,applicationStarted:false,credentialsRead:false};
 await record(result,value);return value;
}
async function main(){
 const [mode,previous,expected,...extra]=process.argv.slice(2),source=resolve(dirname(fileURLToPath(import.meta.url)),'..');
 check(['--inspect','--upgrade-inactive'].includes(mode)&&!extra.length,'UPGRADE_USAGE_MODE_PREVIOUS_NEW_DIGEST');
 installContext({platform:process.platform,uid:process.getuid?.(),version:process.version,source,expected});
 for(let p=source;;p=dirname(p)){
  const s=await fs.lstat(p);check(s.isDirectory()&&!s.isSymbolicLink()&&[0,10521].includes(s.uid)&&!(s.mode&0o022),'UPGRADE_ANCESTOR_REFUSED');
  if([PRIVATE,source,TARGET].includes(p))check(s.uid===10521&&(s.mode&0o777)===0o700,'UPGRADE_PRIVATE_DIRECTORY_REFUSED');
  if(dirname(p)===p)break;
 }
 const old=await fs.lstat(TARGET);check(old.isDirectory()&&!old.isSymbolicLink()&&old.uid===10521&&(old.mode&0o777)===0o700,'UPGRADE_TARGET_REFUSED');
 const manifest=await verifyPackage(source,expected);check(manifest.target.root===TARGET&&manifest.target.uid===10521&&manifest.target.privateConfig===PRIVATE+'/custody.json','UPGRADE_TARGET_POLICY_REFUSED');
 // Both hashes are external inputs; no self-authorised replacement baseline.
 check(hash(await regular(join(TARGET,'custody-production-manifest.json')))===previous,'UPGRADE_PREVIOUS_REFUSED');
 if(mode==='--inspect'){await absent(PRIVATE+'/custody.json');await verifyPackage(TARGET,previous);console.log(JSON.stringify({status:'INACTIVE_UPGRADE_INPUTS_VERIFIED_NOT_EXECUTED',previous,expected,activationAuthorized:false,pleskParkedStateVerified:false}));return;}
 console.log(JSON.stringify(await upgradeInactive({source,target:TARGET,privateDir:PRIVATE,previous,expected})));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(()=>{console.error('T19_PRIVATE_UPGRADE_STOP_PRESERVE_ALL_EVIDENCE');process.exitCode=1;});
