// CI orchestration only; never imported by hosted code.
import {resolve,relative,isAbsolute,join} from 'node:path';
import {tmpdir} from 'node:os';

export function requireC2Pass(tap){
 const total=name=>{
  const matches=[...tap.matchAll(new RegExp('^# '+name+' (\\d+)\\r?$','gm'))];
  if(matches.length!==1)throw new Error('C2 missing or ambiguous test summary');
  return Number(matches[0][1]);
 };
 // Deliberate coverage contract: changing the suite count requires review here too.
 if(total('tests')!==18||total('pass')!==18||total('fail')!==0||total('cancelled')!==0||total('skipped')!==0||total('todo')!==0)
  throw new Error('C2 requires 18 passing native tests with no skips, failures, cancellations or TODOs');
}

export async function runC2Native({root,port,executable,node,run,exists,remove,report}){
 const rel=relative(resolve(tmpdir()),resolve(root));
 if(!rel||rel.startsWith('..')||isAbsolute(rel)||!/^faraios-t19-synthetic-[^/\\]+$/.test(rel))throw new Error('Unsafe C2 fixture target');
 const data=join(root,'data'),pid=join(data,'postmaster.pid');let started=false;
 try{
  await run(executable('initdb'),['-D',data,'-U','t19_fixture','-A','trust','--encoding=UTF8','--no-locale']);
  await run(executable('pg_ctl'),['-D',data,'-l',join(root,'postgres.log'),'-o',`-h 127.0.0.1 -p ${port} -k "${root.replaceAll('\\','/')}"`,'-w','start'],{background:true});started=true;
  await run(executable('createdb'),['-h','127.0.0.1','-p',String(port),'-U','t19_fixture','faraios_t19_test']);
  const version=(await run(executable('psql'),['-h','127.0.0.1','-p',String(port),'-U','t19_fixture','-d','faraios_t19_test','-X','-Atc','show server_version'])).trim();
  if(!/^17\./.test(version))throw new Error('C2 requires native PostgreSQL 17');
  report('T19 C2 isolated PostgreSQL: '+version);
  const tap=await run(node,['--test','--test-reporter=tap','test-support/t19-c2-native-suite.mjs'],{stream:true,extraEnv:{T19_TEST_DATABASE_URL:`postgresql://t19_fixture@127.0.0.1:${port}/faraios_t19_test`,T19_PSQL:executable('psql'),T19_C2_ROOT:root}});
  requireC2Pass(tap);
 }finally{
  if(started||await exists(pid))await run(executable('pg_ctl'),['-D',data,'-m','fast','-w','stop']);
  if(await exists(pid))throw new Error('C2 PostgreSQL PID remains; fixture preserved');
  report('T19_C2_POSTGRES_PID_ABSENT');
  await remove(root);
  if(await exists(root))throw new Error('C2 fixture cleanup failed');
  report('T19_C2_DISPOSABLE_CLUSTER_CLEANED');
 }
 // Neither failed test execution nor failed cleanup can reach this marker.
 report('T19_C2_NATIVE_PROOF_PASSED');
}
