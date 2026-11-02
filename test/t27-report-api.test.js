import test from 'node:test';
import assert from 'node:assert/strict';
import {readOperationalReport} from '../src/t27-report-api.js';
const id='612be091-b1d7-4911-9c3b-143446a9fe27';
test('matched business scope succeeds',async()=>{
 const d={businessId:id,from:'2026-11-01',through:'2026-11-02'};
 const client={rpc:async(name,args)=>{assert.equal(name,'t27_operational_report');assert.equal(args.p_business,id);return {data:d,error:null};}};
 assert.deepEqual(await readOperationalReport(client,id,d.from,d.through),d);
});
test('forged scope fails closed',async()=>{
 const client={rpc:async()=>({data:{businessId:'0cc3f518-d64e-40c2-8817-bc14d1ef1420',from:'2026-11-01',through:'2026-11-02'},error:null})};
 await assert.rejects(readOperationalReport(client,id,'2026-11-01','2026-11-02'),/scope mismatch/);
});
test('database denial maps to forbidden',async()=>{
 const client={rpc:async()=>({error:{code:'42501'}})};
 await assert.rejects(readOperationalReport(client,id,'2026-11-01','2026-11-02'),e=>e.status===403);
});
test('invalid inputs stop before transport',async()=>{
 const client={rpc:()=>{throw Error('called')}};
 await assert.rejects(readOperationalReport(client,'wrong','2026-11-01','2026-11-02'),/Invalid/);
});

test('RPC failure logs SQLSTATE only, not private details',async()=>{
 const prior=console.error,logs=[];
 console.error=(...a)=>logs.push(a.join(' '));
 try{
  const client={rpc:async()=>({error:{code:'42703',message:'secret invoice',details:'private details',hint:'private hint'}})};
  await assert.rejects(readOperationalReport(client,id,'2026-11-01','2026-11-02'),e=>e.status===422&&e.message==='Report unavailable. Check access and current source state.');
  assert.deepEqual(logs,['T27_REPORT_RPC_CODE=42703']);
 }finally{console.error=prior;}
});
