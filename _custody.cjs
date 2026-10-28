// Inactive alternative startup for the isolated custody subscription only.
// Default staging startup remains _passenger.cjs. No environment opt-in.
const {assertManaged,startManagedCustody}=require('./src/t19-managed-custody.cjs');
try{
 assertManaged();
 import('./src/t19-deployment.js').then(deployment=>startManagedCustody({
  load:deployment.loadAccountingDeployment,start:deployment.startAccountingCustody
 })).then(()=>console.log('T19_MANAGED_CUSTODY_READY'),()=>{
  console.error('T19_MANAGED_CUSTODY_REFUSED_OR_UNCONFIRMED');process.exitCode=1;
 });
}catch{console.error('T19_MANAGED_CUSTODY_REFUSED_OR_UNCONFIRMED');process.exitCode=1;}
