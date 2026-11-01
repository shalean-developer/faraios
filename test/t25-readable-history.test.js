import test from 'node:test';import assert from 'node:assert/strict';
import {renderCustomerPortal,renderOfficeRequests} from '../src/customer-portal.js';
const service='25000000-0000-4000-8000-000000000110';
const business={id:'25000000-0000-4000-8000-000000000010',name:'Synthetic',catalogue:[{id:service,kind:'service',name:'Regular Cleaning',price_cents:25000}],workingDays:[1],serviceAreas:[],timeZone:'UTC',opensAt:'08:00',closesAt:'18:00'};
const row={id:'request-one',state:'awaiting_assessment',version:1,localStart:'2026-11-03T09:00',serviceName:'Regular Cleaning',customer:'customer',customerName:'Synthetic',addressDetails:{city:'City',label:'Home',postal_code:'0000',suburb:'Suburb',address_line:'Street'},scope:{property_type:'House',bedrooms:1,bathrooms:1,extra_rooms:0,pets:'No pets',equipment_arrangement:'Customer supplies equipment',access_instructions:'<script>blocked</script>'},selection:[{catalogue_id:service,quantity:1}],quote:null};
const render=r=>renderCustomerPortal('synthetic',business,{signedIn:true,account:{customers:[{id:'customer',name:'Synthetic',addresses:[]}]},requests:{rows:[r]}});
test('T25 history presents readable scope, ordered address, service names and explicit pending amounts',()=>{
 for(const html of [render(row),renderOfficeRequests(business,{rows:[row]},business.catalogue)]){
  assert.match(html,/<dt>Property type<\/dt><dd>House<\/dd>/);assert.match(html,/<dt>Extra rooms<\/dt><dd>0<\/dd>/);assert.match(html,/Regular Cleaning · Quantity 1/);assert.match(html,/Home, Street, Suburb, City, 0000/);assert.match(html,/<\/strong> <small>09:00/);assert.match(html,/&lt;script&gt;blocked&lt;\/script&gt;/);
  assert.doesNotMatch(html,/property_type|equipment_arrangement|catalogue_id|<pre>|<script>blocked/);
 }
 assert.match(render(row),/Price pending · duration pending/);
 assert.match(render({...row,state:'booked',booking:'booking-one'}),/Created as an unassigned Draft\. See booking history for its current status/);
});
