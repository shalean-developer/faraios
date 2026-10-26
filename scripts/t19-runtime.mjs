// Explicit manual entrypoint. No environment credential discovery or auto-enable.
import {loadAccountingDeployment,startAccountingCustody,runAccountingPass} from '../src/t19-deployment.js';
const [command,path,...extra]=process.argv.slice(2);
try{
 if(!['check','custody','run'].includes(command)||!path||extra.length)throw Error();
 const c=await loadAccountingDeployment(path);
 if(command==='check'){console.log('T19_CONFIG_VALIDATED_NO_CONNECTION');}
 else{
  // File-mode checks cannot prove Windows ACLs. These launchers target the approved Linux host.
  if(process.platform!=='linux')throw Error();
  if(command==='run')console.log(JSON.stringify(await runAccountingPass(c)));
  else{
   const app=await startAccountingCustody(c);
   let stopping=false;
   const stop=()=>{if(stopping)return;stopping=true;app.close().then(()=>{process.exitCode=0;},()=>{process.exitCode=1;});};
   process.once('SIGTERM',stop);process.once('SIGINT',stop);
   console.log('T19_RUNTIME_STARTED');
  }
 }
}catch{console.error('T19_RUNTIME_REFUSED_OR_UNCONFIRMED');process.exitCode=1;}
