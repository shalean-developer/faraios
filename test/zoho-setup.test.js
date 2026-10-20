import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,readFile,writeFile,rm,symlink,stat,chmod,rename,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {connect} from 'node:net';
import {fileURLToPath} from 'node:url';
import {authorizationUrl,diagnosticAuthorizationUrl,diagnosticScopes,diagnoseTestOrganizations,diagnosticLabels,validateDiagnosticOther,exchangeAndVerify,callbackHandler,privateStore,redirectUri,scopes,validateBinding,setupFailureMessage,revokeUnsavedTokens} from '../scripts/setup-zoho-staging.mjs';

const binding={business_id:'11111111-1111-4111-8111-111111111111',organization_id:'123456',organization_name:'Example TEST',alias:'EXAMPLE_TEST',api_domain:'https://www.zohoapis.com'};
const credentials={clientId:'test-client',clientSecret:'private-test-secret',code:'private-test-code'};
const token={access_token:'private-access',refresh_token:'private-refresh',api_domain:binding.api_domain,expires_in:3600};
const org={organization_id:binding.organization_id,name:binding.organization_name,currency_code:'ZAR',is_org_active:true};
const response=data=>({ok:true,status:200,text:async()=>JSON.stringify(data)});
const fake=(organizationResponse={code:0,organizations:[org]},tokenResponse=token)=>{const calls=[];return {calls,fetch:async(url,options)=>{calls.push({url,options});return response(String(url).endsWith('/revoke/token')?{status:'success'}:calls.length===1?tokenResponse:organizationResponse);}};};

test('private setup uses only the four required scopes and fixed loopback callback',()=>{
 const url=new URL(authorizationUrl(binding,credentials.clientId,'random-state'));
 assert.equal(url.origin,'https://accounts.zoho.com');assert.equal(url.pathname,'/oauth/v2/org/auth');
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
test('fixed diagnostics distinguish token and organisation failures without revealing provider data',async()=>{
 const cases=[
  [{error:'invalid_client'},undefined,'TOKEN_CLIENT_ID'],[{error:'invalid_client_secret'},undefined,'TOKEN_CLIENT_SECRET'],
  [{error:'invalid_redirect_uri'},undefined,'TOKEN_REDIRECT'],[{error:'invalid_code'},undefined,'TOKEN_CODE'],[{error:'access_denied'},undefined,'TOKEN_DENIED'],
  [{error:credentials.clientSecret},undefined,'TOKEN_REJECTED'],[{...token,access_token:''},undefined,'TOKEN_ACCESS_MISSING'],
  [{...token,refresh_token:''},undefined,'TOKEN_REFRESH_MISSING'],[{...token,api_domain:'https://private-region.test'},undefined,'TOKEN_DOMAIN'],[{...token,expires_in:0},undefined,'TOKEN_EXPIRY'],
  [token,{code:0,organizations:[org,{...org,organization_id:'999'}]},'ORG_COUNT'],[token,{code:0,organizations:[{...org,organization_id:'999'}]},'ORG_ID'],
  [token,{code:0,organizations:[{...org,name:credentials.clientSecret}]},'ORG_NAME'],[token,{code:0,organizations:[{...org,currency_code:'USD'}]},'ORG_CURRENCY'],[token,{code:0,organizations:[{...org,is_org_active:false}]},'ORG_INACTIVE'],
  [token,{error:credentials.clientSecret},'ORG_REJECTED']
 ];
 for(const [t,o,expected] of cases){
  await assert.rejects(exchangeAndVerify(binding,credentials,fake(o,t).fetch),error=>{
   const message=setupFailureMessage(error);assert.ok(message.includes('['+expected+']'));
   for(const privateValue of [...Object.values(credentials),token.access_token,token.refresh_token,'https://private-region.test'])assert.ok(!message.includes(privateValue));
   return true;
  });
 }
 for(const error of [new Error(credentials.clientSecret),{diagnostic:'TOKEN_CLIENT_SECRET',message:token.refresh_token},null]){
  const message=setupFailureMessage(error);assert.ok(message.includes('[UNEXPECTED]'));assert.ok(!message.includes(credentials.clientSecret));assert.ok(!message.includes(token.refresh_token));
 }
 for(const [fetcher,expected] of [[async()=>{throw new Error(credentials.clientSecret);},'TOKEN_NETWORK'],[async()=>({ok:false}),'TOKEN_HTTP'],[async()=>({ok:true,text:async()=>credentials.clientSecret}),'TOKEN_RESPONSE']]){
  await assert.rejects(exchangeAndVerify(binding,credentials,fetcher),error=>setupFailureMessage(error).includes('['+expected+']'));
 }
});
test('organisation HTTP diagnostics retain only literal status/code metadata and preserve the primary failure',async()=>{
 for(const [status,code,expected] of [[403,57,'[HTTP_403] [BOOKS_CODE_57]'],[400,6024,'[HTTP_400] [BOOKS_CODE_6024]'],[401,'private-data','[HTTP_401]'],[99999,99999,'']]){
  const calls=[];
  const fetcher=async(url,options)=>{calls.push({url,options});if(calls.length===1)return response(token);if(calls.length===2)return {ok:false,status,text:async()=>JSON.stringify({code,message:credentials.clientSecret,organization_id:binding.organization_id})};if(String(url).includes('/organizations/'))return response({code:0,organization:org});return response({status:'success'});};
  await assert.rejects(exchangeAndVerify(binding,credentials,fetcher),error=>{
   const message=setupFailureMessage(error);assert.ok(message.includes('[ORG_HTTP]'));assert.ok(message.includes(expected));assert.ok(message.includes('[CLEANUP_REFRESH_REVOKED]'));
   for(const value of [credentials.clientSecret,binding.organization_id,'private-data','99999'])assert.ok(!message.includes(value));return true;
  });
  assert.equal(calls.length,[400,403].includes(status)?4:3);assert.equal(calls.at(-1).url,'https://accounts.zoho.com/oauth/v2/revoke/token');
  if([400,403].includes(status))assert.equal(calls[2].url,binding.api_domain+'/books/v3/organizations/'+binding.organization_id+'?organization_id='+binding.organization_id);
 }
 const calls=[];
 await assert.rejects(exchangeAndVerify(binding,credentials,async(url,options)=>{calls.push({url,options});if(calls.length===1)return response(token);if(calls.length===2)return {ok:false,status:403,text:async()=>{throw new Error(credentials.clientSecret);}};throw new Error(credentials.clientSecret);}),error=>{
  const message=setupFailureMessage(error);assert.ok(message.includes('[ORG_HTTP] [HTTP_403]'));assert.ok(message.includes('[CLEANUP_FAILED]'));assert.ok(!message.includes(credentials.clientSecret));return true;
 });
});
test('a diagnostic single-org match never passes isolation or triggers more than one pinned probe',async()=>{
 for(const [profile,expected] of [[org,'MATCHED'],[{...org,currency_code:'USD'},'MISMATCH'],[null,'MISMATCH']]){
  const calls=[];
  await assert.rejects(exchangeAndVerify(binding,credentials,async(url,options)=>{
   calls.push({url,options});if(String(url).endsWith('/oauth/v2/revoke/token'))return response({status:'success'});if(String(url).endsWith('/oauth/v2/token'))return response(token);if(String(url).includes('/organizations/'))return response({code:0,organization:profile});return{ok:false,status:403,text:async()=>JSON.stringify({code:57,message:credentials.clientSecret})};
  }),error=>{const m=setupFailureMessage(error);assert.ok(m.includes('[ORG_HTTP] [HTTP_403]'));assert.ok(m.includes('[PINNED_ORG_'+expected+']'));assert.ok(m.includes('[CLEANUP_REFRESH_REVOKED]'));assert.ok(!m.includes(credentials.clientSecret));return true;});
  assert.equal(calls.length,4);assert.ok(calls[2].url.includes('/organizations/'+binding.organization_id+'?organization_id='+binding.organization_id));
 }
});
test('unsaved token cleanup is pinned, client-authenticated, bounded and limited to known current tokens',async()=>{
 const calls=[],fetcher=async(url,options)=>{calls.push({url,options});return response({status:'success'});};
 const own={...credentials,refreshToken:token.refresh_token,accessToken:token.access_token};
 assert.equal(await revokeUnsavedTokens(binding,own,fetcher),'REFRESH_REVOKED');
 assert.equal(calls[0].url,'https://accounts.zoho.com/oauth/v2/revoke/token');assert.equal(calls[0].options.method,'POST');assert.equal(calls[0].options.redirect,'error');
 assert.equal(calls[0].options.headers.Authorization,'Basic '+Buffer.from(credentials.clientId+':'+credentials.clientSecret).toString('base64'));
 assert.deepEqual([...calls[0].options.body],[['token',token.refresh_token],['token_type','refresh_token']]);assert.equal(calls[0].options.signal.aborted,false);
 for(const value of [credentials.clientId,credentials.clientSecret,token.refresh_token,token.access_token])assert.ok(!calls[0].url.includes(value));
 assert.equal(await revokeUnsavedTokens(binding,{...own,refreshToken:''},fetcher),'ACCESS_REVOKED');assert.equal(calls[1].options.body.get('token'),token.access_token);assert.equal(calls[1].options.body.get('token_type'),'access_token');
 for(const [b,c] of [[{...binding,api_domain:'https://private.test'},own],[binding,{...own,clientSecret:''}],[binding,{...own,refreshToken:'',accessToken:''}]])assert.equal(await revokeUnsavedTokens(b,c,()=>{throw new Error('Must not request');}),'UNAVAILABLE');
 for(const fetcher of [async()=>{throw new Error(credentials.clientSecret);},async()=>({status:400}),async()=>({status:302}),async()=>({status:200,text:async()=>JSON.stringify({error:credentials.clientSecret})}),async()=>({status:200,text:async()=>'malformed'}),async()=>({status:200,text:async()=>JSON.stringify({unexpected:true})})])assert.equal(await revokeUnsavedTokens(binding,own,fetcher),'FAILED');
 assert.equal(await revokeUnsavedTokens(binding,own,async()=>({status:200,text:async()=>''})),'REFRESH_REVOKED');
});
test('verification failure cleanup uses only current exchange tokens; missing refresh stays a partial cleanup',async()=>{
 for(const t of [{...token,refresh_token:''},{...token,api_domain:'https://wrong-region.test'},{...token,expires_in:0},{...token,access_token:''}]){
  const f=fake(undefined,t);
  await assert.rejects(exchangeAndVerify(binding,credentials,f.fetch),error=>{
   const message=setupFailureMessage(error);assert.ok(message.includes(t.refresh_token?'[CLEANUP_REFRESH_REVOKED]':'[CLEANUP_ACCESS_REVOKED]'));
   if(!t.refresh_token)assert.ok(message.includes('Refresh-token cleanup is unverified'));return true;
  });
  assert.equal(f.calls.at(-1).options.body.get('token'),t.refresh_token||t.access_token);
 }
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
 assert.throws(()=>second.assertAvailable(binding.alias,entry));assert.throws(()=>second.assertAvailable('NEW_ALIAS',entry));
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
 assert.ok(transcript.includes('/oauth/v2/org/auth?'));assert.ok(!transcript.includes('/oauth/v2/auth?'));
 assert.ok(!transcript.includes('NEVER_ECHO_SYNTHETIC_SECRET'));assert.ok(!stderr.includes('NEVER_ECHO_SYNTHETIC_SECRET'));
 assert.ok(!transcript.slice(0,transcript.indexOf('Open this authorization URL')).includes('synthetic-client-id'));
 child.stdin.write('\u0003');const result=await finished;assert.equal(result.code,1);assert.match(stderr,/Setup stopped/);
 await assert.rejects(stat(output),{code:'ENOENT'});await assert.rejects(stat(output+'.lock'),{code:'ENOENT'});
});

function operatorHarness(t,extra='',args=[]){
 const preload="Object.defineProperty(process.stdin,'isTTY',{value:true});process.stdin.setRawMode=()=>process.stdin;Object.defineProperty(process.stdout,'isTTY',{value:true});process.stdout.columns=100;"+extra;
 const child=spawn(process.execPath,['--import','data:text/javascript,'+encodeURIComponent(preload),fileURLToPath(new URL('../scripts/setup-zoho-staging.mjs',import.meta.url)),...args],{stdio:['pipe','pipe','pipe']});
 let transcript='',stderr='',exited=false;
 const finished=new Promise((resolve,reject)=>{child.once('error',reject);child.once('exit',code=>{exited=true;resolve(code);});});
 child.stdout.on('data',data=>{transcript+=data;});child.stderr.on('data',data=>{stderr+=data;});t.after(()=>{if(!exited)child.kill();});
 const waitFor=async text=>{const end=Date.now()+5000;while(!transcript.includes(text)){if(exited||Date.now()>end)throw new Error('CLI did not reach the expected stage');await new Promise(r=>setTimeout(r,10));}};
 return {child,finished,waitFor,transcript:()=>transcript,stderr:()=>stderr,async answer(label,value){await waitFor(label+'\n');child.stdin.write(value+'\n');}};
}
const publicAnswers=output=>[['FaraiOS business UUID: ',binding.business_id],['New Zoho TEST organisation ID: ',binding.organization_id],['Exact TEST organisation name: ',binding.organization_name],['Credential alias: ',binding.alias],['API domain (e.g. https://www.zohoapis.com): ',binding.api_domain],['Confirm this is an isolated test organisation (type TEST): ','TEST'],['Private JSON path (Enter for your profile default): ',output]];

test('real CLI closes unused local connections, cleans only unsaved tokens and preserves committed credentials',{timeout:60000},async t=>{
 for(const mode of ['TOKEN_CLIENT_SECRET','TOKEN_REJECTED','ORG_COUNT','ORG_HTTP','CLEANUP_FAILED','PRIVATE_FILE_SAVE','CANCELLED','SUCCESS','LOCAL_CLEANUP']){
  const {output}=await fixture(t),marker='NEVER_PRINT_PROVIDER_OR_FILE_VALUE';
  const unrelated={business_id:'22222222-2222-4222-8222-222222222222',organization_id:'234567',refresh_token:'UNRELATED_PRIVATE_REFRESH'};
  const original=JSON.stringify({OTHER_TEST:unrelated})+'\n';await mkdir(join(output,'..'),{recursive:true});await writeFile(output,original,{mode:0o600});
  const tokenResult=mode==='TOKEN_CLIENT_SECRET'?{error:'invalid_client_secret',details:marker}:mode==='TOKEN_REJECTED'?{error:marker}:token;
  const orgResult={code:0,organizations:mode==='ORG_COUNT'?[org,{...org,organization_id:'999',name:marker}]:[org]};
  const extra=`import fp from 'node:fs/promises';import {syncBuiltinESMExports} from 'node:module';
   const mode=${JSON.stringify(mode)},marker=${JSON.stringify(marker)};
   if(mode==='LOCAL_CLEANUP'){const originalOpen=fp.open;fp.open=async(...args)=>{const h=await originalOpen(...args);if(String(args[0]).endsWith('.lock')){const close=h.close.bind(h);h.close=async()=>{await close();throw new Error(marker);};}return h;};syncBuiltinESMExports();}
   globalThis.fetch=async(url,options)=>{
    if(String(url).endsWith('/oauth/v2/revoke/token')){console.log('SYNTHETIC_REVOKE');if(options.body.get('token')!==${JSON.stringify(token.refresh_token)}||options.body.get('token_type')!=='refresh_token'||options.signal.aborted||options.headers.Authorization!=='Basic '+Buffer.from('synthetic-client-id:'+marker).toString('base64'))throw new Error(marker);if(mode==='CLEANUP_FAILED')throw new Error(marker);return{ok:true,status:200,text:async()=>JSON.stringify({status:'success'})};}
    if(String(url).endsWith('/oauth/v2/token'))return{ok:true,status:200,text:async()=>JSON.stringify(${JSON.stringify(tokenResult)})};
    if(String(url).includes('/books/v3/organizations/')){console.log('SYNTHETIC_PINNED_PROBE');if(String(url)!==${JSON.stringify(binding.api_domain+'/books/v3/organizations/'+binding.organization_id+'?organization_id='+binding.organization_id)})throw new Error(marker);return{ok:true,status:200,text:async()=>JSON.stringify({code:0,organization:${JSON.stringify(org)}})};}
    if(String(url).endsWith('/books/v3/organizations')){if(mode==='CANCELLED')process.emit('SIGTERM');const bad=['ORG_HTTP','CLEANUP_FAILED'].includes(mode);return{ok:!bad,status:bad?403:200,text:async()=>JSON.stringify(bad?{code:57,message:marker}:${JSON.stringify(orgResult)})};}
    throw new Error(marker);
   };`;
  const h=operatorHarness(t,extra);
  for(const [label,value] of [...publicAnswers(output),['New dedicated Client ID (hidden): ','synthetic-client-id'],['New dedicated Client Secret (hidden): ',marker]])await h.answer(label,value);
  await h.waitFor('If Zoho offers all organisations or the wrong organisation, deny and stop.');
  assert.ok(h.transcript().indexOf('attempt to revoke only those tokens')<h.transcript().indexOf('FaraiOS business UUID'));
  if(mode==='PRIVATE_FILE_SAVE')await writeFile(output,marker,{mode:0o600});
  const auth=new URL(h.transcript().match(/https:\/\/accounts\.zoho\.com\/oauth\/v2\/org\/auth\?[^\r\n]+/)[0]);
  const heldConnections=['SUCCESS','ORG_HTTP','CANCELLED'].includes(mode);
  if(heldConnections)for(const partial of ['', 'GET / HTTP/1.1\r\nHost:']){
   const socket=connect(3102,'127.0.0.1');t.after(()=>socket.destroy());
   await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});
   if(partial)socket.write(partial);
  }
  const callback=new URL(redirectUri);callback.search=new URLSearchParams({state:auth.searchParams.get('state'),code:'synthetic-one-use-code','accounts-server':'https://accounts.zoho.com'}).toString();
  const result=await fetch(callback,{redirect:'manual'});assert.equal(result.status,303);assert.equal(result.headers.get('location'),'/complete');await result.text();
  const saved=['SUCCESS','LOCAL_CLEANUP'].includes(mode),revoked=!saved&&!['TOKEN_CLIENT_SECRET','TOKEN_REJECTED'].includes(mode);
  let deadline;
  try{assert.equal(await Promise.race([h.finished,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('CLI did not finish with unused callback connections')),5000);})]),mode==='SUCCESS'?0:1);}finally{clearTimeout(deadline);}
  assert.ok(h.transcript().includes('Callback received. Verifying the TEST organisation...'));
  assert.ok(h.transcript().includes('Closing local callback listener...'));
  if(mode==='SUCCESS')assert.ok(h.transcript().includes('Private credentials saved.'));else{assert.ok(h.stderr().includes('Setup stopped ['+(mode==='CLEANUP_FAILED'?'ORG_HTTP':mode)+']'));assert.ok(!h.transcript().includes('Private credentials saved.'));}
  assert.equal((h.transcript().match(/SYNTHETIC_REVOKE/g)||[]).length,revoked?1:0);
  if(revoked)assert.ok(h.stderr().includes(mode==='CLEANUP_FAILED'?'[CLEANUP_FAILED]':'[CLEANUP_REFRESH_REVOKED]'));
  if(['ORG_HTTP','CLEANUP_FAILED'].includes(mode))assert.ok(h.stderr().includes('[HTTP_403] [BOOKS_CODE_57]'));
  assert.equal((h.transcript().match(/SYNTHETIC_PINNED_PROBE/g)||[]).length,['ORG_HTTP','CLEANUP_FAILED'].includes(mode)?1:0);
  if(['ORG_HTTP','CLEANUP_FAILED'].includes(mode))assert.ok(h.stderr().includes('[PINNED_ORG_MATCHED]'));
  if(mode==='LOCAL_CLEANUP')assert.ok(h.stderr().includes('Verified credentials were saved. Do not repeat setup or revoke them'));
  for(const value of [marker,'synthetic-one-use-code',token.access_token,token.refresh_token,unrelated.refresh_token,output])assert.ok(!h.stderr().includes(value));
  assert.ok(!h.transcript().includes(marker));
  const file=await readFile(output,'utf8');
  if(saved){const entries=JSON.parse(file);assert.deepEqual(entries.OTHER_TEST,unrelated);assert.equal(entries[binding.alias].refresh_token,token.refresh_token);}else assert.equal(file,mode==='PRIVATE_FILE_SAVE'?marker:original);
  if(mode==='LOCAL_CLEANUP')assert.ok(await stat(output+'.lock'));else await assert.rejects(stat(output+'.lock'),{code:'ENOENT'});
 }
});
test('real CLI rejects an existing private binding before credentials or consent and leaves the file unchanged',{timeout:10000},async t=>{
 const {output}=await fixture(t),original=JSON.stringify({[binding.alias]:{...binding,refresh_token:'EXISTING_PRIVATE_REFRESH'}})+'\n';
 await mkdir(join(output,'..'),{recursive:true});await writeFile(output,original,{mode:0o600});
 const h=operatorHarness(t,"globalThis.fetch=()=>{throw new Error('Must never request');};");
 for(const [label,value] of publicAnswers(output))await h.answer(label,value);
 assert.equal(await h.finished,1);assert.ok(h.stderr().includes('[PRIVATE_BINDING_EXISTS]'));
 assert.ok(!h.transcript().includes('New dedicated Client ID'));assert.ok(!h.transcript().includes('/oauth/v2/org/auth?'));assert.ok(!h.stderr().includes('EXISTING_PRIVATE_REFRESH'));
 assert.equal(await readFile(output,'utf8'),original);await assert.rejects(stat(output+'.lock'),{code:'ENOENT'});
});

const diagnosticCredentials={...credentials,otherOrganizationId:'654321'};
test('diagnostic consent is settings-read-only and rejects invalid or duplicate test pins before any request',async()=>{
 const url=new URL(diagnosticAuthorizationUrl(binding,credentials.clientId,'random-state'));
 assert.equal(url.pathname,'/oauth/v2/org/auth');assert.equal(url.searchParams.get('scope'),diagnosticScopes);assert.equal(diagnosticScopes,'ZohoBooks.settings.READ');assert.equal(url.searchParams.get('redirect_uri'),redirectUri);
 for(const other of [binding.organization_id,'','1?organization_id=2','not-an-id']){
  assert.throws(()=>validateDiagnosticOther(binding,other));
  await assert.rejects(diagnoseTestOrganizations(binding,{...diagnosticCredentials,otherOrganizationId:other},()=>{assert.fail('No request before validation');}));
 }
});
test('diagnostic reads only two pinned test profiles and revokes its current token without returning secrets',async()=>{
 const calls=[];
 const report=await diagnoseTestOrganizations(binding,diagnosticCredentials,async(url,options)=>{
  calls.push({url,options});
  if(String(url).endsWith('/oauth/v2/token'))return response(token);
  if(String(url).endsWith('/oauth/v2/revoke/token'))return response({status:'success'});
  if(String(url).includes('/organizations/'+binding.organization_id+'?'))return response({code:0,organization:org});
  return {ok:false,status:403,text:async()=>JSON.stringify({code:57,message:credentials.clientSecret})};
 });
 assert.deepEqual(report,{target:{outcome:'MATCHED'},other:{outcome:'REJECTED',httpStatus:403,providerCode:57},cleanup:'REFRESH_REVOKED'});
 assert.equal(calls.length,4);
 assert.equal(calls[1].url,binding.api_domain+'/books/v3/organizations/'+binding.organization_id+'?organization_id='+binding.organization_id);
 assert.equal(calls[2].url,binding.api_domain+'/books/v3/organizations/654321?organization_id=654321');
 for(const call of calls.slice(1,3)){assert.equal(call.options.method,'GET');assert.equal(call.options.redirect,'error');assert.equal(call.options.headers.Authorization,'Zoho-oauthtoken '+token.access_token);assert.ok(call.options.signal instanceof AbortSignal);assert.ok(!call.url.includes(token.access_token));}
 assert.equal(calls.at(-1).url,'https://accounts.zoho.com/oauth/v2/revoke/token');assert.equal(calls.at(-1).options.body.get('token'),token.refresh_token);
 for(const value of [binding.organization_id,diagnosticCredentials.otherOrganizationId,...Object.values(credentials),token.access_token,token.refresh_token])assert.ok(!JSON.stringify(report).includes(value));
 assert.deepEqual(diagnosticLabels(report),['[DIAG_TARGET_MATCHED]','[DIAG_OTHER_TEST_REJECTED]','[DIAG_OTHER_TEST_HTTP_403]','[DIAG_OTHER_TEST_BOOKS_CODE_57]','[CLEANUP_REFRESH_REVOKED]']);
});
test('diagnostic never mistakes token, missing-resource, transport or server errors for cross-test rejection',async()=>{
 for(const kind of ['ACCESSIBLE',401,404,500,'TRANSPORT','MALFORMED','BUSINESS_ERROR']){
  let calls=0;
  const report=await diagnoseTestOrganizations(binding,diagnosticCredentials,async(url)=>{
   calls++;
   if(String(url).endsWith('/oauth/v2/token'))return response(token);
   if(String(url).endsWith('/oauth/v2/revoke/token'))return response({status:'success'});
   if(String(url).includes('/organizations/'+binding.organization_id+'?'))return response({code:0,organization:org});
   if(kind==='ACCESSIBLE')return response({code:0,organization:{...org,organization_id:'654321',name:credentials.clientSecret}});
   if(kind==='TRANSPORT')throw new Error(credentials.clientSecret);
   if(kind==='MALFORMED')return {ok:true,status:200,text:async()=>credentials.clientSecret};
   if(kind==='BUSINESS_ERROR')return response({code:57,message:credentials.clientSecret});
   return {ok:false,status:kind,text:async()=>JSON.stringify({code:1000,message:credentials.clientSecret})};
  });
  assert.equal(calls,4);assert.equal(report.other.outcome,kind==='ACCESSIBLE'?'ACCESSIBLE':'INCONCLUSIVE');assert.equal(report.cleanup,'REFRESH_REVOKED');
  assert.ok(!diagnosticLabels(report).includes('[DIAG_OTHER_TEST_REJECTED]'));assert.ok(!JSON.stringify(report).includes(credentials.clientSecret));
 }
});
test('diagnostic skips the other test after a failed target profile and preserves cleanup-failure evidence',async()=>{
 for(const kind of ['MISMATCH','TARGET_HTTP','CLEANUP_FAILED']){
  const calls=[];
  const report=await diagnoseTestOrganizations(binding,diagnosticCredentials,async(url)=>{
   calls.push(String(url));if(String(url).endsWith('/oauth/v2/token'))return response(token);
   if(String(url).endsWith('/oauth/v2/revoke/token')){if(kind==='CLEANUP_FAILED')throw new Error(credentials.clientSecret);return response({status:'success'});}
   if(kind==='TARGET_HTTP')return {ok:false,status:500,text:async()=>JSON.stringify({code:1000,message:credentials.clientSecret})};
   return response({code:0,organization:{...org,name:'Wrong profile'}});
  });
  assert.equal(calls.length,3);assert.equal(report.other.outcome,'NOT_RUN');assert.equal(report.target.outcome,kind==='TARGET_HTTP'?'INCONCLUSIVE':'MISMATCH');assert.equal(report.cleanup,kind==='CLEANUP_FAILED'?'FAILED':'REFRESH_REVOKED');
 }
 const labels=diagnosticLabels({target:{outcome:credentials.clientSecret,httpStatus:99999,providerCode:99999},other:{outcome:credentials.clientSecret},cleanup:credentials.clientSecret});
 assert.deepEqual(labels,['[DIAG_TARGET_INCONCLUSIVE]','[DIAG_OTHER_TEST_INCONCLUSIVE]','[CLEANUP_UNAVAILABLE]']);
});
test('diagnostic cancellation and malformed token responses still clean only newly received usable tokens',async()=>{
 const cancellation=new AbortController(),calls=[];
 await assert.rejects(diagnoseTestOrganizations(binding,diagnosticCredentials,async(url,options)=>{
  calls.push({url,options});if(String(url).endsWith('/oauth/v2/token'))return response(token);
  if(String(url).endsWith('/oauth/v2/revoke/token')){assert.equal(options.signal.aborted,false);return response({status:'success'});}
  cancellation.abort();return response({code:0,organization:org});
 },{signal:cancellation.signal}),error=>setupFailureMessage(error).includes('[CANCELLED]')&&setupFailureMessage(error).includes('[CLEANUP_REFRESH_REVOKED]'));
 assert.equal(calls.length,3);assert.ok(!calls.some(c=>String(c.url).includes('/organizations/654321')));
 const partial=[];
 await assert.rejects(diagnoseTestOrganizations(binding,diagnosticCredentials,async(url,options)=>{
  partial.push({url,options});return response(String(url).endsWith('/oauth/v2/token')?{...token,refresh_token:''}:{status:'success'});
 }),error=>setupFailureMessage(error).includes('[TOKEN_REFRESH_MISSING]')&&setupFailureMessage(error).includes('[CLEANUP_ACCESS_REVOKED]'));
 assert.equal(partial.length,2);assert.equal(partial[1].options.body.get('token'),token.access_token);assert.equal(partial[1].options.body.get('token_type'),'access_token');
});

test('real diagnostic CLI is read-only, prints short labels, cleans each exchange and never opens a credential store',{timeout:45000},async t=>{
 for(const mode of ['REJECTED','ACCESSIBLE','TARGET_HTTP','OTHER_401','CLEANUP_FAILED','CANCELLED']){
  const {output}=await fixture(t),original='UNRELATED_EXISTING_CREDENTIAL_FILE',marker='NEVER_PRINT_DIAGNOSTIC_PROVIDER_SECRET';await mkdir(join(output,'..'),{recursive:true});await writeFile(output,original);
  const extra=`import fp from 'node:fs/promises';import {syncBuiltinESMExports} from 'node:module';
   for(const key of ['open','mkdir','rename','unlink'])fp[key]=async()=>{console.log('SYNTHETIC_FILE_ACCESS');throw new Error(${JSON.stringify(marker)});};syncBuiltinESMExports();
   const mode=${JSON.stringify(mode)};
   globalThis.fetch=async(url,options)=>{
    if(String(url).endsWith('/oauth/v2/token'))return{ok:true,status:200,text:async()=>JSON.stringify(${JSON.stringify(token)})};
    if(String(url).endsWith('/oauth/v2/revoke/token')){console.log('SYNTHETIC_REVOKE');if(options.body.get('token')!==${JSON.stringify(token.refresh_token)}||options.signal.aborted)throw new Error(${JSON.stringify(marker)});if(mode==='CLEANUP_FAILED')throw new Error(${JSON.stringify(marker)});return{ok:true,status:200,text:async()=>JSON.stringify({status:'success'})};}
    if(String(url)===${JSON.stringify(binding.api_domain+'/books/v3/organizations/'+binding.organization_id+'?organization_id='+binding.organization_id)}){console.log('SYNTHETIC_TARGET_GET');if(mode==='CANCELLED')process.emit('SIGTERM');if(mode==='TARGET_HTTP')return{ok:false,status:500,text:async()=>JSON.stringify({code:1000,message:${JSON.stringify(marker)}})};return{ok:true,status:200,text:async()=>JSON.stringify({code:0,organization:${JSON.stringify(org)}})};}
    if(String(url)===${JSON.stringify(binding.api_domain+'/books/v3/organizations/654321?organization_id=654321')}){console.log('SYNTHETIC_OTHER_GET');if(mode==='ACCESSIBLE')return{ok:true,status:200,text:async()=>JSON.stringify({code:0,organization:{organization_id:'654321',name:${JSON.stringify(marker)}}})};return{ok:false,status:mode==='OTHER_401'?401:403,text:async()=>JSON.stringify({code:57,message:${JSON.stringify(marker)}})};}
    throw new Error(${JSON.stringify(marker)});
   };`;
  const h=operatorHarness(t,extra,['--diagnose-test-orgs']);
  for(const [label,value] of [...publicAnswers(output).slice(0,5),['Other isolated TEST organisation ID (never a live organisation): ','654321'],['Confirm BOTH organisation IDs are isolated TEST organisations (type TEST): ','TEST'],['New dedicated Client ID (hidden): ','synthetic-client-id'],['New dedicated Client Secret (hidden): ',marker]])await h.answer(label,value);
  await h.waitFor('If Zoho offers all organisations or the wrong organisation, deny and stop.');
  assert.ok(!h.transcript().includes('Private JSON path'));assert.ok(h.transcript().includes('No credential file will be opened or saved.'));
  const auth=new URL(h.transcript().match(/https:\/\/accounts\.zoho\.com\/oauth\/v2\/org\/auth\?[^\r\n]+/)[0]);assert.equal(auth.searchParams.get('scope'),diagnosticScopes);
  const socket=connect(3102,'127.0.0.1');t.after(()=>socket.destroy());await new Promise((resolve,reject)=>{socket.once('connect',resolve);socket.once('error',reject);});socket.write('GET / HTTP/1.1\r\nHost:');
  const callback=new URL(redirectUri);callback.search=new URLSearchParams({state:auth.searchParams.get('state'),code:'synthetic-diagnostic-code'}).toString();
  const r=await fetch(callback,{redirect:'manual'});assert.equal(r.status,303);await r.text();
  let deadline;try{assert.equal(await Promise.race([h.finished,new Promise((_,reject)=>{deadline=setTimeout(()=>reject(new Error('Diagnostic CLI did not finish')),5000);})]),mode==='REJECTED'?0:1);}finally{clearTimeout(deadline);}
  assert.equal((h.transcript().match(/SYNTHETIC_REVOKE/g)||[]).length,1);assert.ok(!h.transcript().includes('SYNTHETIC_FILE_ACCESS'));
  assert.equal((h.transcript().match(/SYNTHETIC_OTHER_GET/g)||[]).length,['TARGET_HTTP','CANCELLED'].includes(mode)?0:1);
  const all=h.transcript()+h.stderr();
  for(const value of [marker,token.access_token,token.refresh_token,'synthetic-diagnostic-code',original])assert.ok(!all.includes(value));
  assert.ok(all.includes(mode==='CLEANUP_FAILED'?'[CLEANUP_FAILED]':'[CLEANUP_REFRESH_REVOKED]'));
  if(mode==='CANCELLED')assert.ok(h.stderr().includes('[CANCELLED]'));else{
   assert.ok(h.transcript().includes('[DIAG_TARGET_'+(mode==='TARGET_HTTP'?'INCONCLUSIVE':'MATCHED')+']'));
   assert.ok(h.transcript().includes('[DIAG_OTHER_TEST_'+(mode==='TARGET_HTTP'?'NOT_RUN':mode==='OTHER_401'?'INCONCLUSIVE':mode==='ACCESSIBLE'?'ACCESSIBLE':'REJECTED')+']'));
   assert.ok(h.transcript().includes('Full organisation isolation is not established'));
  }
  assert.equal(await readFile(output,'utf8'),original);await assert.rejects(stat(output+'.lock'),{code:'ENOENT'});
 }
});
