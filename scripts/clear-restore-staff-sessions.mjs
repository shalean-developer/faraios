// Recovery for one interrupted owner-operated TEST login. No admin key,
// refresh token, database write, source project or configurable subject.
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {askPassword} from './verify-staging-access.mjs';

const origin='https://zrlojsvkqipuwkkyfrkn.supabase.co';
const email='cleaner.qa@faraios.test';
const config=JSON.parse(await readFile(new URL('../config/restore-test.json',import.meta.url),'utf8'));
class RecoveryFailure extends Error{constructor(code){super(code);this.code=code;}}
const fail=code=>{throw new RecoveryFailure(code);};

export async function clearRestoreStaffSessions(password,{fetchImpl=fetch,signal,timeoutMs=30_000}={}){
 if(config.environment!=='restore-test'||config.projectRef!=='zrlojsvkqipuwkkyfrkn'||config.url!==origin||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(config.publishableKey))fail('RESTORE_RECOVERY_CONFIG_INVALID');
 if(typeof password!=='string'||password.length<1||password.length>1024)fail('INVALID_PASSWORD');
 if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>30_000)fail('INVALID_TIMEOUT');
 let token=null,globalStarted=false,localCleanup='NOT_NEEDED';
 const request=async(step,path,method,body)=>{
  const timeout=AbortSignal.timeout(timeoutMs);
  const active=signal&&step!=='LOCAL_CLEANUP'?AbortSignal.any([signal,timeout]):timeout;
  try{
   const response=await fetchImpl(origin+path,{method,redirect:'error',signal:active,headers:{apikey:config.publishableKey,...(token?{Authorization:'Bearer '+token}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})});
   if(!response.ok){await response.body?.cancel();fail(step+'_REJECTED');}
   if(method==='POST'&&!body){await response.body?.cancel();return null;}
   // JSON tokens stay in memory; neither responses nor errors are logged.
   const reader=response.body?.getReader();if(!reader)fail(step+'_INVALID');
   const chunks=[];let size=0;
   try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>65536)fail(step+'_INVALID');chunks.push(value);}}
   finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
   return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }catch(error){if(error instanceof RecoveryFailure)throw error;fail(signal?.aborted&&step!=='LOCAL_CLEANUP'?'RECOVERY_CANCELLED':timeout.aborted?step+'_TIMEOUT':step+'_UNCONFIRMED');}
 };
 try{
  const signed=await request('SIGN_IN','/auth/v1/token?grant_type=password','POST',{email,password});
  if(typeof signed?.access_token!=='string'||!/^[-A-Za-z0-9_]+\.[-A-Za-z0-9_]+\.[-A-Za-z0-9_]+$/.test(signed.access_token))fail('SIGN_IN_INVALID');
  token=signed.access_token;
  const user=await request('VERIFY_ACCOUNT','/auth/v1/user','GET');
  if(typeof user?.email!=='string'||user.email.toLowerCase()!==email||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(user.id??''))fail('RESTORE_RECOVERY_ACCOUNT_MISMATCH');
  if(signal?.aborted)fail('RECOVERY_CANCELLED');
  globalStarted=true;
  await request('SIGN_OUT','/auth/v1/logout?scope=global','POST');
  token=null;
  return {environment:'restore-test',account:'shared_staff_qa',providerSignOut:'ACKNOWLEDGED',sessionRowVerification:'PENDING_READ_ONLY_CHECK',localAppSessions:'RESTART_REQUIRED',businessWrites:'NOT_PERFORMED'};
 }catch(error){
  // Before global sign-out, discard only the new sign-in if available.
  // A lost global response is explicitly unconfirmed; never retry it here.
  if(token&&!globalStarted){localCleanup='UNCONFIRMED';try{await request('LOCAL_CLEANUP','/auth/v1/logout?scope=local','POST');localCleanup='ACKNOWLEDGED';}catch{}}
  return {environment:'restore-test',account:'shared_staff_qa',providerSignOut:'UNCONFIRMED',failure:error instanceof RecoveryFailure?error.code:'RECOVERY_UNCONFIRMED',localCleanup,localAppSessions:'RESTART_REQUIRED'};
 }finally{token=null;}
}

async function main(){
 if(process.argv.length!==2)fail('INVALID_OPTIONS');
 if(!process.stdin.isTTY||!process.stdout.isTTY)fail('INTERACTIVE_TERMINAL_REQUIRED');
 const cancellation=new AbortController(),cancel=()=>cancellation.abort();
 process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 console.log('FaraiOS RESTORE TEST only: sign out all sessions for cleaner.qa@faraios.test in zrlojsvkqipuwkkyfrkn. Stop restore:app first. No other account or project is selected.');
 try{
  const password=await askPassword({signal:cancellation.signal,label:'RESTORE TEST'});
  const report=await clearRestoreStaffSessions(password,{signal:cancellation.signal});
  console.log(JSON.stringify(report,null,2));process.exitCode=report.providerSignOut==='ACKNOWLEDGED'?0:1;
 }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href)main().catch(error=>{console.error('['+(error instanceof RecoveryFailure?error.code:'RECOVERY_STOPPED')+']');process.exitCode=1;});
