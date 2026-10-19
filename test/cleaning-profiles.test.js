import test from 'node:test';
import assert from 'node:assert/strict';
import {definitions,profileFields,parseCleaningConfig,parseCleaningScope,cleaningConfigForm,cleaningScopeForm} from '../src/cleaning-profiles.js';
import {parseBookingCreate,renderBookings,createBooking} from '../src/bookings.js';
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const formFor=profile=>{
 const form=new URLSearchParams({cleaning_profile:profile,base_minutes:'60',service_fee_cents:'0',equipment_policy:'included'});
 for(const key of profileFields[profile]){const d=definitions[key].custom?{...definitions[key],options:['No animals','Birds present']}:definitions[key];if(d.custom){for(const [i,label] of d.options.entries()){form.set('pet_label_'+i,label);form.set('pet_'+i+'_cents','0');form.set('pet_'+i+'_minutes','0');}}for(const [i] of (d.count?['unit']:d.options).entries()){if(d.custom)continue;const prefix='rule_'+key+'_'+(d.count?'unit':i);form.set(prefix+'_cents','0');form.set(prefix+'_minutes','0');}form.set('scope_'+key,d.count?(['bathrooms','carpet_rooms'].includes(key)?'1':'0'):d.options[0]);}
 return form;
};
test('all six profiles require explicit configuration and render only their own scope fields',()=>{
 for(const profile of Object.keys(profileFields)){
  const form=formFor(profile),cfg=parseCleaningConfig(form,'service'),service={id:id(1),name:'Synthetic',kind:'service',is_active:true,pricing_model:'fixed',price_cents:1000,...cfg};
  assert.equal(cfg.cleaning_config.base_minutes,60);assert.equal(parseCleaningScope(form,service)[profileFields[profile][0]],form.get('scope_'+profileFields[profile][0]));
  const markup=cleaningScopeForm(service,Object.fromEntries(form));for(const key of profileFields[profile])assert.match(markup,new RegExp('name="scope_'+key+'"'));
  for(const key of Object.keys(definitions).filter(k=>!profileFields[profile].includes(k)))assert.doesNotMatch(markup,new RegExp('name="scope_'+key+'"'));
  form.set('rule_'+profileFields[profile][0]+'_0_cents','');assert.throws(()=>parseCleaningConfig(form,'service'),/explicit whole number/);
 }
 const first=Object.keys(profileFields)[0],f=formFor(first);f.set('base_minutes','');assert.throws(()=>parseCleaningConfig(f,'service'));
 assert.throws(()=>parseCleaningConfig(formFor('regular'),'extra'),/profile/);
 const s={cleaning_profile:'regular',cleaning_config:{equipment:{policy:'included'}}},f2=formFor('regular');f2.set('scope_bathrooms','0');assert.throws(()=>parseCleaningScope(f2,s),/at least one/);f2.set('scope_bathrooms','1.5');assert.throws(()=>parseCleaningScope(f2,s),/whole number/);
});
test('cleaning booking form selects service before scope and filters extras by saved applicability',()=>{
 const form=formFor('regular'),service={id:id(1),name:'Synthetic',kind:'service',is_active:true,pricing_model:'fixed',price_cents:1000,unit_label:'visit',...parseCleaningConfig(form,'service')};
 service.cleaning_config.extras=[id(2)];const extras=[2,3].map(n=>({id:id(n),name:'Extra '+n,kind:'extra',is_active:true,pricing_model:'fixed',price_cents:500,unit_label:'each'}));
 for(const [k,v] of Object.entries({service_id:id(1),service_quantity:'1',customer_id:id(4),address_id:id(5),request_key:id(6),local_start:'2026-10-20T09:00'}))form.set(k,v);
 const row=parseBookingCreate(form,[service,...extras]);assert.equal(row.duration_minutes,15);assert.equal(row.cleaning_scope.bedrooms,0);
 form.set('extra_'+id(3),'1');assert.throws(()=>parseBookingCreate(form,[service,...extras]),/not available/);form.delete('extra_'+id(3));
 const html=renderBookings({id:id(7),name:'Business'},[],{time_zone:'UTC',staff:[]},{customer:{id:id(4)},catalogue:[service,...extras],values:{service_id:service.id}});
 assert.match(html,/scope_bedrooms/);assert.match(html,new RegExp('name="extra_'+id(2)+'"'));assert.doesNotMatch(html,new RegExp('name="extra_'+id(3)+'"'));assert.doesNotMatch(html,/name="duration_minutes"/);
 const configHtml=cleaningConfigForm({...service,cleaning_config:{...service.cleaning_config,equipment:{policy:'distance',base:'<script>'}}},extras);assert.doesNotMatch(configHtml,/<script>/);assert.match(configHtml,/&lt;script&gt;/);
});
test('equipment requires recorded distance evidence; duplicate scoped requests compare JSON values independent of key order',async()=>{
 const form=formFor('regular'),service={...parseCleaningConfig(form,'service')};service.cleaning_config.equipment={policy:'distance'};form.set('scope_equipment','Yes');assert.throws(()=>parseCleaningScope(form,service),/distance/);
 form.set('scope_distance_km','10.11');form.set('scope_distance_reason','Office measurement');const scope=parseCleaningScope(form,service);assert.equal(scope.distance_km,10.11);
 form.set('scope_distance_km','10.111');assert.throws(()=>parseCleaningScope(form,service),/distance/);
 const row={customer_id:id(1),address_id:id(2),request_key:id(3),local_start:'2026-10-20T09:00',duration_minutes:15,selection:[],hours_override_reason:'',cleaning_scope:scope};
 const old={...row,duration_minutes:120,cleaning_scope:Object.fromEntries(Object.entries(scope).reverse())};
 const q={eq(){return this;},maybeSingle:async()=>({data:{id:id(4),request_payload:old}})};const client={from:()=>({insert:()=>({select:async()=>({error:{code:'23505'}})}),select:()=>q})};
 assert.equal(await createBooking(client,id(5),row),id(4));await assert.rejects(createBooking(client,id(5),{...row,cleaning_scope:{...scope,bedrooms:3}}),e=>e.status===409);
});

test('profile changes clear old configuration and pet choices remain service-specific',()=>{
 const f=formFor('regular'),regular=parseCleaningConfig(f,'service');f.set('cleaning_profile','office');assert.equal(parseCleaningConfig(f,'service',regular).cleaning_config,null);
 f.set('cleaning_profile','deep');assert.equal(parseCleaningConfig(f,'service',regular).cleaning_config,null);
 const pets=formFor('regular');pets.set('scope_pets','Dogs');assert.throws(()=>parseCleaningScope(pets,regular),/Select pets/);pets.set('scope_pets','Birds present');assert.equal(parseCleaningScope(pets,regular).pets,'Birds present');
 pets.set('pet_label_1','No animals');assert.throws(()=>parseCleaningConfig(pets,'service'),/distinct pet choices/);
});

test('office assessment parsing requires explicit charge, duration and reason and linen availability',()=>{
 const f=formFor('moving'),service=parseCleaningConfig(f,'service');service.cleaning_config.equipment={policy:'assessed'};f.set('scope_equipment_arrangement','Business supplies equipment');assert.throws(()=>parseCleaningScope(f,service),/office assessment/);
 f.set('assessment_cents','0');f.set('assessment_minutes','120');f.set('assessment_reason','Equipment assessed and included for this job');assert.equal(parseCleaningScope(f,service).assessment.additional_cents,0);
 f.set('assessment_reason','');assert.throws(()=>parseCleaningScope(f,service),/assessment/);
 const air=formFor('airbnb');air.set('linen_change_enabled','on');air.set('rule_linen_change_0_cents','0');air.set('rule_linen_change_0_minutes','0');air.set('rule_linen_change_1_cents','5000');air.set('rule_linen_change_1_minutes','30');const airService=parseCleaningConfig(air,'service');air.set('scope_linen','No linen change');air.set('scope_linen_change','Yes');assert.throws(()=>parseCleaningScope(air,airService),/Fresh linen/);
});

test('optional linen changes stay scoped to the configured business service',()=>{
 const oldForm=formFor('airbnb'),oldService=parseCleaningConfig(oldForm,'service');assert.equal(oldService.cleaning_config.linen_change_enabled,false);assert.doesNotMatch(cleaningScopeForm(oldService),/name="scope_linen_change"/);assert.equal(parseCleaningScope(oldForm,oldService).linen_change,undefined);
 const form=formFor('airbnb');form.set('linen_change_enabled','on');for(const i of [0,1]){form.set('rule_linen_change_'+i+'_cents',String(i*5000));form.set('rule_linen_change_'+i+'_minutes',String(i*30));}const configured=parseCleaningConfig(form,'service');assert.match(cleaningScopeForm(configured),/name="scope_linen_change"/);assert.throws(()=>parseCleaningScope(form,configured),/change linen/);form.set('scope_linen_change','Yes');assert.equal(parseCleaningScope(form,configured).linen_change,'Yes');assert.doesNotMatch(cleaningScopeForm(oldService),/name="scope_linen_change"/);
});

test('profile preview marker accepts complete new-profile configuration in a single save',()=>{
 const previous={cleaning_profile:'regular',cleaning_config:{base_minutes:900}};
 const form=formFor('office');form.set('configuration_profile','office');
 const parsed=parseCleaningConfig(form,'service',previous);assert.equal(parsed.cleaning_profile,'office');assert.equal(parsed.cleaning_config.base_minutes,60);assert.equal(parsed.cleaning_config.rules.bedrooms,undefined);
 form.set('rule_bathrooms_unit_cents','');assert.throws(()=>parseCleaningConfig(form,'service',previous),/explicit whole number/);
});
