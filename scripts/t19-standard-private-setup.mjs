// Run on the staging host only after source review and private owner setup.
// No arguments/environment secrets, listener, browser callback or financial call.
import {createClient} from '@supabase/supabase-js';
import {pathToFileURL} from 'node:url';
import config from '../config/staging.json' with {type:'json'};
import {loadStandardHttpsConfiguration,loadStandardPrivateProvisioning,createStandardProvisioningComponents} from '../src/t19-standard-runtime.js';
import {createAccountingUserClientFactory,createVerifiedAccountingSessions} from '../src/t19-accounting-sessions.js';
import {provisionStandardStaging} from '../src/t19-standard-private-setup.js';
export async function runPrivateSetup(){
 const settings=await loadStandardHttpsConfiguration(),input=await loadStandardPrivateProvisioning();
 const components=await createStandardProvisioningComponents(settings);
 const url='https://xdmfyrsauvqznkloroxg.supabase.co';
 if(config.url!==url||config.projectRef!=='xdmfyrsauvqznkloroxg')throw Error('accounting_private_setup_rejected');
 const createUserClient=createAccountingUserClientFactory({url,publishableKey:config.publishableKey});
 return provisionStandardStaging({input,components,async authenticateOwner({email,password,sessionId}){
  const client=createClient(url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:async(i,o)=>fetch(i,{...o,redirect:'error',signal:AbortSignal.timeout(12000)})}});
  const {data,error}=await client.auth.signInWithPassword({email,password});
  if(error||!data?.session?.access_token)throw Error('accounting_owner_authentication_failed');
  return {sessions:createVerifiedAccountingSessions({createUserClient,accessToken:data.session.access_token,sessionId}),async close(){const r=await client.auth.signOut({scope:'local'});if(r.error)throw Error('accounting_owner_logout_unverified');}};
 }});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 if(process.argv.length!==3||process.argv[2]!=='--provision-staging'){console.log('PRIVATE_SETUP_NOT_RUN');process.exitCode=1;}
 else try{console.log(JSON.stringify(await runPrivateSetup()));}catch{console.log('PRIVATE_SETUP_FAILED_REVIEW_DISABLED_GRANT_AND_PRIVATE_INPUT');process.exitCode=1;}
}
