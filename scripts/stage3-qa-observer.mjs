// Opt-in local acceptance observer. Never used by the normal staging command.
// Run: node --import ./scripts/stage3-qa-observer.mjs staging.mjs
import {Server} from 'node:http';
import {appendFileSync,readFileSync,mkdirSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const business='d32a07e5-acbf-405e-aefd-d18c113b4fe1';
if(resolve(process.argv[1]??'')!==resolve(root,'staging.mjs')||process.versions.node.split('.')[0]!=='24')throw new Error('Observer requires this repository staging.mjs and Node 24');
if(process.env.FARAIOS_ACCOUNTING_SERVICE_KEY||process.env.FARAIOS_ZOHO_CREDENTIALS_FILE)throw new Error('QA observer requires accounting worker disabled');
const destination=resolve(root,'docs/evidence/stage3-closeout');
mkdirSync(destination,{recursive:true});
const log=resolve(destination,'observed-http.jsonl');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
const paths=git('ls-files','src','public','config','staging.mjs','package.json','package-lock.json').split(/\r?\n/).filter(Boolean);
const files=Object.fromEntries(paths.map(path=>[path,hash(readFileSync(resolve(root,path)))]));
const record=value=>appendFileSync(log,JSON.stringify({at:new Date().toISOString(),...value})+'\n');
record({kind:'startup',sha:git('rev-parse','HEAD'),runtimeDiff:git('diff','HEAD','--','src','public','config','staging.mjs','package.json','package-lock.json'),pid:process.pid,node:process.version,executable:process.execPath,entrypoint:resolve(process.argv[1]),root,files,accountingWorker:'disabled',business});
const original=Server.prototype.emit;
Server.prototype.emit=function(event,...args){
 if(event==='request'){
  const [req,res]=args;
  const url=new URL(req.url,'http://127.0.0.1:3101');
  if(req.method==='POST'&&url.pathname==='/monthly-settlements'&&url.searchParams.get('business')===business){
   const chunks=[];let size=0;
   let fields;
   const iterator=req[Symbol.asyncIterator].bind(req);
   req[Symbol.asyncIterator]=async function*(){
    for await(const chunk of iterator()){
     size+=chunk.length;if(size<=32768)chunks.push(Buffer.from(chunk));
     yield chunk;
    }
    if(size>32768){fields={omitted:'body exceeds capture limit'};return;}
    const allowed=/^(action|version|event_key|statement_id|transfer_id|outcome|cleared|remaining_failed|clearing_evidence|allocation_evidence|reference|amount|allocation_[0-9a-f-]{36})$/i;
    fields=[...new URLSearchParams(Buffer.concat(chunks).toString('utf8'))].filter(([key])=>allowed.test(key));
   };
   const responseHash=createHash('sha256');
   const write=res.write,end=res.end;
   const capture=(chunk,encoding)=>{if(typeof chunk==='string'||Buffer.isBuffer(chunk))responseHash.update(chunk,typeof encoding==='string'?encoding:undefined);};
   res.write=function(chunk,encoding,...rest){capture(chunk,encoding);return write.call(this,chunk,encoding,...rest);};
   res.end=function(chunk,encoding,...rest){capture(chunk,encoding);return end.call(this,chunk,encoding,...rest);};
   res.on('finish',()=>record({kind:'synthetic-post',method:req.method,path:url.pathname,business,statement:url.searchParams.get('statement'),fields,status:res.statusCode,location:res.getHeader('location')??null,responseSha256:responseHash.digest('hex')}));
  }
 }
 return original.call(this,event,...args);
};
