// T19 managed QA preflight: read-only local inspection; never starts Docker or SQL.
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=resolve(fileURLToPath(new URL('..',import.meta.url)));
const policy=JSON.parse(readFileSync(resolve(root,'config/t19-managed-harness-policy.json'),'utf8'));
const fail=(name,reason)=>{console.error(name+': NO_GO '+reason);process.exitCode=1};
const safeDocker=(args)=>execFileSync('docker',args,{encoding:'utf8',timeout:15000,windowsHide:true,maxBuffer:1048576});
if(policy.executionAllowed!==false||policy.network!=='none'||policy.ports.length||policy.mounts.length||policy.credentialsAllowed!==false||policy.autoPull!==false)throw Error('Unsafe managed harness policy');
for(const [name,id] of Object.entries(policy.images)){
 if(!/^sha256:[a-f0-9]{64}$/.test(id))throw Error('Unpinned image '+name);
 try{
  const images=JSON.parse(safeDocker(['image','inspect',id]));
  if(images.length!==1||images[0].Id!==id||images[0].Os!=='linux'||images[0].Architecture!=='amd64')fail(name,'local image mismatch');
  else console.log(name+': LOCAL_IMAGE_PASS');
 }catch(e){fail(name,'image inspect unavailable')}
}
try{
 const names=safeDocker(['container','ls','--all','--format','{{.Names}}']).trim().split(/\r?\n/);
 if(names.includes(policy.containerName))fail('CONTAINER','name collision');
 else console.log('CONTAINER_NAME_FREE');
}catch{fail('CONTAINER','read-only inventory failed')}
if(policy.localSql.length!==3||Object.keys(policy.localSqlSha256??{}).length!==3)throw Error('Incomplete SQL digest policy');
for(const filename of policy.localSql){
 const full=resolve(root,filename);
 if(!full.startsWith(root+'/')&&!full.startsWith(root+'\\'))throw Error('Unsafe SQL location');
 const b=readFileSync(full);
 const actual=createHash('sha256').update(b).digest('hex').toUpperCase();
 if(!/^[A-F0-9]{64}$/.test(policy.localSqlSha256[filename]??'')||actual!==policy.localSqlSha256[filename])fail('LOCAL_SQL_SHA256',filename+' digest mismatch');
 else console.log('LOCAL_SQL_SHA256_PASS '+filename+' '+actual);
}
for(const missing of ['VAULT_EXTENSION','BOOTSTRAP_ACTOR','MANAGED_MIGRATION_ORDER','IMAGE_PROVENANCE','RESOURCE_ISOLATION'])fail(missing,'independent runtime evidence required');
console.log('EXECUTION_NO_GO');
