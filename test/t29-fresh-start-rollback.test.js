import test from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';

// T29 disposable synthetic fixture. Not the hosted schema, and not a migration.
test('T29: synthetic business-scoped booking rollback and exact repeatability',async()=>{
 const db=new PGlite();
 try{
  await db.exec(`create table t29_bookings(
   business_id text not null,
   source_key text not null,
   amount_cents bigint not null check(amount_cents>=0),
   status text not null check(status='draft'),
   primary key(business_id,source_key)
  );`);
  const original=await db.query('select count(*)::integer as count, coalesce(sum(amount_cents),0)::bigint as total from t29_bookings');
  const before=original.rows[0];
  const keys=[['shalean-synthetic','qa-001',25000],['bokkie-synthetic','qa-001',35000]];
  async function rehearsal(){
   await db.exec('begin');
   try{
    for(const [business,key,amount] of keys){
     await db.query('insert into t29_bookings (business_id,source_key,amount_cents,status) values ($1,$2,$3,$4)',[business,key,amount,'draft']);
    }
    const inside=await db.query('select business_id,count(*)::integer as count,sum(amount_cents)::bigint as total from t29_bookings group by business_id order by business_id');
    assert.equal(inside.rows.length,2);
    assert.deepEqual(inside.rows.map(x=>x.count),[1,1]);
    assert.equal(inside.rows.reduce((v,x)=>v+Number(x.total),0),60000);
    await assert.rejects(db.query('insert into t29_bookings (business_id,source_key,amount_cents,status) values ($1,$2,$3,$4)',keys[0].slice(0,2).concat([999,'draft'])));
    return inside.rows.map(x=>({business:x.business_id,count:x.count,total:String(x.total)}));
   }finally{await db.exec('rollback');}
  }
  const first=await rehearsal();
  let after=await db.query('select count(*)::integer as count, coalesce(sum(amount_cents),0)::bigint as total from t29_bookings');
  assert.deepEqual(after.rows[0],before);
  const second=await rehearsal();
  assert.deepEqual(second,first);
  after=await db.query('select count(*)::integer as count, coalesce(sum(amount_cents),0)::bigint as total from t29_bookings');
  assert.deepEqual(after.rows[0],before);
 }finally{await db.close();}
});
