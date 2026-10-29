import test from 'node:test';
import assert from 'node:assert/strict';
import {runInNewContext} from 'node:vm';
import {Host,storageDenied} from '../scripts/t19-bootstrap-host.mjs';
const good={status:400,serviceStatusCode:'403',errorCode:'AccessDenied',deniedBucketCount:0,allowedBucketCount:1,totalBucketCount:1};
test('Storage denial requires the exact vendor wrapper plus unchanged bucket state',()=>{
 assert.equal(storageDenied(good),true);
 for(const status of [401,403])assert.equal(storageDenied({...good,status}),true);
 for(const change of [{status:200},{status:500},{status:0},{errorCode:'InvalidRequest'},{serviceStatusCode:'400'},{deniedBucketCount:1},{allowedBucketCount:0},{totalBucketCount:2}])assert.equal(storageDenied({...good,...change}),false);
 assert.equal(storageDenied({...good,errorCode:undefined}),false);
});
test('HTTP probe captures only allowlisted denial codes and omits tokens and error messages',async()=>{
 let code;
 await Host.prototype.http.call({node:async(b,c)=>{code=c;return {status:400};}}, {}, 'http://synthetic.invalid');
 const handlers={};let output;
 const process={stdin:{on:(event,fn)=>{handlers[event]=fn;return process.stdin;}}};
 runInNewContext(code,{process,Buffer,AbortSignal,fetch:async()=>new Response(JSON.stringify({statusCode:'403',code:'AccessDenied',message:'private-synthetic-token'}),{status:400}),console:{log:s=>{output=JSON.parse(s);}}});
 handlers.data(JSON.stringify({url:'http://synthetic.invalid',method:'POST',token:'private-synthetic-token'}));await handlers.end();
 assert.deepEqual(output,{status:400,serviceStatusCode:'403',errorCode:'AccessDenied'});
 assert.equal(JSON.stringify(output).includes('private'),false);
});
test('failed denied request is journalled before failure even when HTTP looks successful',async()=>{
 const records=[];let count=0;
 const host={nonce:'0'.repeat(32),bound:new Map([['storage',{}],['auth',{s:{name:'auth'}}]]),serviceToken:'s',anonToken:'a',http:async()=>({status:[200,403,200,200][count++]}),sqlJSON:async()=>({deniedBucketCount:1,allowedBucketCount:1,totalBucketCount:2}),record:async(kind,value)=>records.push({kind,value})};
 await assert.rejects(Host.prototype.security.call(host),/STORAGE_DENIED_REQUEST_FAILED/);
 assert.equal(records.length,1);assert.equal(records[0].kind,'storage-denied-request');assert.equal(records[0].value.deniedBucketCount,1);
});
test('wrapped denial advances only after bucket-state proof and permitted fixture removal',async()=>{
 const records=[],methods=[];let n=0,queries=0;
 const responses=[{status:200},{status:403},{status:201},{status:400,serviceStatusCode:'403',errorCode:'AccessDenied'},{status:200}];
 const host={nonce:'0'.repeat(32),bound:new Map([['storage',{}],['auth',{s:{name:'auth'}}]]),serviceToken:'s',anonToken:'a',http:async(b,url,method)=>{methods.push(method);return responses[n++];},sqlJSON:async()=>++queries===1?{deniedBucketCount:0,allowedBucketCount:1,totalBucketCount:1}:queries<=4?{denied:true}:{count:0},record:async(kind,value)=>records.push({kind,value})};
 await Host.prototype.security.call(host);
 assert.equal(methods.at(-1),'DELETE');assert.equal(n,5);assert.equal(queries,5);
 assert.deepEqual(records.map(x=>x.kind),['storage-denied-request','security']);
 assert.equal(records[1].value.storageDenied,true);
});
