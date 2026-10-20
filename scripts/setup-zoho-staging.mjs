// Operator-only OAuth setup. Never import this into the office HTTP server.
import {createServer} from 'node:http';
import {randomBytes} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {mkdir,realpath,lstat,readFile,open,rename,unlink} from 'node:fs/promises';
import {resolve,dirname,relative,isAbsolute,join,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {homedir} from 'node:os';
import {zohoDomains} from '../src/zoho-books.js';

export const redirectUri='http://127.0.0.1:3102/zoho/callback';
export const scopes='ZohoBooks.settings.READ,ZohoBooks.contacts.READ,ZohoBooks.invoices.READ,ZohoBooks.invoices.CREATE';
export const diagnosticScopes='ZohoBooks.settings.READ';
export const standardDiagnosticScopes='ZohoBooks.invoices.READ';
const repository=fileURLToPath(new URL('..',import.meta.url));
const failures=Object.freeze({
 VALIDATION_FAILED:'Local input or setup validation failed',
 TOKEN_NETWORK:'The token request failed during transport',TOKEN_HTTP:'Zoho rejected the token HTTP request',TOKEN_RESPONSE:'The token response was malformed',TOKEN_REJECTED:'Zoho rejected the token request',
 TOKEN_CLIENT_ID:'Zoho returned invalid_client; check the dedicated client and pinned region',TOKEN_CLIENT_SECRET:'Zoho rejected the dedicated client secret',TOKEN_REDIRECT:'Zoho rejected the registered redirect URI',TOKEN_CODE:'Zoho rejected the one-use authorization code',TOKEN_DENIED:'Zoho denied the token request',
 TOKEN_ACCESS_MISSING:'The token response had no valid access token',TOKEN_REFRESH_MISSING:'The token response had no valid refresh token',TOKEN_DOMAIN:'The token API domain did not match the pinned region',TOKEN_EXPIRY:'The token expiry was invalid',
 REFRESH_NETWORK:'The fresh-token refresh failed during transport',REFRESH_HTTP:'Zoho rejected the fresh-token refresh HTTP request',REFRESH_RESPONSE:'The fresh-token refresh response was malformed',REFRESH_REJECTED:'Zoho rejected the fresh-token refresh',REFRESH_ACCESS_MISSING:'The refresh response had no valid access token',REFRESH_DOMAIN:'The refreshed API domain did not match the pinned region',REFRESH_EXPIRY:'The refreshed token expiry was invalid',
 ORG_NETWORK:'The organisation request failed during transport',ORG_HTTP:'Zoho rejected the organisation HTTP request',ORG_RESPONSE:'The organisation response was malformed',ORG_REJECTED:'Zoho rejected the organisation request',
 ORG_COUNT:'The grant did not return exactly one organisation',ORG_ID:'The organisation ID did not match',ORG_NAME:'The organisation name did not match',ORG_CURRENCY:'The organisation currency was not ZAR',ORG_INACTIVE:'The organisation was inactive',
 PRIVATE_FILE_OPEN:'The private file or lock could not be opened safely',PRIVATE_FILE_SAVE:'The verified credentials could not be saved safely',PRIVATE_BINDING_EXISTS:'The private file already contains this alias, business or organisation',
 CANCELLED:'Setup was cancelled',CALLBACK_UNAVAILABLE:'The local callback could not start',CALLBACK_EXPIRED:'The callback wait expired',LOCAL_CLEANUP:'Local resources could not be closed cleanly',UNEXPECTED:'An unexpected local setup failure occurred'
});
const httpStatuses=Object.freeze([400,401,403,404,405,409,429,500,502,503,504]);
const booksCodes=Object.freeze([4,5,14,43,44,45,57,1000,1002,2008,6018,6024,6041]);
const cleanupMessages=Object.freeze({REFRESH_REVOKED:'Zoho acknowledged revoking this attempt\'s refresh token and its derived access tokens. This does not prove absence of older grants.',ACCESS_REVOKED:'Zoho acknowledged revoking this attempt\'s access token only. Refresh-token cleanup is unverified; stop for manual cleanup.',FAILED:'Token cleanup was not confirmed; stop for manual cleanup.',UNAVAILABLE:'No usable current token was available for cleanup; stop for manual cleanup if consent was granted.'});
const pinnedProbeMessages=Object.freeze({MATCHED:'A separate read matched the configured test organisation; full isolation remains unverified.',MISMATCH:'A separate read did not match the configured test organisation.',REJECTED:'The separate configured-organisation read was also rejected.',UNAVAILABLE:'The separate configured-organisation read was unavailable.'});
class SetupFailure extends Error{constructor(code){super('Private setup validation failed');this.diagnostic=code;}}
const fail=(code='VALIDATION_FAILED')=>{throw new SetupFailure(code);};
// Never print provider bodies, native errors, paths, identifiers or credentials.
export function setupFailureMessage(error){
 const code=error instanceof SetupFailure&&Object.hasOwn(failures,error.diagnostic)?error.diagnostic:'UNEXPECTED';
 const own=error instanceof SetupFailure;
 const http=own&&code.endsWith('_HTTP')?(httpStatuses.includes(error.httpStatus)?' [HTTP_'+error.httpStatus+']':' [HTTP_OTHER]'):'';
 const provider=own&&booksCodes.includes(error.providerCode)?' [BOOKS_CODE_'+error.providerCode+']':'';
 const cleanup=own&&Object.hasOwn(cleanupMessages,error.cleanup)?error.cleanup:'UNAVAILABLE';
 const probe=own&&Object.hasOwn(pinnedProbeMessages,error.pinnedProbe)?' [PINNED_ORG_'+error.pinnedProbe+'] '+pinnedProbeMessages[error.pinnedProbe]:'';
 const recovery=own&&error.saved?'Verified credentials were saved. Do not repeat setup or revoke them because of this local cleanup error.':'[CLEANUP_'+cleanup+'] '+cleanupMessages[cleanup];
 return 'Setup stopped ['+code+']'+http+provider+'. '+failures[code]+'.'+probe+' No connection was enabled. '+recovery+' Share only these fixed diagnostic labels, not secrets or terminal captures.';
}
function withCleanup(error,cleanup){const failure=error instanceof SetupFailure?error:new SetupFailure('UNEXPECTED');failure.cleanup=cleanup;return failure;}
async function atStage(code,operation){try{return await operation();}catch(error){if(error instanceof SetupFailure&&error.diagnostic!=='VALIDATION_FAILED')throw error;fail(code);}}
const inside=(root,path)=>{const r=relative(root,path);return r!=='..'&&!r.startsWith('..'+sep)&&!isAbsolute(r);};
const id=v=>typeof v==='string'&&/^[0-9]{1,30}$/.test(v);
const secret=v=>typeof v==='string'&&v.length>0&&v.length<4096&&!/\s/.test(v);
const aliasValid=v=>typeof v==='string'&&/^[A-Z][A-Z0-9_]{0,39}$/.test(v);

export function validateBinding(binding){
 if(!binding||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(binding.business_id)||!id(binding.organization_id)||!Object.hasOwn(zohoDomains,binding.api_domain)||!aliasValid(binding.alias)||typeof binding.organization_name!=='string'||!binding.organization_name.trim())fail();
 return binding;
}
export function authorizationUrl(binding,clientId,state){
 validateBinding(binding);if(!secret(clientId)||!secret(state))fail();
 // ORG clients use instance-bound consent with an administrator's org picker.
 // A general server-client grant cannot establish the required test-org scope.
 const url=new URL(zohoDomains[binding.api_domain]+'/oauth/v2/org/auth');
 url.search=new URLSearchParams({scope:scopes,client_id:clientId,state,response_type:'code',redirect_uri:redirectUri,access_type:'offline',prompt:'consent'}).toString();
 return url.href;
}
export function diagnosticAuthorizationUrl(binding,clientId,state){
 const url=new URL(authorizationUrl(binding,clientId,state));url.searchParams.set('scope',diagnosticScopes);return url.href;
}
export function standardDiagnosticAuthorizationUrl(binding,clientId,state){
 const url=new URL(authorizationUrl(binding,clientId,state));url.pathname='/oauth/v2/auth';url.searchParams.set('scope',standardDiagnosticScopes);return url.href;
}
async function safeJson(fetchImpl,url,options,stage){
 let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)});}catch{fail(stage+'_NETWORK');}
 if(!response?.ok){
  const failure=new SetupFailure(stage+'_HTTP');
  if(httpStatuses.includes(response?.status))failure.httpStatus=response.status;
  // Only finite literal codes are reportable; no provider message/body is logged.
  if(stage==='ORG')try{const raw=await response.text();if(raw.length<=100000){const data=JSON.parse(raw);if(booksCodes.includes(data?.code))failure.providerCode=data.code;}}catch{}
  throw failure;
 }let data;
 try{const raw=await response.text();if(raw.length>100000)fail();data=JSON.parse(raw);}catch{fail(stage+'_RESPONSE');}
 if(!data||typeof data!=='object'||Array.isArray(data))fail(stage+'_RESPONSE');
 const tokenErrors={invalid_client:'TOKEN_CLIENT_ID',invalid_client_secret:'TOKEN_CLIENT_SECRET',invalid_redirect_uri:'TOKEN_REDIRECT',invalid_code:'TOKEN_CODE',access_denied:'TOKEN_DENIED'};
 if(stage==='TOKEN'&&typeof data.error==='string'&&Object.hasOwn(tokenErrors,data.error))fail(tokenErrors[data.error]);
 if(data.error||data.code!==undefined&&data.code!==0)fail(stage+'_REJECTED');return data;
}
export async function revokeUnsavedTokens(binding,{clientId,clientSecret,refreshToken,accessToken},fetchImpl=fetch){
 try{validateBinding(binding);}catch{return 'UNAVAILABLE';}
 if(!secret(clientId)||!secret(clientSecret))return 'UNAVAILABLE';
 const refresh=secret(refreshToken),token=refresh?refreshToken:accessToken;
 if(!secret(token))return 'UNAVAILABLE';
 try{
  const response=await fetchImpl(zohoDomains[binding.api_domain]+'/oauth/v2/revoke/token',{method:'POST',redirect:'error',signal:AbortSignal.timeout(12000),headers:{Authorization:'Basic '+Buffer.from(clientId+':'+clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({token,token_type:refresh?'refresh_token':'access_token'})});
  if(response?.status!==200)return 'FAILED';
  const raw=await response.text();if(raw.length>100000)return 'FAILED';
  if(raw.trim()){const data=JSON.parse(raw);if(!data||typeof data!=='object'||Array.isArray(data)||data.error||!(data.status==='success'||data.code===0))return 'FAILED';}
  return refresh?'REFRESH_REVOKED':'ACCESS_REVOKED';
 }catch{return 'FAILED';}
}
async function probePinnedOrganization(binding,accessToken,fetchImpl){
 try{
  const result=await safeJson(fetchImpl,binding.api_domain+'/books/v3/organizations/'+binding.organization_id+'?'+new URLSearchParams({organization_id:binding.organization_id}),{headers:{Authorization:'Zoho-oauthtoken '+accessToken}},'ORG');
  const org=result.organization;
  return org&&String(org.organization_id)===binding.organization_id&&typeof org.name==='string'&&org.name.trim()===binding.organization_name.trim()&&org.currency_code==='ZAR'&&org.is_org_active!==false?'MATCHED':'MISMATCH';
 }catch(error){return error instanceof SetupFailure&&['ORG_HTTP','ORG_REJECTED'].includes(error.diagnostic)?'REJECTED':'UNAVAILABLE';}
}
export async function exchangeAndVerify(binding,{clientId,clientSecret,code},fetchImpl=fetch){
 validateBinding(binding);if(![clientId,clientSecret,code].every(secret))fail();
 let token;
 try{
 token=await safeJson(fetchImpl,zohoDomains[binding.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code})},'TOKEN');
 if(!secret(token.access_token))fail('TOKEN_ACCESS_MISSING');
 if(!secret(token.refresh_token))fail('TOKEN_REFRESH_MISSING');
 if(token.api_domain!==binding.api_domain)fail('TOKEN_DOMAIN');
 if(!Number.isFinite(token.expires_in)||token.expires_in<=0)fail('TOKEN_EXPIRY');
 // A client name or an application-side pin does not prove provider isolation.
 // Stop if this grant can see another organisation, including a live business.
 const result=await safeJson(fetchImpl,binding.api_domain+'/books/v3/organizations',{headers:{Authorization:'Zoho-oauthtoken '+token.access_token}},'ORG');
 const org=result.organizations?.[0];
 if(!Array.isArray(result.organizations)||result.organizations.length!==1)fail('ORG_COUNT');
 if(String(org?.organization_id)!==binding.organization_id)fail('ORG_ID');
 if(typeof org?.name!=='string'||org.name.trim()!==binding.organization_name.trim())fail('ORG_NAME');
 if(org.currency_code!=='ZAR')fail('ORG_CURRENCY');
 if(org.is_org_active===false)fail('ORG_INACTIVE');
 return {business_id:binding.business_id,organization_id:binding.organization_id,api_domain:binding.api_domain,environment:'staging',staging_organization_confirmed:true,client_id:clientId,client_secret:clientSecret,refresh_token:token.refresh_token};
 }catch(error){
  // Diagnostic only: never substitute a filtered/single-org result for isolation.
  if(error instanceof SetupFailure&&error.diagnostic==='ORG_HTTP'&&[400,403].includes(error.httpStatus))error.pinnedProbe=await probePinnedOrganization(binding,token.access_token,fetchImpl);
  throw withCleanup(error,await revokeUnsavedTokens(binding,{clientId,clientSecret,refreshToken:token?.refresh_token,accessToken:token?.access_token},fetchImpl));
 }
}

// Observation only. This path never opens a credential store, returns tokens or
// supplies an alternative way to pass the normal sole-organisation setup gate.
export function validateDiagnosticOther(binding,otherOrganizationId){
 validateBinding(binding);if(!id(otherOrganizationId)||otherOrganizationId===binding.organization_id)fail();return otherOrganizationId;
}
async function diagnosticProfile(binding,organizationId,accessToken,target,fetchImpl){
 try{
  const result=await safeJson(fetchImpl,binding.api_domain+'/books/v3/organizations/'+organizationId+'?'+new URLSearchParams({organization_id:organizationId}),{method:'GET',headers:{Authorization:'Zoho-oauthtoken '+accessToken}},'ORG');
  const org=result.organization;
  if(!org||String(org.organization_id)!==organizationId)return {outcome:'INCONCLUSIVE'};
  return {outcome:target?(typeof org.name==='string'&&org.name.trim()===binding.organization_name.trim()&&org.currency_code==='ZAR'&&org.is_org_active!==false?'MATCHED':'MISMATCH'):'ACCESSIBLE'};
 }catch(error){
  // A 401/404/5xx, transport error or malformed response is not evidence of an
  // organisation boundary. Even a 403 is reported only as a rejected request.
  const report={outcome:!target&&error instanceof SetupFailure&&error.diagnostic==='ORG_HTTP'&&error.httpStatus===403?'REJECTED':'INCONCLUSIVE'};
  if(error instanceof SetupFailure){if(httpStatuses.includes(error.httpStatus))report.httpStatus=error.httpStatus;if(booksCodes.includes(error.providerCode))report.providerCode=error.providerCode;}
  return report;
 }
}
export async function diagnoseTestOrganizations(binding,{clientId,clientSecret,code,otherOrganizationId},fetchImpl=fetch,{signal}={}){
 validateDiagnosticOther(binding,otherOrganizationId);if(![clientId,clientSecret,code].every(secret))fail();
 let token,report,failure;
 const cancelled=()=>{if(signal?.aborted)fail('CANCELLED');};
 try{
  cancelled();
  token=await safeJson(fetchImpl,zohoDomains[binding.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code})},'TOKEN');
  if(!secret(token.access_token))fail('TOKEN_ACCESS_MISSING');
  if(!secret(token.refresh_token))fail('TOKEN_REFRESH_MISSING');
  if(token.api_domain!==binding.api_domain)fail('TOKEN_DOMAIN');
  if(!Number.isFinite(token.expires_in)||token.expires_in<=0)fail('TOKEN_EXPIRY');
  cancelled();
  report={target:await diagnosticProfile(binding,binding.organization_id,token.access_token,true,fetchImpl),other:{outcome:'NOT_RUN'}};
  cancelled();
  if(report.target.outcome==='MATCHED')report.other=await diagnosticProfile(binding,otherOrganizationId,token.access_token,false,fetchImpl);
  cancelled();
 }catch(error){failure=error;}
 // Cleanup uses a fresh timeout, even on cancellation, and only this exchange.
 const cleanup=await revokeUnsavedTokens(binding,{clientId,clientSecret,refreshToken:token?.refresh_token,accessToken:token?.access_token},fetchImpl);
 if(failure)throw withCleanup(failure,cleanup);
 return {...report,cleanup};
}
export function diagnosticLabels(report){
 const labels=[];
 for(const [name,allowed] of [['TARGET',['MATCHED','MISMATCH','INCONCLUSIVE']],['OTHER_TEST',['REJECTED','ACCESSIBLE','INCONCLUSIVE','NOT_RUN']]]){
  const part=report?.[name==='TARGET'?'target':'other'];labels.push('[DIAG_'+name+'_'+(allowed.includes(part?.outcome)?part.outcome:'INCONCLUSIVE')+']');
  if(httpStatuses.includes(part?.httpStatus))labels.push('[DIAG_'+name+'_HTTP_'+part.httpStatus+']');
  if(booksCodes.includes(part?.providerCode))labels.push('[DIAG_'+name+'_BOOKS_CODE_'+part.providerCode+']');
 }
 labels.push('[CLEANUP_'+(Object.hasOwn(cleanupMessages,report?.cleanup)?report.cleanup:'UNAVAILABLE')+']');return labels;
}

async function diagnosticInvoices(binding,organizationId,accessToken,target,fetchImpl){
 try{
  const result=await safeJson(fetchImpl,binding.api_domain+'/books/v3/invoices?'+new URLSearchParams({organization_id:organizationId,page:'1',per_page:'1'}),{method:'GET',headers:{Authorization:'Zoho-oauthtoken '+accessToken}},'ORG');
  // Discard all invoice/customer data. This proves only a readable request,
  // including an empty list, never an exact organisation identity or boundary.
  if(result.code!==0||!Array.isArray(result.invoices)||typeof result.page_context?.has_more_page!=='boolean')return {outcome:'INCONCLUSIVE'};
  return {outcome:target?'READABLE':'ACCESSIBLE'};
 }catch(error){
  const report={outcome:!target&&error instanceof SetupFailure&&error.diagnostic==='ORG_HTTP'&&error.httpStatus===403?'REJECTED':'INCONCLUSIVE'};
  if(error instanceof SetupFailure){if(httpStatuses.includes(error.httpStatus))report.httpStatus=error.httpStatus;if(booksCodes.includes(error.providerCode))report.providerCode=error.providerCode;}
  return report;
 }
}
export async function diagnoseStandardOAuth(binding,{clientId,clientSecret,code,otherOrganizationId},fetchImpl=fetch,{signal}={}){
 validateDiagnosticOther(binding,otherOrganizationId);if(![clientId,clientSecret,code].every(secret))fail();
 // Preserve only this exchange's cleanup target. A refresh response normally
 // omits refresh_token and must never replace the original grant object.
 let issued,report,failure;
 const cancelled=()=>{if(signal?.aborted)fail('CANCELLED');};
 try{
  cancelled();
  issued=await safeJson(fetchImpl,zohoDomains[binding.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code})},'TOKEN');
  if(!secret(issued.access_token))fail('TOKEN_ACCESS_MISSING');
  if(!secret(issued.refresh_token))fail('TOKEN_REFRESH_MISSING');
  if(issued.api_domain!==binding.api_domain)fail('TOKEN_DOMAIN');
  if(!Number.isFinite(issued.expires_in)||issued.expires_in<=0)fail('TOKEN_EXPIRY');
  cancelled();
  const refreshed=await safeJson(fetchImpl,zohoDomains[binding.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',client_id:clientId,client_secret:clientSecret,refresh_token:issued.refresh_token})},'REFRESH');
  if(!secret(refreshed.access_token))fail('REFRESH_ACCESS_MISSING');
  if(refreshed.api_domain!==binding.api_domain)fail('REFRESH_DOMAIN');
  if(!Number.isFinite(refreshed.expires_in)||refreshed.expires_in<=0)fail('REFRESH_EXPIRY');
  cancelled();
  report={refresh:'PASSED',target:await diagnosticInvoices(binding,binding.organization_id,refreshed.access_token,true,fetchImpl),other:{outcome:'NOT_RUN'}};
  cancelled();
  if(report.target.outcome==='READABLE')report.other=await diagnosticInvoices(binding,otherOrganizationId,refreshed.access_token,false,fetchImpl);
  cancelled();
 }catch(error){failure=error;}
 const cleanup=await revokeUnsavedTokens(binding,{clientId,clientSecret,refreshToken:issued?.refresh_token,accessToken:issued?.access_token},fetchImpl);
 if(failure)throw withCleanup(failure,cleanup);
 return {...report,cleanup};
}
export function standardDiagnosticLabels(report){
 const labels=['[STD_REFRESH_'+(report?.refresh==='PASSED'?'PASSED':'INCONCLUSIVE')+']'];
 for(const [name,key,allowed] of [['TARGET','target',['READABLE','INCONCLUSIVE']],['OTHER_TEST','other',['REJECTED','ACCESSIBLE','INCONCLUSIVE','NOT_RUN']]]){
  const part=report?.[key];labels.push('[STD_'+name+'_INVOICES_'+(allowed.includes(part?.outcome)?part.outcome:'INCONCLUSIVE')+']');
  if(httpStatuses.includes(part?.httpStatus))labels.push('[STD_'+name+'_HTTP_'+part.httpStatus+']');
  if(booksCodes.includes(part?.providerCode))labels.push('[STD_'+name+'_BOOKS_CODE_'+part.providerCode+']');
 }
 labels.push('[CLEANUP_'+(Object.hasOwn(cleanupMessages,report?.cleanup)?report.cleanup:'UNAVAILABLE')+']');return labels;
}

export function callbackHandler(state,accountsServer,complete){
 let used=false;
 return (req,res)=>{
  res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');res.setHeader('Content-Security-Policy',"default-src 'none'; frame-ancestors 'none'");
  if(req.method!=='GET'||req.headers.host!=='127.0.0.1:3102'){res.writeHead(400);res.end('Invalid callback');return;}
  let url;try{url=new URL(req.url,redirectUri);}catch{res.writeHead(400);res.end('Invalid callback');return;}
  if(url.pathname==='/complete'){res.writeHead(200,{'Content-Type':'text/plain; charset=utf-8'});res.end('Return to the local terminal to check the setup result.');return;}
  if(url.pathname!=='/zoho/callback'){res.writeHead(404);res.end();return;}
  if(used||url.searchParams.getAll('state').length!==1||url.searchParams.get('state')!==state||url.searchParams.getAll('code').length!==1||!secret(url.searchParams.get('code'))||url.searchParams.has('error')||url.searchParams.getAll('accounts-server').length>1||url.searchParams.has('accounts-server')&&url.searchParams.get('accounts-server')!==accountsServer){
   res.writeHead(400);res.end('Invalid or expired callback');return;
  }
  used=true;res.writeHead(303,{Location:'/complete'});res.end();complete(url.searchParams.get('code'));
 };
}

// Exclusive lock + same-directory replacement preserve other aliases. No alias is overwritten.
export async function privateStore(output,{repoRoot=repository}={}){
 const target=resolve(output),parent=dirname(target),root=await realpath(repoRoot);
 if(inside(root,target))fail();
 await mkdir(parent,{recursive:true,mode:0o700});
 const canonicalParent=await realpath(parent),parentInfo=await lstat(parent);
 if(inside(root,canonicalParent)||!parentInfo.isDirectory()||parentInfo.isSymbolicLink())fail();
 const checkParent=async()=>{const current=await lstat(parent);if(!current.isDirectory()||current.isSymbolicLink()||current.dev!==parentInfo.dev||current.ino!==parentInfo.ino||await realpath(parent)!==canonicalParent)fail();};
 await checkParent();
 const lockPath=target+'.lock',lock=await open(lockPath,'wx',0o600);
 const lockInfo=await lock.stat();
 let original=null,entries={},closed=false;
 const release=async()=>{if(!closed){closed=true;await lock.close();try{await checkParent();const current=await lstat(lockPath);if(current.isFile()&&!current.isSymbolicLink()&&current.dev===lockInfo.dev&&current.ino===lockInfo.ino)await unlink(lockPath);}catch{ /* A moved/replaced directory must not cause deletion at another path. */ }}};
 try{
  await checkParent();
  try{const info=await lstat(target);if(!info.isFile()||info.isSymbolicLink()||process.platform!=='win32'&&(info.mode&0o077))fail();original=await readFile(target,'utf8');entries=JSON.parse(original);if(!entries||Array.isArray(entries)||typeof entries!=='object')fail();}catch(error){if(error.code!=='ENOENT')throw error;}
  const assertAvailable=(alias,entry)=>{
   if(closed||!aliasValid(alias))fail();
   if(Object.hasOwn(entries,alias)||Object.values(entries).some(e=>e?.business_id===entry.business_id||e?.organization_id===entry.organization_id))fail('PRIVATE_BINDING_EXISTS');
  };
  return {close:release,assertAvailable,async save(alias,entry){
   assertAvailable(alias,entry);
   await checkParent();
   try{const now=await lstat(target);if(original===null||!now.isFile()||now.isSymbolicLink()||await readFile(target,'utf8')!==original)fail();}catch(error){if(error.code!=='ENOENT'||original!==null)throw error;}
   const temporary=join(parent,'.zoho-'+randomBytes(16).toString('hex')+'.tmp');
   let handle,tempInfo;try{handle=await open(temporary,'wx',0o600);tempInfo=await handle.stat();await checkParent();await handle.writeFile(JSON.stringify({...entries,[alias]:entry},null,2)+'\n');await handle.sync();await handle.close();handle=null;await checkParent();await rename(temporary,target);}finally{if(handle)await handle.close();try{await checkParent();const current=await lstat(temporary);if(tempInfo&&current.isFile()&&!current.isSymbolicLink()&&current.dev===tempInfo.dev&&current.ino===tempInfo.ino)await unlink(temporary);}catch{}}
  }};
 }catch(error){await release();throw error;}
}

async function closeCallbackServer(server){
 if(!server)return;
 let force;
 try{await new Promise((resolveClose,rejectClose)=>{
  // Stop accepting connections first; a browser may leave an unused socket or
  // incomplete request open. Give responses a short grace period, then close
  // only this helper's loopback connections so final output is not held back.
  force=setTimeout(()=>{try{server.closeAllConnections();}catch{rejectClose(new SetupFailure('LOCAL_CLEANUP'));}},1000);
  server.close(error=>error?rejectClose(error):resolveClose());
 });}finally{clearTimeout(force);}
}

async function main(){
 const standard=process.argv.length===3&&process.argv[2]==='--diagnose-standard-oauth';
 const diagnostic=standard||process.argv.length===3&&process.argv[2]==='--diagnose-test-orgs';
 if(!process.stdin.isTTY||!process.stdout.isTTY||process.argv.length>2&&!diagnostic)throw new Error('Run interactively without command-line secrets');
 let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
 const terminal=createInterface({input:process.stdin,output,terminal:true,historySize:0});
 const cancellation=new AbortController(),cancel=()=>cancellation.abort();
 terminal.on('SIGINT',cancel);process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 // Keep the label on its own completed console line. PowerShell can redraw the
 // empty readline input line; that must not hide the question above it.
 const ask=async(prompt,hidden=false)=>{process.stdout.write(prompt+'\n');muted=hidden;try{return(await terminal.question('',{signal:cancellation.signal})).trim();}finally{muted=false;if(hidden)process.stdout.write('\n');}};
 let store,server,timer,binding,entry,failure,diagnosticReport,otherOrganizationId,saved=false;
 try{
  console.log(standard?'FaraiOS standard OAuth TEST diagnostic only. Use a dedicated Server-based TEST client and a Zoho login with access ONLY to the target TEST organisation. No credential file will be opened or saved.':diagnostic?'FaraiOS TEST diagnostic only. Use the dedicated TEST ORG client. No credential file will be opened or saved.':'FaraiOS STAGING only. Use a newly registered ORG client for the TEST organisation.');
  console.log('Register Homepage URL http://127.0.0.1:3101 and Redirect URI '+redirectUri);
  console.log(standard?'Only invoice READ is requested. Refresh this new grant once, read only the two configured TEST invoice lists, then attempt to revoke only this newly received grant.':diagnostic?'Only organisation settings READ is requested. After the diagnostic, always attempt to revoke only this newly received token.':'If newly received tokens cannot be verified or saved, this helper will attempt to revoke only those tokens with this dedicated client.');
  binding=validateBinding({business_id:await ask('FaraiOS business UUID: '),organization_id:await ask('New Zoho TEST organisation ID: '),organization_name:await ask('Exact TEST organisation name: '),alias:await ask('Credential alias: '),api_domain:await ask('API domain (e.g. https://www.zohoapis.com): ')});
  if(diagnostic)otherOrganizationId=validateDiagnosticOther(binding,await ask('Other isolated TEST organisation ID (never a live organisation): '));
  if(await ask(diagnostic?'Confirm BOTH organisation IDs are isolated TEST organisations (type TEST): ':'Confirm this is an isolated test organisation (type TEST): ')!=='TEST')fail();
  if(standard&&await ask('Confirm the Zoho login has access ONLY to the target TEST organisation, no live or other business organisations (type TEST_ONLY_ACCOUNT): ')!=='TEST_ONLY_ACCOUNT')fail();
  if(!diagnostic){
   const target=await ask('Private JSON path (Enter for your profile default): ')||join(homedir(),'.faraios-staging','zoho-credentials.json');
   store=await atStage('PRIVATE_FILE_OPEN',()=>privateStore(target));store.assertAvailable(binding.alias,binding);
  }
  const clientId=await ask('New dedicated Client ID (hidden): ',true),clientSecret=await ask('New dedicated Client Secret (hidden): ',true);
  if(![clientId,clientSecret].every(secret))fail();
  const state=randomBytes(32).toString('hex');
  const consentUrl=standard?standardDiagnosticAuthorizationUrl(binding,clientId,state):diagnostic?diagnosticAuthorizationUrl(binding,clientId,state):authorizationUrl(binding,clientId,state);
  const code=await new Promise((resolveCode,rejectCode)=>{
   if(cancellation.signal.aborted){rejectCode(new SetupFailure('CANCELLED'));return;}
   cancellation.signal.addEventListener('abort',()=>rejectCode(new SetupFailure('CANCELLED')),{once:true});
   server=createServer(callbackHandler(state,zohoDomains[binding.api_domain],resolveCode));server.once('error',()=>rejectCode(new SetupFailure('CALLBACK_UNAVAILABLE')));
   server.listen(3102,'127.0.0.1',()=>{
    console.log(standard?'Open this authorization URL in your browser. Standard OAuth may have no organisation picker. Use only the confirmed TEST-only login and this read-only scope:':diagnostic?'Open this authorization URL in your browser. Accept only the named TEST organisation and this read-only scope:':'Open this authorization URL in your browser. Accept only the named TEST organisation and these four scopes:');
    console.log(standard?standardDiagnosticScopes:diagnostic?diagnosticScopes:scopes);console.log(consentUrl);
    console.log(standard?'If the signed-in account has live or other business organisation access, or the scope is wrong, deny and stop.':'If Zoho offers all organisations or the wrong organisation, deny and stop.');
   });
   timer=setTimeout(()=>rejectCode(new SetupFailure('CALLBACK_EXPIRED')),10*60*1000);
  });
  clearTimeout(timer);
  console.log(standard?'Callback received. Refreshing only this new TEST grant, then reading the configured TEST invoice lists...':diagnostic?'Callback received. Reading only the two configured TEST organisation profiles...':'Callback received. Verifying the TEST organisation...');
  if(diagnostic){
   diagnosticReport=await (standard?diagnoseStandardOAuth:diagnoseTestOrganizations)(binding,{clientId,clientSecret,code,otherOrganizationId},fetch,{signal:cancellation.signal});
   if(cancellation.signal.aborted)throw withCleanup(new SetupFailure('CANCELLED'),diagnosticReport.cleanup);
  }else{
   entry=await exchangeAndVerify(binding,{clientId,clientSecret,code});
   if(cancellation.signal.aborted)fail('CANCELLED');
   await atStage('PRIVATE_FILE_SAVE',()=>store.save(binding.alias,entry));saved=true;
  }
 }catch(error){
  failure=entry&&!saved?withCleanup(error,await revokeUnsavedTokens(binding,{clientId:entry.client_id,clientSecret:entry.client_secret,refreshToken:entry.refresh_token})):error;
 }finally{
  clearTimeout(timer);
  if(server)console.log('Closing local callback listener...');
  for(const close of [()=>closeCallbackServer(server),()=>store?.close(),()=>terminal.close()])try{await close();}catch{failure??=diagnosticReport?withCleanup(new SetupFailure('LOCAL_CLEANUP'),diagnosticReport.cleanup):new SetupFailure('LOCAL_CLEANUP');}
  process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
 }
 if(failure){if(saved){failure=failure instanceof SetupFailure?failure:new SetupFailure('LOCAL_CLEANUP');failure.saved=true;}throw failure;}
 if(diagnostic){
  console.log('TEST diagnostic observations only. No credentials saved, connection enabled or invoice synced. Full organisation isolation is not established by these observations.');
  for(const label of (standard?standardDiagnosticLabels:diagnosticLabels)(diagnosticReport))console.log(label);
  if(diagnosticReport.cleanup!=='REFRESH_REVOKED')console.log('Cleanup is partial or unconfirmed. Stop for manual cleanup of only this diagnostic grant before retrying.');
  if(diagnosticReport.target.outcome!==(standard?'READABLE':'MATCHED')||diagnosticReport.other.outcome!=='REJECTED'||diagnosticReport.cleanup!=='REFRESH_REVOKED')process.exitCode=1;
  return;
 }
 console.log('Private credentials saved. Exactly one TEST organisation verified. No connection enabled or invoice synced.');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{
 const message=setupFailureMessage(error);
 if(['--diagnose-test-orgs','--diagnose-standard-oauth'].includes(process.argv[2])){console.error('TEST diagnostic stopped. No credentials saved or connection enabled.');for(const label of message.match(/\[[A-Z][A-Z0-9_]*\]/g)??[])console.error(label);console.error('If consent was granted and cleanup is not REFRESH_REVOKED, stop for manual cleanup of only this diagnostic grant.');}else console.error(message);
 process.exitCode=1;
});
