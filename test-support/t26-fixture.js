import {readFile} from 'node:fs/promises';
import {fixture as portalFixture,owner,customer,staff,other,a,b,id,enrol,booking} from './t25-fixture.js';
export {owner,customer,staff,other,a,b,id};
export async function fixture(db){
 const f=await portalFixture(db);
 for(const file of ['invoices-draft.sql','t20-payment-store-candidate.sql','t21-eft-candidate.sql','t26-notifications-candidate.sql']){
  let sql=await readFile(new URL('../database/'+file,import.meta.url),'utf8');
  if(file==='t20-payment-store-candidate.sql')sql=sql.replace('create schema private_t20;','');
  await db.exec(sql);
 }
 const call=(action,payload={},business=a,user=owner)=>f.as(user,async()=>(await db.query('select public.t26_notifications($1,$2,$3) v',[business,action,JSON.stringify(payload)])).rows[0].v,user?'authenticated':'anon');
 const relationships=new Map();
 const create=async(business=a,n=1000)=>{
  const route=business===a?'alpha':'beta';let rel=relationships.get(business);
  if(!rel){rel=await enrol(f,customer,route,n);relationships.set(business,rel);}
  const saved=await f.call('book',booking(rel,n+2,id(business===a?110:120)),customer,route);
  const invoice=(await f.as(owner,()=>db.query('select public.prepare_invoice($1,$2) id',[business,saved.booking]))).rows[0].id;
  return {...saved,invoice,customer:rel.customer};
 };
 const confirm=s=>f.as(owner,()=>db.query("update public.one_off_bookings set status='confirmed' where id=$1",[s.booking]));
 const pay=async(s,business=a,n=4000,amount=null)=>{
  const total=(await db.query('select total_cents from public.business_invoices where id=$1',[s.invoice])).rows[0].total_cents;
  const eft=(action,input)=>f.as(owner,()=>db.query('select public.t21_eft($1,$2)',[action,JSON.stringify({businessId:business,...input})]));
  await eft('record',{requestId:id(n),bankReference:'SYNTHETIC-'+n,evidenceReference:'ISOLATED-'+n,receivedOn:'2026-10-30',amountCents:amount??total});
  await eft('verify',{receiptId:id(n)});await eft('allocate',{receiptId:id(n),invoiceId:s.invoice});
 };
 const sink=business=>call('mode',{requestId:crypto.randomUUID(),mode:'sink'},business);
 const deliver=(jobId,business=a,requestId=crypto.randomUUID())=>call('deliver',{jobId,requestId},business);
 return {...f,call,create,confirm,pay,sink,deliver};
}
