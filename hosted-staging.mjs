import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from './src/staging-server.js';
import {assertHostedEnvironment,assertStagingConfig,createStagingFetch} from './src/hosted-staging.js';
import {hostedSourceFingerprint} from './scripts/hosted-source-fingerprint.mjs';

import runtime from './src/hosted-runtime.cjs';

export async function startHostedStaging(){
const transport=runtime.detectHostedRuntime();
if(transport==='litespeed'&&await readFile(new URL('./public/.htaccess',import.meta.url),'utf8')!==runtime.httpsRules)throw new Error('Hosted HTTPS rules mismatch');
assertHostedEnvironment();
const config=JSON.parse(await readFile(new URL('./config/staging.json',import.meta.url),'utf8'));
assertStagingConfig(config);
const restrictedFetch=createStagingFetch();
const factory=()=>createClient(config.url,config.publishableKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:restrictedFetch},
});
const earningsTemplate=JSON.parse(await readFile(new URL('./config/shalean-approved-earnings.json',import.meta.url),'utf8'));
// Intentionally no worker, credential file, provider SDK or integration adapter.
let socketReady=false;
const server=createStagingServer({createClient:factory,hostedTransport:transport,hostedReady:()=>socketReady,hostedStaging:true,hostedFingerprint:await hostedSourceFingerprint(),earningsTemplates:{[config.earningsTemplateBusinessId]:earningsTemplate}});
if(transport==='passenger')server.listen('passenger');
else server.listen(0,()=>{
  try{runtime.assertPrivateSocket(server,process.env.LSNODE_SOCKET);socketReady=true;}catch{console.error('Hosted staging private socket refused',JSON.stringify(runtime.describePrivateSocket(server,process.env.LSNODE_SOCKET)));server.close();process.exitCode=1;}
});
return server;
}
