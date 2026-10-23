// Plesk loads this entry through CommonJS on Passenger and LiteSpeed.
const {detectHostedRuntime}=require('./src/hosted-runtime.cjs');
const runtime=detectHostedRuntime();
if(runtime==='passenger')PhusionPassenger.configure({autoInstall:false});
import('./hosted-staging.mjs').then(module=>module.startHostedStaging()).catch(()=>{
  console.error('FaraiOS hosted staging startup refused');
  process.exitCode=1;
});
