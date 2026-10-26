// DEPLOY-153-15: pure CI-completion promotion eligibility policy.
// No remote writes, branch promotion, hosting access, or provider dispatch.
const sha40=/^[0-9a-f]{40}$/;
export function assessPromotion({event,workflowName='Foundation checks'}={}){
  const run=event?.workflow_run;
  if(event?.action!=='completed'||run?.name!==workflowName||
     run?.event!=='push'||run?.head_branch!=='staging'||
     run?.status!=='completed'||run?.conclusion!=='success'||
     !sha40.test(run?.head_sha??'')||run?.repository?.full_name!=='shalean-developer/faraios'||
     event?.repository?.full_name!=='shalean-developer/faraios')
    return {eligible:false,reason:'RELEASE_NOT_ELIGIBLE'};
  return {eligible:true,commit:run.head_sha};
}
