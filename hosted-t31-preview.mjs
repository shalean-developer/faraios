import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from './src/staging-server.js';
import {assertHostedEnvironment} from './src/hosted-staging.js';
import {previewDatabase,previewKey,createPreviewFetch} from './src/t31-hosted-preview.js';
import {previewSourceFingerprint} from './scripts/t31-preview-fingerprint.mjs';

import runtime from './src/hosted-runtime.cjs';

export async function startHostedPreview(){
const transport=runtime.detectHostedRuntime();
if(transport==='litespeed'&&await readFile(new URL('./public/.htaccess',import.meta.url),'utf8')!==runtime.httpsRules)throw new Error('Hosted edge defense rules mismatch');
assertHostedEnvironment();
const restrictedFetch=createPreviewFetch(globalThis.fetch);
const factory=()=>createClient(previewDatabase,previewKey,{
  auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},
  global:{fetch:restrictedFetch},
});
let socketReady=false;
const server=createStagingServer({createClient:factory,hostedOnboardingPreview:true,ownerRegistrationEnabled:true,hostedTransport:transport,hostedReady:()=>socketReady,hostedStaging:true,hostedFingerprint:await previewSourceFingerprint()});
if(transport==='passenger')server.listen('passenger');
else server.listen(0,()=>{
  try{runtime.assertPrivateSocket(server,process.env.LSNODE_SOCKET);socketReady=true;}catch{console.error('Hosted staging private socket refused',JSON.stringify(runtime.describePrivateSocket(server,process.env.LSNODE_SOCKET)));server.close();process.exitCode=1;}
});
return server;
}
