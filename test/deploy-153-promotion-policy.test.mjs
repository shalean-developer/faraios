import test from 'node:test';
import assert from 'node:assert/strict';
import {assessPromotion} from '../scripts/deploy-153-promotion-policy.mjs';
const sha='a'.repeat(40);
const base={action:'completed',repository:{full_name:'shalean-developer/faraios'},
 workflow_run:{name:'Foundation checks',event:'push',head_branch:'staging',status:'completed',conclusion:'success',head_sha:sha,repository:{full_name:'shalean-developer/faraios'}}};
test('accept exact successful staging push completion',()=>assert.deepEqual(assessPromotion({event:base}),{eligible:true,commit:sha}));
for(const [field,value] of [['conclusion','failure'],['event','pull_request'],['head_branch','main'],['status','in_progress'],['head_sha','bad'],['name','Other workflow'],['repository',{full_name:'attacker/repo'}]]){
 test('deny run '+field,()=>assert.equal(assessPromotion({event:{...base,workflow_run:{...base.workflow_run,[field]:value}}}).eligible,false));
}
test('deny wrong outer repository and uncompleted action',()=>{
 assert.equal(assessPromotion({event:{...base,repository:{full_name:'attacker/repo'}}}).eligible,false);
 assert.equal(assessPromotion({event:{...base,action:'requested'}}).eligible,false);
});
