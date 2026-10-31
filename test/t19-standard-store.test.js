import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {createStandardStore} from '../src/t19-standard-store.js';
const business='11111111-1111-4111-8111-111111111111',actor='22222222-2222-4222-8222-222222222222';
async function database(){
 const db=new PGlite();
 await db.exec(`create role anon; create role authenticated; create role service_role; create table public.businesses(id uuid primary key);insert into public.businesses values('${business}');`);
 await db.exec(await readFile(new URL('../database/t19-standard-store.sql',import.meta.url),'utf8'));
 const pool={async query(sql,args){const r=await db.query(sql,args);return {rows:r.rows,rowCount:r.affectedRows};}};
 return {db,store:createStandardStore(pool)};
}
test('real SQL state consumption is single-use and enforces actor/session/expiry',async()=>{
 const {db,store}=await database();try{
  await store.begin({digest:'synthetic',sessionDigest:'session',actor,businessId:business,organizationId:'123',environment:'staging',expiresAt:5000});
  assert.equal((await store.state('synthetic')).businessId,business);
  await assert.rejects(()=>store.consume('synthetic',actor,'wrong',1000));
  await assert.rejects(()=>store.consume('synthetic',actor,'session',5000));
  await store.consume('synthetic',actor,'session',1000);
  await assert.rejects(()=>store.consume('synthetic',actor,'session',1000));
  const second={digest:'second',sessionDigest:'session',actor,businessId:business,organizationId:'123',environment:'staging',expiresAt:5000};
  await assert.rejects(()=>store.begin(second),e=>e.code==='23505');
  await store.resolve('synthetic');await store.begin(second);
 }finally{await db.close();}
});
test('real SQL connection CAS and authenticated credential denial',async()=>{
 const {db,store}=await database();try{
  const c={businessId:business,environment:'staging',connectionId:actor,generation:1,organizationId:'123',apiDomain:'https://www.zohoapis.com',clientId:'synthetic',status:'revocation_pending',envelope:{synthetic:'ciphertext'}};
  await store.save(c,0);await store.publish(c,{id:'123',name:'Synthetic'});
  await assert.rejects(()=>store.save({...c,generation:2},1));
  await store.disable(c);await store.revoked(c);
  assert.equal((await store.connection('staging',business)).envelope,null);
  await store.save({...c,generation:2},1);
  await assert.rejects(()=>store.refresh(c,{}));
  for(const role of ['anon','authenticated','service_role']){
   await db.exec('set role '+role);
   await assert.rejects(()=>db.query('select envelope from private_t19_standard.connections'),e=>e.code==='42501');
   await db.exec('reset role');
  }
 }finally{await db.close();}
});
test('lock adapter releases on failed acquisition and failed operation',async()=>{
 for(const acquireFails of [true,false]){
  let released=0;
  const store=createStandardStore({async connect(){return {async query(sql){if(acquireFails&&sql.includes('pg_advisory_lock('))throw Error('synthetic');},release(){released++;}};}});
  await assert.rejects(()=>store.lock('staging',business,async()=>{throw Error('synthetic');}));assert.equal(released,1);
 }
});
test('restricted backend role is NOLOGIN and cannot see or write production tokens',async()=>{
 const {db,store}=await database();try{
  await db.exec(await readFile(new URL('../database/t19-standard-backend-role.sql',import.meta.url),'utf8'));
  const c={businessId:business,environment:'staging',connectionId:actor,generation:1,organizationId:'123',apiDomain:'https://www.zohoapis.com',clientId:'synthetic',status:'revocation_pending',envelope:{synthetic:'ciphertext'}};
  await store.save(c,0);
  await store.save({...c,environment:'production',connectionId:'33333333-3333-4333-8333-333333333333'},0);
  const role=(await db.query("select rolcanlogin,rolbypassrls,rolsuper from pg_roles where rolname='t19_standard_backend'")).rows[0];
  assert.deepEqual(role,{rolcanlogin:false,rolbypassrls:false,rolsuper:false});
  await db.exec('set role t19_standard_backend');
  assert.equal((await store.connection('staging',business)).organizationId,'123');
  assert.equal(await store.connection('production',business),null);
  await assert.rejects(()=>store.save({...c,environment:'production',connectionId:'44444444-4444-4444-8444-444444444444',generation:2},1),e=>e.code==='42501');
  await assert.rejects(()=>db.query('select * from public.businesses'),e=>e.code==='42501');
  await assert.rejects(()=>db.query('delete from private_t19_standard.connections'),e=>e.code==='42501');
  await db.exec('reset role');
 }finally{await db.close();}
});
test('lock holder queries reuse the locked client and fail after connection loss',async()=>{
 const {EventEmitter}=await import('node:events');let released=false,poolQueries=0;
 const client=Object.assign(new EventEmitter(),{async query(sql){return sql.includes('advisory')?{rows:[{unlocked:true}]}:{rows:[],rowCount:0};},release(){released=true;}});
 const store=createStandardStore({async connect(){return client;},async query(){poolQueries++;throw Error('pool starvation');}});
 await store.lock('staging',business,async()=>{assert.equal(await store.connection('staging',business),null);});
 assert.equal(poolQueries,0);assert.equal(released,true);
 await assert.rejects(()=>store.lock('staging',business,async()=>{client.emit('error',Error('synthetic loss'));await store.connection('staging',business);}),/accounting_lock_lost/);
});
