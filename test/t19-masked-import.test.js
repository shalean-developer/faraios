import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {probeDigest} from '../scripts/t19-connection.mjs';
import {openVault} from '../src/t19-vault.js';
const root=fileURLToPath(new URL('..',import.meta.url));
const helper=join(root,'scripts/t19-import-client.ps1');
const quote=s=>"'"+s.replaceAll("'","''")+"'";
// Dummy input only. No Zoho/network access or real credential source.
async function run(t,{mode='ok',secret='dummy-"quote\\é',wrongHost=false,wrongAccount=false,badHash=false}={}){
 const dir=await mkdtemp(join(tmpdir(),'t19-masked-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const events=join(dir,'events.jsonl'),manifest=join(dir,'review with spaces.json'),child=join(dir,'mock.mjs');
 await writeFile(child,`import {appendFileSync} from 'node:fs';
const mode=${JSON.stringify(mode)},args=process.argv.slice(2),stage=args.some(a=>a.startsWith('--check-import='))?'check':'import';
appendFileSync(${JSON.stringify(events)},JSON.stringify({stage,args,debug:process.env.NODE_OPTIONS})+'\\n');
if(stage==='check'){if(mode==='gate')process.exit(1);console.log('TEST import gate validated; no storage or provider access performed.');}
else {let input='';for await(const part of process.stdin)input+=part;
if(JSON.parse(input).clientSecret!==${JSON.stringify(secret)} || Object.keys(JSON.parse(input)).length!==1)process.exit(3);
if(args.some(a=>a.includes(${JSON.stringify(secret)})))process.exit(4);
if(mode==='timeout')setInterval(()=>{},1000);
else if(mode==='stderr'){console.error(${JSON.stringify(secret)});process.exit(1);}
else if(mode==='unexpected')console.log(${JSON.stringify(secret)});
else console.log('TEST client stored; no provider request performed.');}
`);
 const script=join(dir,'test.ps1');
 await writeFile(script,`$ErrorActionPreference='Stop'
. ${quote(helper)}
$m=@{clientId='dummy-client';custodyVerification=@{deviceName=${wrongHost?"'WRONG'":"[Environment]::MachineName"};windowsAccount=${wrongAccount?"'wrong\\account'":"[Security.Principal.WindowsIdentity]::GetCurrent().Name"}}}
[IO.File]::WriteAllText(${quote(manifest)},($m|ConvertTo-Json))
$hash=(Get-FileHash -LiteralPath ${quote(manifest)} -Algorithm SHA256).Hash.ToLowerInvariant()
function Read-Host { param($Prompt,[switch]$AsSecureString); if(-not $AsSecureString){throw 'Unmasked'}; [IO.File]::AppendAllText(${quote(events)},'"prompt"'+[Environment]::NewLine); return ConvertTo-SecureString ${quote(secret)} -AsPlainText -Force }
try { Invoke-T19MaskedImport -NodePath ${quote(process.execPath)} -RunnerPath ${quote(child)} -ManifestFile ${quote(manifest)} -ApprovedHash ${badHash?"('0'*64)":'$hash'} -TimeoutMilliseconds 1500; exit 0 } catch { [Console]::Error.WriteLine('MASKED_REJECTED'); exit 1 }
`);
 const result=spawnSync('pwsh',['-NoLogo','-NoProfile','-NonInteractive','-File',script],{encoding:'utf8',windowsHide:true,timeout:20000});
 const records=await readFile(events,'utf8').then(s=>s.trim().split(/\r?\n/).filter(Boolean).map(JSON.parse)).catch(()=>[]);
 assert.doesNotMatch(result.stdout+result.stderr,/dummy-"quote|quote\\é/);
 assert.equal(result.error,undefined);
 return {...result,records};
}
test('masked prompt serialises dummy quote/unicode secret through stdin only and forces import mode',async t=>{
 const r=await run(t);assert.equal(r.status,0,r.stderr);assert.equal(r.stdout.trim(),'TEST client stored; no provider request performed.');
 assert.deepEqual(r.records.map(x=>typeof x==='string'?x:x.stage),['check','prompt','import']);
 assert.ok(r.records[2].args.includes('--import-client=dummy-client'));assert.equal(r.records[2].args.length,3);
});
test('wrong host/account, wrong manifest hash and rejected gate fail before masked prompt',async t=>{
 for(const options of [{wrongHost:true},{wrongAccount:true},{badHash:true},{mode:'gate'}]){const r=await run(t,options);assert.equal(r.status,1);assert.ok(!r.records.includes('prompt'));assert.ok(!r.records.some(x=>x.stage==='import'));}
});
test('empty, newline or oversized dummy input never reaches import child',async t=>{
 for(const secret of ['', 'dummy\nsecret', 'x'.repeat(4097)]){const r=await run(t,{secret});assert.equal(r.status,1);assert.ok(!r.records.some(x=>x.stage==='import'));}
});
test('child stderr, unexpected stdout and timeout are generic failures without secret reflection',async t=>{
 for(const mode of ['stderr','unexpected','timeout']){const r=await run(t,{mode});assert.equal(r.status,1);assert.equal(r.stderr.trim(),'MASKED_REJECTED');assert.equal(r.stdout,'');}
});
test('production entrypoint rejects redirected input rather than accepting unmasked piped data',()=>{
 const r=spawnSync('pwsh',['-NoLogo','-NoProfile','-File',helper,'-ManifestPath',join(root,'config/t19-shalean-review.json'),'-ManifestSha256','0'.repeat(64)],{encoding:'utf8',input:'dummy-secret',windowsHide:true});
 assert.equal(r.status,1);assert.equal(r.stdout,'');assert.doesNotMatch(r.stderr,/dummy-secret/);
});
test('masked helper hands dummy secret to real gated importer and DPAPI; duplicate import fails closed',async t=>{
 const dir=await mkdtemp(join(tmpdir(),'t19-real-import-'));t.after(()=>rm(dir,{recursive:true,force:true}));
 const manifestPath=join(dir,'approved-synthetic.json'),script=join(dir,'test.ps1');
 const now=Date.now();const m={businessId:'00000000-0000-4000-8000-000000000001',organizationId:'111',identity:'synthetic@example.invalid',zohoUserId:'123',apiDomain:'https://www.zohoapis.com',environment:'staging',currency:'ZAR',approved:true,custodyVerification:{secretSourceVerified:true},clientVerification:{clientType:'Server-based',clientOwner:'synthetic-owner'},approvalReference:'dummy-test-only',operator:'dummy',custodian:'dummy',reviewer:'dummy',probeSha:await probeDigest(),clientId:'dummy-client',redirectUri:'http://127.0.0.1:3102/zoho/callback',startsAt:now-1000,endsAt:now+120000,fixture:{invoiceId:'9001',customerId:'222',number:'TEST-1',reference:'SYNTHETIC',status:'draft',totalCents:100},fixtureEvidence:'dummy',identityEvidence:'dummy',cleanupReference:'dummy'};
 await writeFile(manifestPath,JSON.stringify(m));
 await writeFile(script,`$ErrorActionPreference='Stop'
. ${quote(helper)}
$m=Get-Content -Raw -LiteralPath ${quote(manifestPath)}|ConvertFrom-Json
$m|Add-Member -NotePropertyName custodyVerification -NotePropertyValue @{deviceName=[Environment]::MachineName;windowsAccount=[Security.Principal.WindowsIdentity]::GetCurrent().Name}
[IO.File]::WriteAllText(${quote(manifestPath)},($m|ConvertTo-Json -Depth 10))
$hash=(Get-FileHash -LiteralPath ${quote(manifestPath)} -Algorithm SHA256).Hash.ToLowerInvariant()
function Read-Host {param($Prompt,[switch]$AsSecureString);if(-not $AsSecureString){throw 'Unmasked'};ConvertTo-SecureString 'DUMMY-REAL-PIPE-NOT-A-CREDENTIAL' -AsPlainText -Force}
Invoke-T19MaskedImport -NodePath ${quote(process.execPath)} -RunnerPath ${quote(join(root,'scripts/t19-connection.mjs'))} -ManifestFile ${quote(manifestPath)} -ApprovedHash $hash
try { Invoke-T19MaskedImport -NodePath ${quote(process.execPath)} -RunnerPath ${quote(join(root,'scripts/t19-connection.mjs'))} -ManifestFile ${quote(manifestPath)} -ApprovedHash $hash; exit 2 } catch { [Console]::WriteLine('DUPLICATE_REJECTED') }
`);
 const r=spawnSync('pwsh',['-NoLogo','-NoProfile','-NonInteractive','-File',script],{cwd:root,env:{...process.env,LOCALAPPDATA:dir},windowsHide:true,encoding:'utf8',timeout:90000});
 assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/TEST client stored; no provider request performed/);assert.match(r.stdout,/DUPLICATE_REJECTED/);assert.doesNotMatch(r.stdout+r.stderr,/DUMMY-REAL-PIPE-NOT-A-CREDENTIAL/);
 const directory=join(dir,'FaraiOS','T19','credentials');const encrypted=await readFile(join(directory,'vault.dpapi'));assert.equal(encrypted.includes(Buffer.from('DUMMY-REAL-PIPE-NOT-A-CREDENTIAL')),false);
 const vault=await openVault({directory,repositoryRoot:root});try{const db=await vault.read();assert.equal(db.clients['dummy-client'].clientSecret,'DUMMY-REAL-PIPE-NOT-A-CREDENTIAL');assert.equal(db.clients['dummy-client'].businessId,m.businessId);assert.equal(db.clients['dummy-client'].organizationId,m.organizationId);assert.deepEqual(db.connections,{});}finally{await vault.close();}
});
