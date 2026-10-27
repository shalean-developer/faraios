import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyDryRun,decidePostCreate,inspectEnforcement} from '../scripts/t19-gate2-runtime-controller.mjs';
import {IMAGE} from '../scripts/t19-03-docker-candidate.mjs';
test('dry-run checks only image identity and container inventory',async()=>{
 const calls=[];
 const out=await verifyDryRun(async args=>{calls.push(args);return args[0]==='image'?JSON.stringify([{Id:IMAGE}]):'other-container\n';});
 assert.equal(out.gate,'EXECUTION_NO_GO');
 assert.deepEqual(calls.map(a=>a.slice(0,2)),[['container','ls'],['image','inspect']]);
 await assert.rejects(()=>verifyDryRun(async a=>a[0]==='image'?'[]':'faraios-t19-managed-qa\n'),/NAME_COLLISION/);
});
test('runtime readback demands enforceable limits',()=>{
 const fixture={Name:'/faraios-t19-managed-qa',Config:{Image:IMAGE,User:'999:999',Labels:{}},
 HostConfig:{NetworkMode:'none',ReadonlyRootfs:true,Memory:536870912,MemorySwap:536870912,
 NanoCpus:1000000000,PidsLimit:64,Privileged:false,PublishAllPorts:false,
 CapDrop:['ALL'],SecurityOpt:['no-new-privileges:true'],Binds:[]},NetworkSettings:{Ports:{}}};
 assert.equal(inspectEnforcement(fixture),true);
 for(const mutate of [x=>x.HostConfig.NetworkMode='bridge',x=>x.HostConfig.Memory=0,
 x=>x.HostConfig.PidsLimit=0,x=>x.HostConfig.Privileged=true,x=>x.Config.User='0']){
  const x=structuredClone(fixture);mutate(x);assert.equal(inspectEnforcement(x),false);
 }
 assert.equal(decidePostCreate({id:'a'.repeat(64),inspection:{...fixture,Id:'a'.repeat(64)},nonce:'b'.repeat(32)}).pass,false);
});
