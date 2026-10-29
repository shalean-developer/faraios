import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {custodyPostgresTarget,custodyPostgresOptions,verifyCustodySession,connectCustodyPostgres} from '../src/t19-custody-postgres.js';
const pooler='aws-0-eu-west-1.pooler.supabase.com';
const direct='db.xdmfyrsauvqznkloroxg.supabase.co';
const config={host:pooler,port:5432,database:'postgres',password:randomBytes(32).toString('hex'),ca:'synthetic-ca'};
const session={session_user:'t19_hosted_custody',current_user:'t19_hosted_custody',database:'postgres',
 rolcanlogin:true,rolinherit:false,rolsuper:false,rolcreaterole:false,rolcreatedb:false,rolreplication:false,
 rolbypassrls:false,backend_tls:true,backend_tls_version:'TLSv1.3'};
test('custody session pooler uses the tenant-qualified wire role and direct keeps the bare role',()=>{
 assert.deepEqual(custodyPostgresTarget({host:pooler}),{host:pooler,port:5432,user:'t19_hosted_custody.xdmfyrsauvqznkloroxg'});
 assert.deepEqual(custodyPostgresTarget({host:direct}),{host:direct,port:5432,user:'t19_hosted_custody'});
 const options=custodyPostgresOptions(config);
 assert.equal(options.user,'t19_hosted_custody.xdmfyrsauvqznkloroxg');
 assert.deepEqual(options.ssl,{ca:'synthetic-ca',rejectUnauthorized:true,servername:pooler,minVersion:'TLSv1.2'});
 assert.equal(options.enableChannelBinding,true);assert.equal(options.options,'');
 assert.equal(options.database,'postgres');assert.equal(options.max,4);
});
test('unknown projects, transaction poolers, role/TLS overrides and URLs fail before any connection',async()=>{
 for(const patch of [{host:'db.other.supabase.co'},{host:'aws-1-eu-west-1.pooler.supabase.com'},
 {host:pooler+'.attacker.invalid'},{host:'127.0.0.1'},{host:pooler+'.'},
 {host:'postgresql://'+pooler},{port:6543},{port:'5432'},
 {database:'other'},{user:'postgres'},{ssl:{rejectUnauthorized:false}},
 {connectionString:'postgresql://private.invalid'},{projectRef:'other'},
 {password:''},{ca:' '}] ){
  const rejected={...config,...patch};
  assert.throws(()=>custodyPostgresOptions(rejected),{message:'custody_database_unavailable'});
  await assert.rejects(connectCustodyPostgres(rejected),{message:'custody_database_unavailable'});
 }
});
test('qualified pooler username never substitutes for the restricted backend identity and TLS evidence',()=>{
 assert.doesNotThrow(()=>verifyCustodySession(session));
 assert.doesNotThrow(()=>verifyCustodySession({...session,backend_tls_version:'TLSv1.2'}));
 for(const patch of [{current_user:'postgres'},{session_user:'postgres'},
 {current_user:'t19_hosted_custody.xdmfyrsauvqznkloroxg'},
 {database:'other'},{rolcanlogin:false},{rolinherit:true},{backend_tls:false},
 {backend_tls_version:'TLSv1.1'},...['rolsuper','rolcreaterole','rolcreatedb','rolreplication','rolbypassrls'].map(k=>({[k]:true}))]){
  assert.throws(()=>verifyCustodySession({...session,...patch}),{message:'custody_database_unavailable'});
 }
 for(const row of [null,{}, {...session,backend_tls:undefined}])assert.throws(()=>verifyCustodySession(row));
});
