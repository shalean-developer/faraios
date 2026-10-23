import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from './src/staging-server.js';
import {assertHostedEnvironment,assertStagingConfig,createStagingFetch} from './src/hosted-staging.js';
import {hostedSourceFingerprint} from './scripts/hosted-source-fingerprint.mjs';

if(typeof PhusionPassenger==='undefined')throw new Error('Hosted staging requires Passenger');
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
createStagingServer({createClient:factory,hostedStaging:true,hostedFingerprint:await hostedSourceFingerprint(),earningsTemplates:{[config.earningsTemplateBusinessId]:earningsTemplate}}).listen('passenger');
