import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {PGlite} from '@electric-sql/pglite';
import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {parseCustomerForm} from '../src/customers.js';
import {parseBookingCreate} from '../src/bookings.js';
import {prepareInvoice} from '../src/invoices.js';

// Entire rehearsal uses disposable PGlite and synthetic data. No hosted source,
// provider adapter, notification worker, recurring generator, or external network.
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const user=id(1),other=id(2),a=id(10),b=id(20);
const files=['identity-draft.sql','audit-draft.sql','business-settings-draft.sql','catalogue-draft.sql','customers-draft.sql','bookings-draft.sql','bookings-context-hardening-draft.sql','cleaning-profiles-draft.sql','cleaning-assessments-draft.sql','cleaning-assessment-review-hardening-draft.sql','staff-teams-draft.sql','availability-draft.sql','recurring-draft.sql','quotes-draft.sql','quote-acceptance-actor-draft.sql','invoices-draft.sql'];

test('T29: isolated two-tenant customer -> booking -> unsynced invoice, rollback and no external effects',async()=>{
 const db=new PGlite({extensions:{btree_gist}});
 try{
  await db.exec(`create role anon;create role authenticated;create role service_role;
   create schema auth;create table auth.users(id uuid primary key);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema public,auth to authenticated,anon;
   grant execute on function auth.uid() to authenticated;`);
  for(const file of files)await db.exec(await readFile(new URL('../database/'+file,import.meta.url),'utf8'));
  await db.query('insert into auth.users(id) values($1),($2)',[user,other]);
  await db.query("insert into public.businesses(id,name,industry) values($1,'Synthetic Shalean','cleaning'),($2,'Synthetic Bokkie','cleaning')",[a,b]);
  await db.query("insert into public.business_memberships(business_id,user_id,role) values($1,$3,'owner'),($2,$4,'owner')",[a,b,user,other]);
  // Only these original, synthetic business/membership fixtures survive rollback.
  const as=async(uid,fn)=>{await db.exec('set role authenticated');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[uid]);try{return await fn();}finally{await db.exec('reset role;reset request.jwt.claim.sub');}};
  let outbound=0;const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>{outbound++;throw Error('T29_NETWORK_DENIED');};
  try{
   await db.exec('begin');
   const outcomes=[];
   try{
    for(const [business,who,n] of [[a,user,100],[b,other,200]]){
     const customer=parseCustomerForm(new URLSearchParams({name:'Synthetic Customer '+n,email:'qa'+n+'@example.test',status:'active'}));
     const address=parseCustomerForm(new URLSearchParams({label:'Home',address_line:'Synthetic Street',status:'active'}),true);
     await as(who,async()=>{
      await db.query("insert into public.business_settings(business_id,display_name,working_days,opens_at,closes_at,time_zone) values($1,'Synthetic',array[0,1,2,3,4,5,6]::smallint[],'08:00','18:00','Africa/Johannesburg')",[business]);
      await db.query('insert into public.business_customers(id,business_id,name,email,is_active) values($1,$2,$3,$4,$5)',[id(n),business,customer.name,customer.email,customer.is_active]);
      await db.query('insert into public.customer_addresses(id,business_id,customer_id,label,address_line,is_active) values($1,$2,$3,$4,$5,$6)',[id(n+1),business,id(n),address.label,address.address_line,address.is_active]);
      await db.query("insert into public.business_catalogue(id,business_id,kind,name,pricing_model,unit_label,price_cents,currency,team_size,is_active) values($1,$2,'service','Synthetic visit','fixed','visit',15000,'ZAR',1,true)",[id(n+2),business]);
     });
     const form=new URLSearchParams({customer_id:id(n),address_id:id(n+1),service_id:id(n+2),request_key:id(n+3),service_quantity:'1',local_start:'2026-11-12T09:00',duration_minutes:'120'});
     const row=parseBookingCreate(form,[{id:id(n+2),kind:'service',is_active:true,pricing_model:'fixed',price_cents:15000}]);
     await as(who,async()=>{
      await db.query('insert into public.one_off_bookings(id,business_id,request_key,customer_id,address_id,local_start,duration_minutes,selection) values($1,$2,$3,$4,$5,$6,$7,$8)',[id(n+4),business,row.request_key,row.customer_id,row.address_id,row.local_start,row.duration_minutes,JSON.stringify(row.selection)]);
     });
     const invoiceId=await as(who,()=>prepareInvoice({rpc:async(name,p)=>{assert.equal(name,'prepare_invoice');const res=await db.query('select public.prepare_invoice($1,$2) as id',[p.p_business_id,p.p_booking_id]);return{data:res.rows[0].id,error:null};}},business,id(n+4)));
     const invoice=(await db.query('select id,business_id,booking_id,customer_id,total_cents,currency,document_status,sync_status,external_invoice_id from public.business_invoices where id=$1',[invoiceId])).rows[0];
     assert.equal(invoice.business_id,business);
     assert.equal(invoice.booking_id,id(n+4));
     assert.equal(invoice.customer_id,id(n));
     assert.equal(Number(invoice.total_cents),15000);
     assert.equal(invoice.currency,'ZAR');
     assert.equal(invoice.document_status,'draft');
     assert.equal(invoice.sync_status,'not_synced');
     assert.equal(invoice.external_invoice_id,null);
     outcomes.push({business,invoiceId});
    }
    assert.equal(new Set(outcomes.map(x=>x.invoiceId)).size,2);
    assert.equal((await db.query('select count(*)::int n from public.business_customers')).rows[0].n,2);
    assert.equal((await db.query('select count(*)::int n from public.one_off_bookings')).rows[0].n,2);
    assert.equal((await db.query('select count(*)::int n from public.business_invoices')).rows[0].n,2);
    await as(other,async()=>{
     assert.equal((await db.query('select count(*)::int n from public.business_invoices where business_id=$1',[a])).rows[0].n,0);
     await assert.rejects(db.query('select public.prepare_invoice($1,$2)',[a,id(104)]),e=>e.code==='42501');
    });
   }finally{await db.exec('rollback');}
   for(const table of ['business_customers','customer_addresses','one_off_bookings','business_invoices'])
    assert.equal((await db.query('select count(*)::int n from public.'+table)).rows[0].n,0);
   assert.equal(outbound,0);
  }finally{globalThis.fetch=originalFetch;}
 }finally{await db.close();}
});
