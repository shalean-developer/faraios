// Manually invoked, read-only live RLS acceptance. Never run from CI or log credentials.
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
const cfg=JSON.parse(await readFile(new URL('../config/staging.json',import.meta.url),'utf8'));
const bokkie='0cc3f518-d64e-40c2-8817-bc14d1ef1420';
const shalean='612be091-b1d7-4911-9c3b-143446a9fe27';
export function assessCounts({managerBokkie,managerShalean,ownerShalean}){
  if(![managerBokkie,managerShalean,ownerShalean].every(n=>Number.isSafeInteger(n)&&n>=0))return 'NO-GO: incomplete count evidence';
  return managerBokkie>0&&managerShalean===0&&ownerShalean>0?'PASS':'NO-GO: isolation acceptance criteria unmet';
}
async function password(label){
  if(!process.stdin.isTTY||!process.stdin.setRawMode)throw Error('Interactive private terminal required');
  process.stdout.write(label+' password (hidden): ');
  process.stdin.setRawMode(true);process.stdin.resume();let result='';
  try{
    result=await new Promise((resolve,reject)=>{
      const receive=buf=>{for(const c of buf){if(c===3){cleanup();reject(Error('Cancelled'));return;}
        if(c===13||c===10){cleanup();process.stdout.write('\n');resolve(result);return;}
        if(c===127||c===8){result=result.slice(0,-1);continue;}
        if(c>=32&&c<127&&result.length<1024)result+=String.fromCharCode(c);
      }};
      const cleanup=()=>process.stdin.off('data',receive);
      process.stdin.on('data',receive);
    });
  }finally{process.stdin.setRawMode(false);process.stdin.pause();}
  if(!result)throw Error('No password entered');
  return result;
}
async function signedClient(email,pwd){
  const client=createClient(cfg.url,cfg.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
  const {data,error}=await client.auth.signInWithPassword({email,password:pwd});
  if(error||!data?.user?.id||!data?.session)throw Error('Authentication failed');
  const {data:verified,error:verifyError}=await client.auth.getUser();
  if(verifyError||verified?.user?.id!==data.user.id)throw Error('User verification failed');
  return client;
}
async function count(client,businessId){
  const {count,error,data}=await client.from('business_catalogue').select('*',{head:true,count:'exact'}).eq('business_id',businessId);
  if(error||data!==null||!Number.isSafeInteger(count))throw Error('Count-only query failed');
  return count;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  try{
    if(process.env.CI||process.argv.length!==2||!process.stdin.isTTY)throw Error('Manual interactive execution only');
    const manager=await signedClient('manager.qa@faraios.test',await password('Bokkie-only manager'));
    const managerBokkie=await count(manager,bokkie);
    const managerShalean=await count(manager,shalean);
    const owner=await signedClient('faraios590@gmail.com',await password('Staging owner control'));
    const ownerShalean=await count(owner,shalean);
    console.log(JSON.stringify({scope:'staging-counts-only',managerBokkie,managerShalean,ownerShalean,decision:assessCounts({managerBokkie,managerShalean,ownerShalean})}));
    if(assessCounts({managerBokkie,managerShalean,ownerShalean})!=='PASS')process.exitCode=1;
  }catch{console.error('NO-GO: interactive verification could not complete; no credentials printed');process.exitCode=1;}
}
