// Synthetic-only CLI: no runtime configuration, provider, database or live activation.
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdtemp,chmod,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
import {createTokenCipher} from '../src/t19-standard-secrets.js';
import {createCredentialBackup,restoreCredentialBackup,credentialMaterialDigest,rekeyCredentialSnapshot,assertRecoveryMatchesCurrent} from '../src/t19-standard-recovery.js';
import {writeRecoveryPair,readRecoveryPair} from '../src/t19-standard-recovery-files.js';
const script=fileURLToPath(import.meta.url);
export function syntheticRecoveryFixture(){
 const config={key:randomBytes(32),keyId:'synthetic-old'},cipher=createTokenCipher(config);
 const records=['10001','10002'].map(organizationId=>{
  const c={environment:'staging',businessId:randomUUID(),connectionId:randomUUID(),generation:1,organizationId,apiDomain:'https://www.zohoapis.com',clientId:'SYNTHETIC-CLIENT',status:'connected'};
  return {...c,envelope:cipher.seal(c,{refreshToken:'SYNTHETIC-REFRESH-'+randomUUID(),accessToken:'SYNTHETIC-ACCESS-'+randomUUID(),expiresAt:2000000000000})};
 });return {config,records};
}
async function childVerify(dataDir,keyDir,passphrase,expected){
 return new Promise((resolve,reject)=>{
  const child=spawn(process.execPath,[script,'--verify',dataDir,keyDir],{stdio:['pipe','pipe','pipe'],env:{}});let output='',size=0;
  const timer=setTimeout(()=>{child.kill('SIGKILL');reject(new Error('accounting_recovery_rehearsal_rejected'));},20000);
  child.stdout.on('data',chunk=>{size+=chunk.length;if(size>1024)child.kill('SIGKILL');else output+=chunk;});
  child.stderr.on('data',()=>{});child.on('error',()=>{clearTimeout(timer);reject(new Error('accounting_recovery_rehearsal_rejected'));});
  child.stdin.on('error',()=>{});
  child.on('close',code=>{clearTimeout(timer);try{const result=JSON.parse(output);if(code!==0||result.restored!==true||result.count!==2)throw Error();resolve(result);}catch{reject(new Error('accounting_recovery_rehearsal_rejected'));}});
  child.stdin.end(JSON.stringify({passphrase,expected}));
 });
}
export async function runSyntheticRecoveryRehearsal(){
 const {config,records}=syntheticRecoveryFixture(),next={key:randomBytes(32),keyId:'synthetic-next'};
 const passphrase=randomBytes(48).toString('base64');let dataDir,keyDir,restored;
 try{
  dataDir=await mkdtemp(join(tmpdir(),'faraios-t19-data-'));keyDir=await mkdtemp(join(tmpdir(),'faraios-t19-escrow-'));
  await chmod(dataDir,0o700);await chmod(keyDir,0o700);
  const before=JSON.stringify(records),backup=await createCredentialBackup(records,config,passphrase);
  await writeRecoveryPair(dataDir,keyDir,backup);
  const fresh=await childVerify(dataDir,keyDir,passphrase,credentialMaterialDigest(records,config));
  const saved=await readRecoveryPair(dataDir,keyDir);restored=await restoreCredentialBackup(saved.data,saved.escrow,passphrase);
  assertRecoveryMatchesCurrent(restored,records);
  const rotated=rekeyCredentialSnapshot(records,config,next);
  if(credentialMaterialDigest(rotated,next)!==credentialMaterialDigest(records,config)||JSON.stringify(records)!==before)throw Error();
  let oldKeyDenied=false;try{credentialMaterialDigest(rotated,config);}catch{oldKeyDenied=true;}if(!oldKeyDenied)throw Error();
  return {syntheticOnly:true,freshProcessRestore:fresh.restored,connections:2,shadowRotation:true,oldKeyDenied:true,activeWrites:0};
 }catch{throw new Error('accounting_recovery_rehearsal_rejected');}
 finally{config.key.fill(0);next.key.fill(0);restored?.key.fill(0);if(dataDir)await rm(dataDir,{recursive:true,force:true});if(keyDir)await rm(keyDir,{recursive:true,force:true});}
}
async function verify(){
 let input='',restored;for await(const chunk of process.stdin){input+=chunk;if(Buffer.byteLength(input)>1024)throw Error();}
 try{
  const {passphrase,expected}=JSON.parse(input),saved=await readRecoveryPair(process.argv[3],process.argv[4]);
  restored=await restoreCredentialBackup(saved.data,saved.escrow,passphrase);
  if(credentialMaterialDigest(restored.records,restored)!==expected)throw Error();
  process.stdout.write(JSON.stringify({restored:true,count:restored.records.length}));
 }finally{restored?.key.fill(0);}
}
if(process.argv[1]&&resolve(process.argv[1])===script){
 try{if(process.argv[2]==='--verify'&&process.argv.length===5)await verify();else if(process.argv.length===2)process.stdout.write(JSON.stringify(await runSyntheticRecoveryRehearsal())+'\n');else throw Error();}
 catch{process.stderr.write('accounting_recovery_rehearsal_rejected\n');process.exitCode=1;}
}
