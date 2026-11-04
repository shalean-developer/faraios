import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBookingCreate, createBooking} from '../src/bookings.js';

const id=n=>'30000000-0000-4000-8000-'+String(n).padStart(12,'0');
const businessIds=['10000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002'];
const catalogue=[{id:id(1),kind:'service',is_active:true,pricing_model:'fixed',price_cents:25000,name:'Synthetic'}];

test('T29: isolated fresh-start booking rehearsal has no provider, notification or recurrence calls',async()=>{
 const originalFetch=globalThis.fetch;let outbound=0;let writes=0;const records=[];
 globalThis.fetch=async()=>{outbound++;throw new Error('OUTBOUND_DISABLED');};
 try{
  for(const [i,businessId] of businessIds.entries()){
   const form=new URLSearchParams({customer_id:id(2),address_id:id(3),service_id:id(1),request_key:id(10+i),service_quantity:'1',local_start:'2026-11-05T09:00',duration_minutes:'120'});
   const row=parseBookingCreate(form,catalogue);
   const client={from(table){assert.equal(table,'one_off_bookings');return {insert(payload){writes++;assert.equal(payload.business_id,businessId);assert.equal(payload.status,undefined);assert.equal(payload.payment_status,undefined);return {select:async()=>({data:[{id:id(20+i)}],error:null})};}};}};
   const bookingId=await createBooking(client,businessId,row);
   records.push({businessId,bookingId,requestKey:row.request_key});
  }
  assert.equal(writes,2);
  assert.equal(outbound,0);
  assert.equal(new Set(records.map(x=>x.businessId)).size,2);
  assert.equal(new Set(records.map(x=>x.bookingId)).size,2);
  assert.equal(records.filter(x=>x.businessId===businessIds[0]).length,1);
  assert.equal(records.filter(x=>x.businessId===businessIds[1]).length,1);
 }finally{globalThis.fetch=originalFetch;}
});
