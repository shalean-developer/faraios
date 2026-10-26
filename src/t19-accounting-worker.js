// Bounded worker pass. Scheduler/credentials are supplied only after activation approval.
export function createAccountingWorker({database,runner,authenticateMachine}){
 return Object.freeze({async runOnce(transport){
  const machine=await authenticateMachine(transport);if(!machine?.active)throw Error('custody_denied');
  const ids=await database.pending(machine.id);if(!Array.isArray(ids)||ids.length>20)throw Error('custody_denied');
  const outcomes=[];
  for(const operationId of ids){
   const current=await authenticateMachine(transport);if(!current?.active||current.id!==machine.id)throw Error('custody_denied');
   try{
    const job=await database.resolveAuthorizedOperation({machineId:machine.id,operationId,action:'refresh'});
    if(job.authorized!==true||job.kind!=='invoice')continue;
    outcomes.push(await runner.run(transport,{operationId}));
   }catch{outcomes.push({operationId,status:'review_required'});}
  }
  return outcomes;
 }});
}
