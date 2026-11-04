import test from 'node:test';
import assert from 'node:assert/strict';
import {createPaymentRuntime} from '../src/t20-payment-runtime.js';
import {createAccountingWorker} from '../src/t19-accounting-worker.js';
import {createStagingFetch,stagingDatabase} from '../src/hosted-staging.js';
import {createBooking,parseBookingCreate} from '../src/bookings.js';

// T29 isolation is a disposable *in-process* rehearsal, never a hosted runtime.
// Every external dispatch is injected and counted; no credentials or private data.
test('T29 rehearsal: finance, notifications, payouts and recurrence cannot escape disabled adapters',async()=>{
 const attempts={network:0,paystack:0,zoho:0,eft:0,notifications:0,payouts:0,recurrence:0,dbWrites:0};
 const deny=async key=>{attempts[key]++;throw new Error('T29_OUTBOUND_DISABLED');};
 const payment=await createPaymentRuntime({
  environment:'staging',enabled:false,accounts:[],backend:{email:'synthetic@example.test',password:'SYNTHETIC_ONLY',principalId:'11111111-1111-4111-8111-111111111111'}
 },[],{backendFactory:()=>deny('paystack')});
 assert.equal(payment.handler,null);
 const worker=createAccountingWorker({
  authenticateMachine:async()=>({active:false}),
  database:{pending:()=>deny('zoho'),resolveAuthorizedOperation:()=>deny('zoho')},
  runner:{run:()=>deny('zoho')}
 });
 await assert.rejects(worker.runOnce({}),/custody_denied/);
 const fetchGuard=createStagingFetch(()=>deny('network'));
 for(const uri of [
  'https://api.paystack.co/transaction/initialize',
  'https://www.zohoapis.com/books/v3/invoices',
  'https://api.resend.com/emails',
  stagingDatabase+'/rest/v1/rpc/t20_payment_owner',
  stagingDatabase+'/rest/v1/rpc/t21_eft',
  stagingDatabase+'/rest/v1/rpc/t19_enqueue_invoice'
 ])await assert.rejects(fetchGuard(uri,{method:'POST'}),/outbound request blocked/);
 // A rehearsal-only booking adapter. No customer, financial or recurring RPC.
 const businessIds=['10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'];
 const uuid=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
 const service=[{id:uuid(1),kind:'service',is_active:true,pricing_model:'fixed',name:'Synthetic'}];
 const records=[];
 const adapter=business=>({from(table){assert.equal(table,'one_off_bookings');return{insert(row){
  assert.equal(row.business_id,business);
  assert.equal(row.recurring_schedule_id,undefined);
  assert.equal(row.payment_status,undefined);
  attempts.dbWrites++;
  records.push({...row,id:uuid(20+attempts.dbWrites)});
  return{select:async()=>({data:[{id:records.at(-1).id}],error:null})};
 }};}});
 for(const [i,business] of businessIds.entries()){
  const form=new URLSearchParams({customer_id:uuid(2),address_id:uuid(3),service_id:uuid(1),request_key:uuid(10+i),service_quantity:'1',local_start:'2026-11-05T09:00',duration_minutes:'120'});
  const row=parseBookingCreate(form,service);
  await createBooking(adapter(business),business,row);
 }
 assert.equal(records.length,2);
 assert.equal(records[0].business_id,businessIds[0]);
 assert.equal(records[1].business_id,businessIds[1]);
 assert.deepEqual(attempts,{network:0,paystack:0,zoho:0,eft:0,notifications:0,payouts:0,recurrence:0,dbWrites:2});
 await payment.close();
});
