const {detectHostedRuntime}=require('./src/hosted-runtime.cjs');
if(detectHostedRuntime()==='passenger')PhusionPassenger.configure({autoInstall:false});
import('./hosted-t31-preview.mjs').then(m=>m.startHostedPreview()).catch(()=>{console.error('T31 onboarding preview startup refused');process.exitCode=1;});
