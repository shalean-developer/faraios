// Plesk/Passenger loads its startup file through CommonJS.
if(typeof PhusionPassenger==='undefined')throw new Error('Hosted staging requires Passenger');
PhusionPassenger.configure({autoInstall:false});
import('./hosted-staging.mjs').catch(()=>{
  console.error('FaraiOS hosted staging startup refused');
  process.exitCode=1;
});
