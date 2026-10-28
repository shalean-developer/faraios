// T19 Gate 2 local single-use nonce ledger. No Docker execution.
// Exclusive creation prevents replay in a single trusted local filesystem.
// Cross-host/backup recovery and Windows power-loss durability require independent review.
import {open,mkdir,readFile} from 'node:fs/promises';
import {resolve,join} from 'node:path';
const NONCE=/^[a-f0-9]{32}$/;
export function makeLocalNonceStore(directory){
 const dir=resolve(directory);
 return Object.freeze({
  async consumeOnce(nonce){
   if(!NONCE.test(nonce??''))throw Error('INVALID_NONCE');
   await mkdir(dir,{recursive:true,mode:0o700});
   const path=join(dir,nonce+'.consumed');
   let file;
   try{file=await open(path,'wx',0o600);}
   catch(e){if(e.code==='EEXIST')return false;throw e;}
   try{await file.writeFile(JSON.stringify({version:1,nonce,phase:'CONSUMED'})+'\n');await file.sync();}
   finally{await file.close();}
   // Do not delete or reuse any consumed nonce, including aborted runs.
   return true;
  },
  async inspect(nonce){
   if(!NONCE.test(nonce??''))throw Error('INVALID_NONCE');
   return JSON.parse(await readFile(join(dir,nonce+'.consumed'),'utf8'));
  }
 });
}
