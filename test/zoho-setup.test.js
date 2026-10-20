import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,stat,chmod,rename,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {authorizationUrl,exchangeAndVerify,callbackHandler,privateStore,redirectUri,scopes,validateBinding} from '../scripts/setup-zoho-staging.mjs';

const binding={business_id:'11111111-1111-4111-8111-111111111111',organization_id:'123456',organization_name:'Example TEST',alias:'EXAMPLE_TEST',api_domain:'https://www.zohoapis.com'};
const credentials={clientId:'test-client',clientSecret:'private-test-secret',code:'private-test-code'};
const token={access_token:'private-access',refresh_token:'private-refresh',api_domain:binding.api_domain,expires_in:3600};
const org={organization_id:binding.organization_id,name:binding.organization_name,currency_code:'ZAR',is_org_active:true};
const response=data=>({ok:true,text:async()=>JSON.stringify(data)});
const fake=(organizationResponse={code:0,organizations:[org]},tokenResponse=token)=>{const calls=[];return {calls,fetch:async(url,options)=>{calls.push({url,options});return response(calls.length===1?tokenResponse:organizationResponse);}};};

test('private setup uses only the four required scopes and fixed loopback callback',()=>{
 const url=new URL(authorizationUrl(binding,credentials.clientId,'random-state'));
 assert.equal(url.origin,'https://accounts.zoho.com');assert.equal(url.pathname,'/oauth/v2/auth');
 assert.equal(url.searchParams.get('redirect_uri'),redirectUri);assert.equal(url.searchParams.get('scope'),scopes);
 assert.equal(url.searchParams.get('access_type'),'offline');assert.equal(url.searchParams.get('prompt'),'consent');
 assert.equal(url.searchParams.get('state'),'random-state');assert.ok(!url.href.includes(credentials.clientSecret));
 assert.deepEqual(scopes.split(',').sort(),['ZohoBooks.contacts.READ','ZohoBooks.invoices.CREATE','ZohoBooks.invoices.READ','ZohoBooks.settings.READ']);
});
test('setup rejects untrusted endpoints, malformed bindings and unsafe aliases',()=>{
 for(const replacement of [{api_domain:'https://attacker.test'},{business_id:'not-a-uuid'},{organization_id:'123&other=1'},{alias:'__proto__'},{alias:'../file'},{alias:'lowercase'},{alias:'9START'},{alias:'A'.repeat(41)},{organization_name:''}])assert.throws(()=>validateBinding({...binding,...replacement}));
});
test('OAuth exchange sends secrets only in POST body and verifies the sole exact ZAR test org',async()=>{
 const f=fake(),entry=await exchangeAndVerify(binding,credentials,f.fetch);
 assert.equal(f.calls.length,2);assert.equal(f.calls[0].url,'https://accounts.zoho.com/oauth/v2/token');
 assert.equal(f.calls[0].options.method,'POST');assert.equal(f.calls[0].options.body.get('client_secret'),credentials.clientSecret);
 assert.equal(f.calls[0].options.body.get('redirect_uri'),redirectUri);assert.equal(f.calls[0].options.redirect,'error');
 assert.equal(f.calls[1].url,binding.api_domain+'/books/v3/organizations');assert.equal(f.calls[1].options.headers.Authorization,'Zoho-oauthtoken '+token.access_token);
 assert.equal(entry.staging_organization_confirmed,true);assert.equal(entry.business_id,binding.business_id);assert.equal(entry.refresh_token,token.refresh_token);
 assert.equal(entry.access_token,undefined);assert.equal(entry.code,undefined);
});
test('a grant seeing another organisation or a mismatched test profile is rejected',async()=>{
 for(const organizations of [[],[org,{...org,organization_id:'999'}],[{...org,organization_id:'999'}],[{...org,name:'Production'}],[{...org,currency_code:'USD'}],[{...org,is_org_active:false}]])await assert.rejects(exchangeAndVerify(binding,credentials,fake({code:0,organizations}).fetch),/^Error: Private setup validation failed$/);
});
test('token errors, region mismatch, malformed data and transport errors remain redacted',async()=>{
 for(const t of [{...token,error:credentials.clientSecret},{...token,api_domain:'https://attacker.test'},{...token,refresh_token:''},{...token,expires_in:0}])await assert.rejects(exchangeAndVerify(binding,credentials,fake(undefined,t).fetch),/^Error: Private setup validation failed$/);
 for(const fetcher of [async()=>{throw new Error(credentials.clientSecret);},async()=>({ok:false}),async()=>({ok:true,text:async()=>credentials.clientSecret})])await assert.rejects(exchangeAndVerify(binding,credentials,fetcher),/^Error: Private setup validation failed$/);
});

function request(handler,url,headers={host:'127.0.0.1:3102'},method='GET'){
 const result={headers:{},status:null,body:''};
 handler({url,headers,method},{setHeader(k,v){result.headers[k]=v;},writeHead(status,headers){result.status=status;Object.assign(result.headers,headers);},end(body=''){result.body=body;}});return result;
}
test('callback validates state, host, method, region and parameter uniqueness without echoing codes',()=>{
 const codes=[],handler=callbackHandler('random-state','https://accounts.zoho.com',c=>codes.push(c));
 const good='/zoho/callback?state=random-state&code=private-code&accounts-server=https%3A%2F%2Faccounts.zoho.com';
 for(const path of [good.replace('random-state','foreign'),good+'&state=random-state',good+'&code=another',good.replace('accounts.zoho.com','attacker.test'),good+'&error=denied'])assert.equal(request(handler,path).status,400);
 assert.equal(request(handler,good,{host:'attacker.test'}).status,400);assert.equal(request(handler,good,undefined,'POST').status,400);assert.equal(request(handler,'/unrelated').status,404);
 assert.deepEqual(codes,[]);const result=request(handler,good);assert.equal(result.status,303);assert.equal(result.headers.Location,'/complete');assert.equal(result.headers['Cache-Control'],'no-store');assert.ok(!JSON.stringify(result).includes('private-code'));assert.deepEqual(codes,['private-code']);
 assert.equal(request(handler,good).status,400);assert.equal(request(handler,'/complete').status,200);
});

async function fixture(t){const root=await mkdtemp(join(tmpdir(),'faraios-private-setup-'));t.after(()=>rm(root,{recursive:true,force:true}));const repo=join(root,'repo');await mkdir(repo);return {root,repo,output:join(root,'private','zoho.json')};}
test('private store preserves other aliases, uses restrictive POSIX mode and never overwrites a binding',async t=>{
 const {repo,output}=await fixture(t),entry={business_id:binding.business_id,organization_id:binding.organization_id,client_secret:'test-only'};
 const first=await privateStore(output,{repoRoot:repo});await first.save(binding.alias,entry);await first.close();
 if(process.platform!=='win32')assert.equal((await stat(output)).mode&0o777,0o600);
 const second=await privateStore(output,{repoRoot:repo});await assert.rejects(second.save(binding.alias,entry));await assert.rejects(second.save('DUPLICATE',entry));
 await second.save('ANOTHER_TEST',{business_id:'22222222-2222-4222-8222-222222222222',organization_id:'234567'});await second.close();
 assert.deepEqual(JSON.parse(await readFile(output,'utf8')),{[binding.alias]:entry,ANOTHER_TEST:{business_id:'22222222-2222-4222-8222-222222222222',organization_id:'234567'}});
});
test('private store rejects repository paths, misleading .. prefixes and symlinks into Git',async t=>{
 const {root,repo}=await fixture(t);await assert.rejects(privateStore(join(repo,'secret.json'),{repoRoot:repo}));
 await mkdir(join(repo,'..private'));await assert.rejects(privateStore(join(repo,'..private','secret.json'),{repoRoot:repo}));
 if(process.platform!=='win32'){const link=join(root,'link');await symlink(repo,link,'dir');await assert.rejects(privateStore(join(link,'secret.json'),{repoRoot:repo}));}
});
test('private store rejects concurrent setup and detects changed files without replacing them',async t=>{
 const {repo,output}=await fixture(t),first=await privateStore(output,{repoRoot:repo});
 await assert.rejects(privateStore(output,{repoRoot:repo}));
 await writeFile(output,'{"changed":true}',{mode:0o600});await assert.rejects(first.save('EXAMPLE_TEST',{}));await first.close();assert.equal(await readFile(output,'utf8'),'{"changed":true}');
});
test('private store rejects loose POSIX permissions and existing symlink files',async t=>{
 if(process.platform==='win32')return;
 const {root,repo,output}=await fixture(t);await mkdir(join(root,'private'));await writeFile(output,'{}');await chmod(output,0o644);await assert.rejects(privateStore(output,{repoRoot:repo}));
 await rm(output);const other=join(root,'elsewhere');await writeFile(other,'{}',{mode:0o600});await symlink(other,output);await assert.rejects(privateStore(output,{repoRoot:repo}));assert.equal(await readFile(other,'utf8'),'{}');
});
test('moving the private parent and replacing it with a repo symlink cannot write secrets or delete a different lock',async t=>{
 if(process.platform==='win32')return;
 const {root,repo,output}=await fixture(t),store=await privateStore(output,{repoRoot:repo});
 await rename(join(root,'private'),join(root,'moved'));await symlink(repo,join(root,'private'),'dir');
 await writeFile(join(repo,'zoho.json.lock'),'unrelated-lock');
 await assert.rejects(store.save('EXAMPLE_TEST',{client_secret:'synthetic-private-value'}));await store.close();
 assert.deepEqual(await readdir(repo),['zoho.json.lock']);assert.equal(await readFile(join(repo,'zoho.json.lock'),'utf8'),'unrelated-lock');
});
test('operator CLI prints complete prompt lines, hides secret input and cancels without saving', {timeout:30000}, async t=>{
 const {output}=await fixture(t);
 // A test-only terminal stream enables the real CLI/readline path under Linux
 // and Windows CI, without a display server or any provider request.
 const preload="Object.defineProperty(process.stdin,'isTTY',{value:true});process.stdin.setRawMode=()=>process.stdin;Object.defineProperty(process.stdout,'isTTY',{value:true});process.stdout.columns=100;";
 const child=spawn(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(preload),fileURLToPath(new URL('../scripts/setup-zoho-staging.mjs',import.meta.url))],{stdio:['pipe','pipe','pipe']});
 let transcript='',stderr='',exited=false;
 const finished=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',(code,signal)=>{exited=true;resolve({code,signal});});});
 child.stdout.on('data',data=>{transcript+=data;});child.stderr.on('data',data=>{stderr+=data;});
 t.after(()=>{if(!exited)child.kill();});
 const waitFor=async text=>{
  const end=Date.now()+5000;
  while(!transcript.includes(text)){
   if(exited)throw new Error('CLI ended before its next prompt');
   if(Date.now()>end)throw new Error('CLI prompt did not become visible');
   await new Promise(r=>setTimeout(r,10));
  }
 };
 const answer=async(label,value)=>{await waitFor(label+'\n');child.stdin.write(value+'\n');};
 await answer('FaraiOS business UUID: ',binding.business_id);
 await answer('New Zoho TEST organisation ID: ',binding.organization_id);
 await answer('Exact TEST organisation name: ',binding.organization_name);
 await answer('Credential alias: ',binding.alias);
 await answer('API domain (e.g. https://www.zohoapis.com): ',binding.api_domain);
 await answer('Confirm this is an isolated test organisation (type TEST): ','TEST');
 await answer('Private JSON path (Enter for your profile default): ',output);
 await answer('New dedicated Client ID (hidden): ','synthetic-client-id');
 await answer('New dedicated Client Secret (hidden): ','NEVER_ECHO_SYNTHETIC_SECRET');
 await waitFor('If Zoho offers all organisations or the wrong organisation, deny and stop.');
 assert.ok(!transcript.includes('NEVER_ECHO_SYNTHETIC_SECRET'));assert.ok(!stderr.includes('NEVER_ECHO_SYNTHETIC_SECRET'));
 assert.ok(!transcript.slice(0,transcript.indexOf('Open this authorization URL')).includes('synthetic-client-id'));
 child.stdin.write('\u0003');const result=await finished;assert.equal(result.code,1);assert.match(stderr,/Setup stopped/);
 await assert.rejects(stat(output),{code:'ENOENT'});await assert.rejects(stat(output+'.lock'),{code:'ENOENT'});
});
