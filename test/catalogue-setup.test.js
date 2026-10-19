import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseCatalogueItem,renderCatalogue} from '../src/catalogue.js';
import {configMoney,cleaningConfigForm} from '../src/cleaning-profiles.js';
import {enhanceCatalogueSetup} from '../public/catalogue-setup.js';
const id=n=>'90000000-0000-4000-8000-'+String(n).padStart(12,'0');
const decode=s=>s.replace(/&(amp|quot|lt|gt|#39);/g,(_,e)=>({amp:'&',quot:'"',lt:'<',gt:'>','#39':"'"})[e]);
// Serialize the server-rendered native controls as a browser would before enhancement.
function fields(html){const form=new URLSearchParams(),attrs=s=>Object.fromEntries([...s.matchAll(/([\w-]+)="([^"]*)"/g)].map(m=>[m[1],decode(m[2])]));for(const m of html.matchAll(/<input\b([^>]+)>|<select\b([^>]+)>([\s\S]*?)<\/select>/g)){const a=attrs(m[1]??m[2]);if(!a.name)continue;if(m[1]){if(a.type==='checkbox'&&!/\bchecked(?:\s|$)/.test(m[1]))continue;form.append(a.name,a.value??(a.type==='checkbox'?'on':''));}else{const options=[...m[3].matchAll(/<option\b([^>]*)>([\s\S]*?)<\/option>/g)];const option=options.find(o=>/\bselected(?:\s|$)/.test(o[1]))??options[0];form.append(a.name,attrs(option[1]).value??decode(option[2]));}}return form;}
const normal=o=>JSON.parse(JSON.stringify(o));
test('all six saved configurations survive compact-form submission and Rand conversion',async()=>{
 const approved=JSON.parse(await readFile(new URL('../config/shalean-approved-cleaning.json',import.meta.url),'utf8')).services;
 for(const [profile,item] of Object.entries(approved)){
  const service={...structuredClone(item),id:id(1),business_id:id(2),kind:'service',name:'Saved service',description:'A & B',currency:'ZAR',team_size:1,is_active:true,version:3};
  const extra={id:id(3),business_id:id(2),kind:'extra',name:'Fridge',price_cents:2500,unit_label:'hour',is_active:true};
  service.cleaning_config.extras=[extra.id];service.cleaning_config.extra_minutes={[extra.id]:60};
  const html=renderCatalogue({id:id(2),name:'Business'},[service,extra],true,service);const form=fields(html);const result=parseCatalogueItem(form,service);
  assert.equal(result.price_cents,service.price_cents);assert.equal(result.cleaning_config.base_minutes,service.cleaning_config.base_minutes);assert.equal(result.cleaning_config.equipment.policy,service.cleaning_config.equipment.policy);assert.deepEqual(result.cleaning_config.extras,[extra.id]);assert.equal(result.cleaning_config.extra_minutes[extra.id],60);
  for(const [key,options] of Object.entries(service.cleaning_config.rules))for(const [answer,rate] of Object.entries(options)){const actual=result.cleaning_config.rules[key][answer];assert.equal(actual.cents,rate.cents,profile+'/'+key);assert.equal(actual.minutes,rate.minutes);assert.equal(!!actual.assessment,!!rate.assessment);}
  assert.equal(result.cleaning_config.manual_duration,!!service.cleaning_config.manual_duration);assert.equal(result.cleaning_config.linen_change_enabled,!!service.cleaning_config.linen_change_enabled);
  assert.doesNotMatch(html,/Delete Saved service/);assert.match(html,/setup-section/);assert.doesNotMatch(html,/name="rule_bedrooms_unit_cents"/);
 }
 for(const [rand,cents] of [['30',3000],['30.01',3001],['0',0],['21474836.47',2147483647]])assert.equal(configMoney(new URLSearchParams({rate_rand:rand}),'rate_cents'),cents);
 for(const rand of ['1e3','-1','1.001','21474836.48',''])assert.throws(()=>configMoney(new URLSearchParams({rate_rand:rand}),'rate_cents'));
});
test('paid pet choices and optional delivery retain precision; invalid submissions retain raw values',()=>{
 const rules={property_type:Object.fromEntries(['House','Apartment','Townhouse'].map(k=>[k,{cents:0,minutes:0}])),bedrooms:{unit:{cents:1234,minutes:30}},bathrooms:{unit:{cents:2500,minutes:30}},extra_rooms:{unit:{cents:0,minutes:0}},pets:{Birds:{cents:1275,minutes:7}}};
 const service={id:id(1),business_id:id(2),kind:'service',name:'Test',price_cents:25000,pricing_model:'fixed',unit_label:'visit',team_size:1,is_active:true,version:1,cleaning_profile:'regular',cleaning_config:{base_minutes:180,service_fee_cents:125,rules,equipment:{policy:'distance',base:'Depot & storage',base_cents:1234,per_km_cents:125,minimum_cents:9999,minutes:30},extras:[],extra_minutes:{}}};
 const form=fields(renderCatalogue({id:id(2),name:'Business'},[service],true,service));const parsed=parseCatalogueItem(form,service);assert.equal(parsed.cleaning_config.rules.pets.Birds.cents,1275);assert.equal(parsed.cleaning_config.rules.pets.Birds.minutes,7);assert.deepEqual(parsed.cleaning_config.equipment,service.cleaning_config.equipment);assert.equal(parsed.cleaning_config.service_fee_cents,125);
 const raw={...Object.fromEntries(form),rule_bedrooms_unit_rand:'12.345',pet_label_0:'',pet_label_5:'Cats & dogs',pet_5_rand:'25.50',pet_5_minutes:'15'};
 const html=cleaningConfigForm({...service,form_values:raw},[]);assert.match(html,/value="12.345"/);assert.match(html,/name="pet_label_5"[^>]*value="Cats &amp; dogs"/);assert.match(html,/name="pet_5_rand"[^>]*value="25.50"/);
 assert.throws(()=>parseCatalogueItem(new URLSearchParams(raw),service),/Rand amount/);
});
class Node extends EventTarget{
 constructor(){super();this.children=[];this.dataset={};this.hidden=false;this.required=false;this.tagName='DIV';}
 append(node){if(node.parentElement){const list=node.parentElement.children;list.splice(list.indexOf(node),1);}this.children.push(node);node.parentElement=this;}
 querySelector(selector){return this.querySelectorAll(selector)[0]??null;}
 querySelectorAll(selector){return this.matches?.[selector]??[];}
 focus(){this.focused=true;}
}
test('setup enhancement reveals relevant controls, adds existing unused pet rows, and opens invalid sections',()=>{
 const form=new Node(),policy={type:'select-one',value:'assessed'},pets={type:'checkbox',checked:true};form.elements={namedItem:n=>({equipment_policy:policy,pets_no_charge:pets})[n]};
 const distance=new Node(),amount=new Node();amount.required=true;distance.dataset.setupWhen='equipment_policy:distance';distance.matches={input:[amount]};
 const pricing=new Node(),extra=new Node(),extraMinutes=new Node(),extraCheck={checked:false};extra.matches={'[data-extra-toggle]':[extraCheck],'[data-extra-minutes]':[extraMinutes]};
 const unused=new Node(),visible=new Node(),add=new Node(),row=new Node(),input=new Node();unused.append(row);unused.querySelector=s=>s==='[data-pet-row]'?unused.children[0]??null:null;row.matches={input:[input]};
 form.matches={'[data-setup-when]':[distance],'[data-pet-pricing]':[pricing],'.setup-extra':[extra],'[data-unused-pets]':[unused],'[data-pet-visible]':[visible],'[data-add-pet]':[add]};
 enhanceCatalogueSetup(form);assert.equal(distance.hidden,true);assert.equal(amount.required,false);assert.equal(pricing.hidden,true);assert.equal(extraMinutes.hidden,true);assert.equal(unused.hidden,true);
 policy.value='distance';pets.checked=false;extraCheck.checked=true;form.dispatchEvent(new Event('change'));assert.equal(distance.hidden,false);assert.equal(amount.required,true);assert.equal(pricing.hidden,false);assert.equal(extraMinutes.hidden,false);
 add.dispatchEvent(new Event('click'));assert.equal(visible.children[0],row);assert.equal(input.focused,true);assert.equal(add.hidden,true);
 const details=new Node();details.tagName='DETAILS';details.parentElement=form;input.parentElement=details;const invalid=new Event('invalid');Object.defineProperty(invalid,'target',{value:input});form.dispatchEvent(invalid);assert.equal(details.open,true);
});

test('extras do not require a service team or cleaning profile',()=>{
 const business={id:id(2),name:'Business'};
 const create=renderCatalogue(business,[],true);assert.doesNotMatch(create,/<input[^>]*name="team_size"[^>]*\brequired\b/);
 const form=fields(create);for(const [k,v] of Object.entries({kind:'extra',name:'Fridge',price:'25.00',pricing_model:'hourly',unit_label:'hour',status:'active'}))form.set(k,v);
 const extra=parseCatalogueItem(form);assert.equal(extra.team_size,null);assert.equal(extra.cleaning_profile,null);
 const edit=renderCatalogue(business,[],true,{...extra,id:id(3),version:1});assert.doesNotMatch(edit,/Cleaners required|Booking questions/);
 const root=new Node(),teamGroup=new Node(),profileGroup=new Node(),team=new Node(),profile=new Node();profile.value='regular';const kind={value:'extra'};
 root.elements={namedItem:n=>n==='kind'?kind:null};teamGroup.matches={'input[name="team_size"]':[team]};profileGroup.matches={'select[name="cleaning_profile"]':[profile]};root.matches={'[data-setup-service-only]':[teamGroup,profileGroup]};
 enhanceCatalogueSetup(root);assert.equal(teamGroup.hidden,true);assert.equal(team.required,false);assert.equal(profile.value,'');kind.value='service';root.dispatchEvent(new Event('change'));assert.equal(teamGroup.hidden,false);assert.equal(team.required,true);
});

test('read-only item links retain the catalogue and hourly services retain per-unit price wording',()=>{
 const service={id:id(1),kind:'service',name:'Hourly service',price_cents:2500,pricing_model:'hourly',unit_label:'hour',team_size:1,is_active:true,version:1};
 const readonly=renderCatalogue({id:id(2),name:'Business'},[service],false,service);assert.match(readonly,/<h3>Hourly service<\/h3>/);assert.doesNotMatch(readonly,/<form/);
 const edit=renderCatalogue({id:id(2),name:'Business'},[service],true,service);assert.match(edit,/<span>Price \(R\)<\/span>/);assert.doesNotMatch(edit,/Base visit price/);
});
