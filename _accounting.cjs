// Explicit alternative Plesk startup file, selected only after deployment approval.
// The existing _passenger.cjs remains the default inactive entrypoint.
const {detectHostedRuntime}=require('./src/hosted-runtime.cjs');
const runtime=detectHostedRuntime();
if(process.platform!=='linux')throw new Error('Accounting host requires Linux');
if(runtime==='passenger')PhusionPassenger.configure({autoInstall:false});
Promise.all([import('./src/t19-deployment.js'),import('./hosted-staging.mjs')]).then(async([deployment,host])=>{
 const config=await deployment.loadAccountingDeployment('/etc/faraios/web.json');
 await host.startHostedStaging({accountingProxy:deployment.deploymentProxy(config)});
}).catch(()=>{console.error('FaraiOS accounting web startup refused');process.exitCode=1;});
