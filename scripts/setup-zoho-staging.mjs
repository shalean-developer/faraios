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
const repository=fileURLToPath(new URL('..',import.meta.url));
const fail=()=>{throw new Error('Private setup validation failed');};
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
 const url=new URL(zohoDomains[binding.api_domain]+'/oauth/v2/auth');
 url.search=new URLSearchParams({scope:scopes,client_id:clientId,state,response_type:'code',redirect_uri:redirectUri,access_type:'offline',prompt:'consent'}).toString();
 return url.href;
}
async function safeJson(fetchImpl,url,options){
 let response;try{response=await fetchImpl(url,{...options,redirect:'error',signal:AbortSignal.timeout(12000)});}catch{fail();}
 if(!response.ok)fail();let data;
 try{const raw=await response.text();if(raw.length>100000)fail();data=JSON.parse(raw);}catch{fail();}
 if(!data||data.error||data.code!==undefined&&data.code!==0)fail();return data;
}
export async function exchangeAndVerify(binding,{clientId,clientSecret,code},fetchImpl=fetch){
 validateBinding(binding);if(![clientId,clientSecret,code].every(secret))fail();
 const token=await safeJson(fetchImpl,zohoDomains[binding.api_domain]+'/oauth/v2/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,code})});
 if(!secret(token.access_token)||!secret(token.refresh_token)||token.api_domain!==binding.api_domain||!Number.isFinite(token.expires_in)||token.expires_in<=0)fail();
 // A client name or an application-side pin does not prove provider isolation.
 // Stop if this grant can see another organisation, including a live business.
 const result=await safeJson(fetchImpl,binding.api_domain+'/books/v3/organizations',{headers:{Authorization:'Zoho-oauthtoken '+token.access_token}});
 const org=result.organizations?.[0];
 if(!Array.isArray(result.organizations)||result.organizations.length!==1||String(org?.organization_id)!==binding.organization_id||org.name?.trim()!==binding.organization_name.trim()||org.currency_code!=='ZAR'||org.is_org_active===false)fail();
 return {business_id:binding.business_id,organization_id:binding.organization_id,api_domain:binding.api_domain,environment:'staging',staging_organization_confirmed:true,client_id:clientId,client_secret:clientSecret,refresh_token:token.refresh_token};
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
  return {close:release,async save(alias,entry){
   if(closed||!aliasValid(alias)||Object.hasOwn(entries,alias)||Object.values(entries).some(e=>e?.business_id===entry.business_id||e?.organization_id===entry.organization_id))fail();
   await checkParent();
   try{const now=await lstat(target);if(original===null||!now.isFile()||now.isSymbolicLink()||await readFile(target,'utf8')!==original)fail();}catch(error){if(error.code!=='ENOENT'||original!==null)throw error;}
   const temporary=join(parent,'.zoho-'+randomBytes(16).toString('hex')+'.tmp');
   let handle,tempInfo;try{handle=await open(temporary,'wx',0o600);tempInfo=await handle.stat();await checkParent();await handle.writeFile(JSON.stringify({...entries,[alias]:entry},null,2)+'\n');await handle.sync();await handle.close();handle=null;await checkParent();await rename(temporary,target);}finally{if(handle)await handle.close();try{await checkParent();const current=await lstat(temporary);if(tempInfo&&current.isFile()&&!current.isSymbolicLink()&&current.dev===tempInfo.dev&&current.ino===tempInfo.ino)await unlink(temporary);}catch{}}
  }};
 }catch(error){await release();throw error;}
}

async function main(){
 if(!process.stdin.isTTY||!process.stdout.isTTY||process.argv.length>2)throw new Error('Run interactively without command-line secrets');
 let muted=false;const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
 const terminal=createInterface({input:process.stdin,output,terminal:true,historySize:0});
 const cancellation=new AbortController(),cancel=()=>cancellation.abort();
 terminal.on('SIGINT',cancel);process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 // Keep the label on its own completed console line. PowerShell can redraw the
 // empty readline input line; that must not hide the question above it.
 const ask=async(prompt,hidden=false)=>{process.stdout.write(prompt+'\n');muted=hidden;try{return(await terminal.question('',{signal:cancellation.signal})).trim();}finally{muted=false;if(hidden)process.stdout.write('\n');}};
 let store,server,timer;
 try{
  console.log('FaraiOS STAGING only. Use a newly registered dedicated client. Keep existing clients unchanged.');
  console.log('Register Homepage URL http://127.0.0.1:3101 and Redirect URI '+redirectUri);
  const binding=validateBinding({business_id:await ask('FaraiOS business UUID: '),organization_id:await ask('New Zoho TEST organisation ID: '),organization_name:await ask('Exact TEST organisation name: '),alias:await ask('Credential alias: '),api_domain:await ask('API domain (e.g. https://www.zohoapis.com): ')});
  if(await ask('Confirm this is an isolated test organisation (type TEST): ')!=='TEST')fail();
  const target=await ask('Private JSON path (Enter for your profile default): ')||join(homedir(),'.faraios-staging','zoho-credentials.json');
  store=await privateStore(target);
  const clientId=await ask('New dedicated Client ID (hidden): ',true),clientSecret=await ask('New dedicated Client Secret (hidden): ',true);
  if(![clientId,clientSecret].every(secret))fail();
  const state=randomBytes(32).toString('hex');
  const consentUrl=authorizationUrl(binding,clientId,state);
  const code=await new Promise((resolveCode,rejectCode)=>{
   if(cancellation.signal.aborted){rejectCode(new Error('Setup cancelled'));return;}
   cancellation.signal.addEventListener('abort',()=>rejectCode(new Error('Setup cancelled')),{once:true});
   server=createServer(callbackHandler(state,zohoDomains[binding.api_domain],resolveCode));server.once('error',()=>rejectCode(new Error('Local callback unavailable')));
   server.listen(3102,'127.0.0.1',()=>{
    console.log('Open this authorization URL in your browser. Accept only the named TEST organisation and these four scopes:');
    console.log(scopes);console.log(consentUrl);
    console.log('If Zoho offers all organisations or the wrong organisation, deny and stop.');
   });
   timer=setTimeout(()=>rejectCode(new Error('Authorization expired')),10*60*1000);
  });
  clearTimeout(timer);
  const entry=await exchangeAndVerify(binding,{clientId,clientSecret,code});
  if(cancellation.signal.aborted)fail();
  await store.save(binding.alias,entry);
  console.log('Private credentials saved. Exactly one TEST organisation verified. No connection enabled or invoice synced.');
 }finally{clearTimeout(timer);if(server)await new Promise(r=>server.close(r));await store?.close();terminal.close();process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Setup stopped. No connection was enabled. Check the dedicated test client and local settings; do not share secrets or terminal captures. If consent was granted but saving failed, revoke only this new test application in Zoho before retrying.');process.exitCode=1;});
