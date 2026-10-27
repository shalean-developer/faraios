// T19 read-only pinned GitHub blob SHA-256 evidence. Never executes migrations.
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const text=readFileSync(resolve(root,'docs/t19-auth-storage-pinned-migration-inventory-v01.md'),'utf8');
const sources={Auth:{repo:'supabase/auth',count:75},Storage:{repo:'supabase/storage',count:74}};
const rows={Auth:[],Storage:[]};let current;
for(const line of text.split(/\r?\n/)){
 if(line.startsWith('## Auth')) current='Auth';
 else if(line.startsWith('## Storage')) current='Storage';
 else if(line.startsWith('## ')) current=undefined;
 const m=line.match(/^\| `([^`]+\.sql)` \| `([a-f0-9]{40})` \| PENDING \|$/);
 if(current&&m)rows[current].push({path:m[1],sha:m[2]});
}
for(const [key,spec] of Object.entries(sources)){
 if(rows[key].length!==spec.count||new Set(rows[key].map(x=>x.path)).size!==spec.count)throw Error('Invalid manifest count/duplicates: '+key);
}
const hash=(algorithm,bytes)=>createHash(algorithm).update(bytes).digest('hex');
async function get(key,record){
 const url=`https://api.github.com/repos/${sources[key].repo}/git/blobs/${record.sha}`;
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),20000);
 let response;
 try{response=await fetch(url,{headers:{Accept:'application/vnd.github+json','User-Agent':'faraios-t19-readonly-inventory'},signal:controller.signal});}
 finally{clearTimeout(timeout);}
 if(!response.ok)throw Error(`GitHub HTTP ${response.status} fetching ${key}/${record.path}`);
 const json=await response.json();
 if(json.sha!==record.sha||json.encoding!=='base64'||!Number.isSafeInteger(json.size)||json.size>1048576)throw Error('Invalid Git blob metadata');
 const bytes=Buffer.from(json.content.replace(/\s/g,''),'base64');
 if(bytes.length!==json.size||hash('sha1',Buffer.concat([Buffer.from(`blob ${bytes.length}\0`),bytes]))!==record.sha)throw Error('Git blob bytes mismatch');
 return hash('sha256',bytes).toUpperCase();
}
console.log('component,path,git_blob_sha1,file_sha256');
let passed=0;
try{
 for(const key of ['Auth','Storage'])for(const record of rows[key]){
  const sha256=await get(key,record);
  console.log([key,record.path,record.sha,sha256].join(','));
  passed++;
 }
 console.error(`T19_PINNED_${passed}_SHA256_SOURCE_VERIFIED`);
}catch(e){console.error('T19_SHA256_NO_GO: '+e.message);process.exitCode=1;}
