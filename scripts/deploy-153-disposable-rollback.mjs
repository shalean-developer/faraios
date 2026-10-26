// DEPLOY-153-11D: disposable release-slot model only; never writes to a live host.
import {mkdir,readFile,rename,rm,stat,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

const hex40=/^[0-9a-f]{40}$/;
const digest=s=>createHash('sha256').update(s).digest('hex');
const file=(root,name)=>join(root,name+'.json');

export async function retainRelease(root,{sha,content}){
  if(!hex40.test(sha)||typeof content!=='string'||!content)throw Error('INVALID_RELEASE');
  await mkdir(root,{recursive:true});
  const target=file(root,'release-'+sha);
  try{await stat(target);throw Error('RELEASE_ALREADY_EXISTS');}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const staged=file(root,'candidate-'+sha);
  await writeFile(staged,JSON.stringify({sha,content,checksum:digest(content)}),{flag:'wx',mode:0o600});
  await rename(staged,target);
  return {sha,checksum:digest(content)};
}
export async function verifyRelease(root,sha){
  if(!hex40.test(sha))throw Error('INVALID_SHA');
  const obj=JSON.parse(await readFile(file(root,'release-'+sha),'utf8'));
  if(obj.sha!==sha||digest(obj.content)!==obj.checksum)throw Error('RELEASE_TAMPERED');
  return obj;
}
export async function activateAndVerify(root,{candidateSha,verify}){
  if(typeof verify!=='function')throw Error('VERIFY_REQUIRED');
  const candidate=await verifyRelease(root,candidateSha);
  const live=file(root,'active');
  let prior=null;
  try{prior=JSON.parse(await readFile(live,'utf8'));await verifyRelease(root,prior.sha);}
  catch(e){if(e.code!=='ENOENT')throw e;}
  const incoming=file(root,'incoming-'+candidateSha);
  await writeFile(incoming,JSON.stringify({sha:candidate.sha}),{flag:'wx',mode:0o600});
  await rename(incoming,live);
  let passed=false;
  try{passed=await verify(candidate)===true;}catch{}
  if(!passed){
    if(prior){
      await verifyRelease(root,prior.sha);
      const rollback=file(root,'rollback-'+candidateSha);
      await writeFile(rollback,JSON.stringify(prior),{flag:'wx',mode:0o600});
      await rename(rollback,live);
    }else await rm(live);
    throw Error('RELEASE_VERIFICATION_FAILED_ROLLED_BACK');
  }
  return {sha:candidateSha,previous:prior?.sha??null};
}
