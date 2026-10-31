// Explicit connection-only staging entrypoint; default _passenger.cjs unchanged.
const runtime=require('./src/hosted-runtime.cjs').detectHostedRuntime();
if(runtime==='passenger')PhusionPassenger.configure({autoInstall:false});
Promise.all([import('./src/t19-standard-runtime.js'),import('./hosted-staging.mjs')]).then(async([standard,host])=>{
 const config=await standard.loadStandardHttpsConfiguration();
 const handler=await standard.createStandardHttpsRuntime(config);
 await host.startHostedStaging({accountingProxy:handler,accountingConnectionOnly:true});
}).catch(()=>{console.error('FaraiOS HTTPS accounting startup refused');process.exitCode=1;});
