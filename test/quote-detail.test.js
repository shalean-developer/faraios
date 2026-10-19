import test from 'node:test';
import assert from 'node:assert/strict';
import {renderQuotes,quoteAddress,quoteAcceptanceActor} from '../src/quotes.js';
import {enhanceReference} from '../public/quote-detail.js';
const business={id:'10000000-0000-4000-8000-000000000001',name:'Synthetic',role:'owner'};
const quote={id:'90000000-0000-4000-8000-000000000001',status:'converted',version:4,converted_booking_id:'60000000-0000-4000-8000-000000000001',created_at:'2026-10-19T09:00:00Z',accepted_by:'00000000-0000-4000-8000-000000000001',accepted_at:'2026-10-19T09:10:11Z',acceptance_reference:'<script>approval</script>',agreement:{customer_snapshot:{name:'Synthetic <name>',email:'test@example.invalid',phone:'+27 00 000 0000'},address_snapshot:{address_line:'1 Example',suburb:'Cape Town',city:'cape town',postal_code:'0000'},price_lines:[{name:'Paid <item>',quantity:1,rate_cents:87500,total_cents:87500,unit_label:'visit'},{name:'Excluded room',quantity:0,rate_cents:2000,total_cents:0,unit_label:'room'}],duration_minutes:240,required_team_size:2,total_cents:87500,time_zone:'Africa/Johannesburg'}};
const handoff={booking_id:quote.converted_booking_id,booking_status:'cancelled'};
test('quote detail puts current states, saved total and main action first; disclosures preserve exact snapshots',()=>{
 const html=renderQuotes(business,[],{quote,handoff,actor:{available:true,label:'Office <actor>'}});
 for(const text of ['Invoicing needs review','Open booking','Quote total','Booking:'])assert.ok(html.indexOf(text)<html.indexOf('Price breakdown'),text+' must be in the summary');
 assert.match(html,/Quote 90000000…0001/);assert.match(html,/readonly value="90000000-0000-4000-8000-000000000001"/);assert.match(html,/data-copy-reference hidden/);
 assert.match(html,/scope="col"[^>]*>Qty/);assert.match(html,/No-charge details \(1\)/);assert.match(html,/<details class="quote-no-charge"><summary>/);assert.match(html,/Excluded room/);assert.match(html,/class="quote-quantity">0<\/td>/);assert.doesNotMatch(html,/Included/);
 assert.match(html,/Cape Town, 0000/);assert.doesNotMatch(html,/Cape Town, cape town/);assert.match(html,/4h/);assert.match(html,/2 staff members/);
 assert.match(html,/Office &lt;actor&gt;/);assert.match(html,/Current account label/);assert.match(html,/11:10:11/);assert.match(html,/datetime="2026-10-19T09:10:11Z"/);assert.match(html,/Africa\/Johannesburg/);assert.match(html,/&lt;script&gt;approval&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>approval/);assert.match(html,/tel:\+27000000000/);
 const missing=renderQuotes(business,[],{quote,handoff});assert.match(missing,/Account label unavailable/);assert.match(missing,new RegExp(quote.accepted_by));assert.match(missing,/11:10:11/);
 const free=structuredClone(quote);free.agreement.price_lines=[quote.agreement.price_lines[1]];free.agreement.total_cents=0;
 assert.match(renderQuotes(business,[],{quote:free,handoff}),/<details class="quote-no-charge" open>/);
 assert.equal(quote.agreement.address_snapshot.city,'cape town');assert.equal(quote.agreement.price_lines.length,2);
});
test('address presentation removes only adjacent equal components',()=>{
 assert.equal(quoteAddress({address_line:' A ',suburb:'B',city:'a',postal_code:'1'}),'A, B, a, 1');
 assert.equal(quoteAddress({address_line:'A',suburb:' A ',city:'B'}),'A, B');
});
test('actor resolver binds every returned identity and degrades only unavailable labels',async()=>{
 let calls=0;const client={rpc:async(name,params)=>{calls++;assert.equal(name,'quote_acceptance_actor');assert.deepEqual(params,{p_business_id:business.id,p_quote_id:quote.id});return {data:{business_id:business.id,quote_id:quote.id,actor_id:quote.accepted_by,label:' Owner '}};}};
 assert.equal(await quoteAcceptanceActor(client,business.id,{...quote,accepted_by:null}),null);assert.equal(calls,0);
 assert.deepEqual(await quoteAcceptanceActor(client,business.id,quote),{available:true,label:'Owner'});
 assert.deepEqual(await quoteAcceptanceActor({rpc:async()=>({error:{code:'PGRST202'}})},business.id,quote),{available:false});
 await assert.rejects(quoteAcceptanceActor({rpc:async()=>({error:{code:'42501'}})},business.id,quote),e=>e.status===403);
 for(const field of ['business_id','quote_id','actor_id'])await assert.rejects(quoteAcceptanceActor({rpc:async()=>({data:{business_id:business.id,quote_id:quote.id,actor_id:quote.accepted_by,label:'Wrong',[field]:'foreign'}})},business.id,quote),/Acceptance record unavailable/);
});
function referenceDom(){
 const listeners=[],button={dataset:{},hidden:true,disabled:false,addEventListener:(name,callback)=>listeners.push(callback)},input={value:quote.id,focus(){this.focused=true;},select(){this.selected=true;}},details={open:false},status={textContent:''};
 const root={querySelector:selector=>({'[data-copy-reference]':button,'input[readonly]':input,details,'[role="status"]':status})[selector]};return {root,button,input,details,status,listeners};
}
test('reference copies the full canonical ID once and announces success',async()=>{
 const dom=referenceDom(),copied=[];enhanceReference(dom.root,{clipboard:{writeText:async value=>copied.push(value)}});enhanceReference(dom.root);assert.equal(dom.listeners.length,1);assert.equal(dom.button.hidden,false);
 await dom.listeners[0]();assert.deepEqual(copied,[quote.id]);assert.equal(dom.status.textContent,'Reference copied.');assert.equal(dom.button.disabled,false);
});
test('unavailable or denied clipboard reveals and selects a manual fallback',async()=>{
 for(const clipboard of [null,{writeText:async()=>{throw new Error('Denied');}}]){const dom=referenceDom();enhanceReference(dom.root,{clipboard});await dom.listeners[0]();assert.equal(dom.details.open,true);assert.equal(dom.input.focused,true);assert.equal(dom.input.selected,true);assert.match(dom.status.textContent,/copy it manually/);assert.equal(dom.button.disabled,false);}
});
