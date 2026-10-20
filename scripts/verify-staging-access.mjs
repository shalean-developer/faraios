import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {pathToFileURL} from 'node:url';

// Operator-run evidence only. This never changes a business record or connects
// directly to Supabase/Zoho. Its only POSTs are its own local login and logout.
export const stagingOrigin='http://127.0.0.1:3101';
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
class AccessFailure extends Error{constructor(code){super(code);this.code=code;}}
const deny=code=>{throw new AccessFailure(code);};
const publicFailure=(error,fallback)=>error instanceof AccessFailure?error.code:fallback;
export function accessOptions(args){
 const keys=['role','business','denied-business','email'],options={};
 for(const arg of args){const match=/^--([a-z-]+)=(.+)$/.exec(arg);if(!match||!keys.includes(match[1])||Object.hasOwn(options,match[1]))deny('INVALID_OPTIONS');options[match[1]]=match[2];}
 if(keys.some(key=>!options[key])||!['manager','staff'].includes(options.role)||!uuid.test(options.business)||!uuid.test(options['denied-business'])||options.business.toLowerCase()===options['denied-business'].toLowerCase()||options.email.length>254||!/^\S+@[^\s@]+\.test$/i.test(options.email))deny('INVALID_OPTIONS');
 return options;
}

export async function askPassword({input=process.stdin,output=process.stdout,signal}={}){
 if(!input.isTTY||!output.isTTY)deny('INTERACTIVE_TERMINAL_REQUIRED');
 const cancellation=new AbortController(),sink=new Writable({write(_chunk,_encoding,done){done();}});
 output.write('Existing FaraiOS STAGING QA password (hidden):\n');
 const terminal=createInterface({input,output:sink,terminal:true,historySize:0});
 const cancel=()=>cancellation.abort();terminal.on('SIGINT',cancel);terminal.on('close',cancel);
 try{return await terminal.question('',{signal:signal?AbortSignal.any([signal,cancellation.signal]):cancellation.signal});}
 finally{terminal.close();sink.end();output.write('\n');}
}

async function boundedText(response){
 const reader=response.body?.getReader();if(!reader)return '';
 const chunks=[];let size=0;
 try{for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_048_576)deny('RESPONSE_TOO_LARGE');chunks.push(value);}}
 finally{await reader.cancel().catch(()=>{});reader.releaseLock();}
 return Buffer.concat(chunks).toString('utf8');
}

export async function verifyStagingAccess(options,password,{fetchImpl=fetch,signal}={}){
 // Validate before issuing any request. CLI arguments must never carry secrets.
 const o=accessOptions(Object.entries(options).map(([key,value])=>`--${key}=${value}`));
 if(typeof password!=='string'||!password.length||password.length>1024)deny('INVALID_PASSWORD');
 const report={role:o.role,checks:[],cleanup:'NOT_NEEDED',passed:false};
 let cookie=null,loginInFlight=false;
 const request=async(path,{method='GET',body,cleanup=false}={})=>{
  const timeout=AbortSignal.timeout(10_000);
  return fetchImpl(stagingOrigin+path,{method,redirect:'manual',signal:!cleanup&&signal?AbortSignal.any([signal,timeout]):timeout,headers:{...(cookie?{Cookie:cookie}:{}),...(method==='POST'?{Origin:stagingOrigin,'Content-Type':'application/x-www-form-urlencoded'}:{})},...(body?{body}:{})});
 };
 const check=(name,actual,expected)=>{const pass=actual===expected;report.checks.push({name,actual,expected,pass});if(!pass)deny('CHECK_FAILED');};
 const read=async(name,path,expected)=>{const response=await request(path);const body=await boundedText(response);check(name,response.status,expected);return body;};
 try{
  const loginPage=await read('STAGING_LOGIN','/login',200);
  check('STAGING_MARKER',loginPage.includes('FaraiOS STAGING')&&loginPage.includes('No production data')&&loginPage.includes('action="/login"'),true);
  loginInFlight=true;
  const login=await request('/login',{method:'POST',body:new URLSearchParams({email:o.email,password})});
  const cookies=login.headers.getSetCookie();
  const session=cookies.map(value=>/^(faraios_staging=[0-9a-f-]{36});/i.exec(value)?.[1]).filter(Boolean);
  if(session.length===1){cookie=session[0];report.cleanup='PENDING';loginInFlight=false;}
  else if([401,403,429].includes(login.status)){loginInFlight=false;}
  await boundedText(login);check('SIGN_IN',login.status,303);check('SESSION_COOKIE',Boolean(cookie),true);check('SIGN_IN_REDIRECT',login.headers.get('location')==='/dashboard',true);
  const all=await read('ALL_BUSINESSES','/dashboard?business=all',200);
  const selector=/<select\b[^>]*\bid="business"[^>]*>([\s\S]*?)<\/select>/.exec(all)?.[1]??'';
  const selected=[...selector.matchAll(/<option\b[^>]*\bvalue="([^"]+)"/g)].map(match=>match[1]);
  check('SINGLE_BUSINESS_SCOPE',selected.length===2&&selected.includes('all')&&selected.includes(o.business)&&!all.includes(o['denied-business']),true);
  const own=await read('OWN_DASHBOARD','/dashboard?business='+o.business,200);
  check('VERIFIED_ROLE',own.includes(`<p>${o.role}</p>`)&&!own.includes('Owner controls include'),true);
  await read('OTHER_DASHBOARD','/dashboard?business='+o['denied-business']+'&role=owner',403);
  await read('OWN_OWNER_SETTINGS','/settings?business='+o.business,403);
  for(const module of ['customers','bookings','catalogue','staff','quotes','recurring','calendar','invoices']){
   await read('OTHER_'+module.toUpperCase(),'/'+module+'?business='+o['denied-business'],403);
   await read('OWN_'+module.toUpperCase(),'/'+module+'?business='+o.business,o.role==='manager'?200:403);
  }
  if(o.role==='staff')check('STAFF_DASHBOARD_SCOPE',own.includes('My assignments')&&own.includes('My earnings')&&!own.includes('Business finances'),true);
 }catch(error){report.failure=signal?.aborted?'CANCELLED':publicFailure(error,'REQUEST_FAILED');}
 finally{
  if(cookie){
   try{
    const logout=await request('/logout',{method:'POST',body:new URLSearchParams(),cleanup:true});
    await boundedText(logout);check('SIGN_OUT',logout.status,303);check('SIGN_OUT_REDIRECT',logout.headers.get('location')==='/login',true);
    // Reuse only this helper's now-invalid cookie to verify local invalidation.
    const after=await request('/dashboard',{cleanup:true});await boundedText(after);
    check('AFTER_SIGN_OUT',after.status,303);check('AFTER_SIGN_OUT_REDIRECT',after.headers.get('location')==='/login',true);report.cleanup='PASSED';
   }catch{report.cleanup='UNCONFIRMED';report.failure??='CLEANUP_UNCONFIRMED';}
  }else if(loginInFlight){report.cleanup='UNCONFIRMED';report.failure??='CLEANUP_UNCONFIRMED';}
  cookie=null;
 }
 report.passed=!report.failure&&report.cleanup==='PASSED'&&report.checks.every(result=>result.pass);
 return report;
}

async function main(){
 const options=accessOptions(process.argv.slice(2)),cancellation=new AbortController();
 if(!process.stdin.isTTY||!process.stdout.isTTY)deny('INTERACTIVE_TERMINAL_REQUIRED');
 const cancel=()=>cancellation.abort();process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 console.log('FaraiOS local STAGING access verification. Existing .test QA account only. No business writes or Zoho requests.');
 try{
  const password=await askPassword({signal:cancellation.signal});
  const result=await verifyStagingAccess(options,password,{signal:cancellation.signal});
  console.log(JSON.stringify({...result,checks:result.checks.map(({name,actual,expected,pass})=>`${name}=${actual} expected=${expected} ${pass?'PASS':'FAIL'}`)},null,2));process.exitCode=result.passed?0:1;
 }finally{process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)main().catch(error=>{console.error('['+publicFailure(error,'VERIFICATION_STOPPED')+']');process.exitCode=1;});
