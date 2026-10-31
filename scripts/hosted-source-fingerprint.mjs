import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
export async function hostedSourceFingerprint(){
  const root=new URL('../',import.meta.url);
  const files=['_passenger.cjs','_standard_accounting.cjs','_accounting.cjs','_custody.cjs','hosted-staging.mjs','package.json','package-lock.json','scripts/hosted-source-fingerprint.mjs','scripts/t19-runtime.mjs','scripts/t19-standard-private-setup.mjs'];
  for(const dir of ['src','public','config']){
    const entries=await readdir(new URL(dir+'/',root),{withFileTypes:true});
    for(const entry of entries){if(!entry.isFile())throw new Error('Unexpected hosted source directory');files.push(dir+'/'+entry.name);}
  }
  const hash=createHash('sha256');
  for(const path of files.sort())hash.update(path+'\0').update(await readFile(new URL(path,root))).update('\0');
  return hash.digest('hex');
}
if(process.argv[1]===fileURLToPath(import.meta.url))console.log(await hostedSourceFingerprint());
