import {resolve,relative,isAbsolute,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createZohoBooks} from './src/zoho-books.js';
import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from './src/staging-server.js';
const config=JSON.parse(await readFile(new URL('./config/staging.json',import.meta.url),'utf8'));
if(config.environment!=='staging'||config.projectRef!=='xdmfyrsauvqznkloroxg'||config.url!=='https://xdmfyrsauvqznkloroxg.supabase.co'||!config.publishableKey.startsWith('sb_publishable_'))throw new Error('Invalid staging configuration');
const factory=()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
let accountingWorker=null,accountingAdapter=null;
const workerKey=process.env.FARAIOS_ACCOUNTING_SERVICE_KEY,credentialsPath=process.env.FARAIOS_ZOHO_CREDENTIALS_FILE;
if(workerKey&&credentialsPath){
 if(!workerKey.startsWith('sb_secret_')){let claims;try{claims=JSON.parse(Buffer.from(workerKey.split('.')[1]??'','base64url').toString());}catch{}if(claims?.role!=='service_role'||claims.ref!==config.projectRef)throw new Error('Accounting worker needs this staging project’s server-only secret');}
 const local=relative(fileURLToPath(new URL('.',import.meta.url)),resolve(credentialsPath));
 if(local!=='..'&&!local.startsWith('..'+sep)&&!isAbsolute(local))throw new Error('Keep accounting credentials outside the repository');
 let entries;try{entries=JSON.parse(await readFile(credentialsPath,'utf8'));}catch{throw new Error('Unable to load the private accounting credential file');}
 if(!entries||Array.isArray(entries)||typeof entries!=='object')throw new Error('Invalid accounting credential file');
 accountingWorker=createClient(config.url,workerKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
 accountingAdapter=createZohoBooks({credentials:alias=>entries[alias]});
}
const earningsTemplate=JSON.parse(await readFile(new URL('./config/shalean-approved-earnings.json',import.meta.url),'utf8'));
createStagingServer({createClient:factory,accountingWorker,accountingAdapter,earningsTemplates:{[config.earningsTemplateBusinessId]:earningsTemplate}}).listen(3101,'127.0.0.1',()=>console.log('FaraiOS staging login: http://127.0.0.1:3101/login'));
