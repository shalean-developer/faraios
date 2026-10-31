// Explicit operator command only. Never imported or scheduled by the web app.
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadStandardHttpsConfiguration,loadStandardWorkerConfiguration} from '../src/t19-standard-runtime.js';
import {createStandardBackendClient} from '../src/t19-standard-backend-client.js';
import {preparePrivateStagingRecovery} from '../src/t19-standard-recovery-handoff.js';
export async function runPrivateStagingBackup(){
 if(process.platform!=='linux'||Number(process.versions.node.split('.')[0])!==24)throw Error('accounting_recovery_handoff_rejected');
 return preparePrivateStagingRecovery({root:'/var/www/vhosts/faraios.com/.faraios-t19-standard',loadSettings:loadStandardHttpsConfiguration,loadWorker:loadStandardWorkerConfiguration,createBackend:createStandardBackendClient});
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{if(process.argv.length!==3||process.argv[2]!=='--prepare-private-staging-backup')throw Error();console.log(JSON.stringify(await runPrivateStagingBackup()));}
 catch{console.error('accounting_recovery_handoff_rejected');process.exitCode=1;}
}
