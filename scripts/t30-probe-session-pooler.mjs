// T30 explicitly authorised *read-only* operator probe.
// This never performs pg_dump, backup, restore, DDL, DML, migrations or config changes.
// Run locally with the existing owner-controlled staging password. Do NOT paste
// passwords, connection strings, snapshots or logs into ChatGPT or GitHub.
import {readFile} from 'node:fs/promises';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {openSnapshotKeeper} from './backup-snapshot.mjs';
import {SOURCE,POOLER_HOST,ROOT_CERT_PATH,verifyProviderCertificate} from './backup-staging.mjs';

export async function verifyReadOnlyPooler({password,clientFactory=null,signal}){
 if(signal?.aborted)throw Error('T30_PROBE_CANCELLED');
 await verifyProviderCertificate();
 const ca=await readFile(ROOT_CERT_PATH,'utf8');
 const factory=clientFactory??(async options=>{
  const {default:pg}=await import('pg');return new pg.Client(options);
 });
 const options={host:POOLER_HOST,port:5432,user:'postgres.'+SOURCE,
   database:'postgres',password,ssl:{ca,rejectUnauthorized:true,servername:POOLER_HOST},
   application_name:'faraios-t30-readonly-pooler-probe',connectionTimeoutMillis:15000,query_timeout:30000};
 let keeper,reader,connected=false,transaction=false;
 try{
  keeper=await openSnapshotKeeper({host:POOLER_HOST,port:5432,user:options.user,
   database:'postgres',password,ca,clientFactory:factory,signal});
  keeper.assertAlive();
  reader=await factory(options);
  await reader.connect();connected=true;
  if(signal?.aborted)throw Error('T30_PROBE_CANCELLED');
  // Import happens before any SELECT in the second transaction.
  await reader.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');transaction=true;
  await reader.query("SET TRANSACTION SNAPSHOT '"+keeper.id+"'");
  const r=await reader.query("SELECT current_setting('transaction_read_only') AS readonly, current_database() AS db, current_user AS db_user");
  if(r.rows?.length!==1||r.rows[0].readonly!=='on'||
     r.rows[0].db!=='postgres'||r.rows[0].db_user!=='postgres')
    throw Error('T30_POOLER_IDENTITY_OR_READONLY_MISMATCH');
  keeper.assertAlive();
  return {result:'T30_POOLER_SNAPSHOT_IMPORT_PASS',project:SOURCE,mode:'readonly',exports:0,writes:0};
 }catch{
  throw Error('T30_POOLER_SNAPSHOT_IMPORT_NOT_VERIFIED');
 }finally{
  if(reader){
   if(connected&&transaction)try{await reader.query('ROLLBACK');}catch{}
   try{await reader.end();}catch{}
  }
  if(keeper)await keeper.close();
 }
}

async function main(){
 if(process.argv.length!==2||!process.stdin.isTTY||!process.stdout.isTTY)
  throw Error('T30_PROBE_INTERACTIVE_TERMINAL_REQUIRED');
 let muted=false;
 const output=new Writable({write(chunk,encoding,done){if(!muted)process.stdout.write(chunk,encoding);done();}});
 const terminal=createInterface({input:process.stdin,output,terminal:true,historySize:0});
 const controller=new AbortController();
 const cancel=()=>controller.abort();
 terminal.on('SIGINT',cancel);process.once('SIGINT',cancel);process.once('SIGTERM',cancel);
 try{
  process.stdout.write('FaraiOS T30 readonly session-pooler snapshot import probe. No capture, no database writes.\n');
  process.stdout.write('Enter the existing staging DB password privately; NEVER paste it into chat.\n');
  process.stdout.write('Existing staging DB password (hidden):\n');
  muted=true;
  const password=await terminal.question('',{signal:controller.signal});
  muted=false;process.stdout.write('\n');
  const r=await verifyReadOnlyPooler({password,signal:controller.signal});
  process.stdout.write(r.result+'\n');
 }finally{
  terminal.close();process.removeListener('SIGINT',cancel);process.removeListener('SIGTERM',cancel);
 }
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 main().catch(()=>{console.error('T30_POOLER_SNAPSHOT_IMPORT_NOT_VERIFIED');process.exitCode=1;});
}
