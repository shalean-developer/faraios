import test from 'node:test';
import assert from 'node:assert/strict';
import {validDate,validTime,validPickerValue,shiftDate,shiftMonth,monthDays,timeChoices,enhancePicker} from '../public/date-time-picker.js';
import {dateTimeField} from '../src/date-time-field.js';
import {renderBusinessSettings} from '../src/business-settings.js';
import {renderBookings} from '../src/bookings.js';
import {updateBooking} from '../src/bookings.js';
import {checkAvailability} from '../src/calendar.js';
import {renderCalendar} from '../src/calendar.js';
class Element extends EventTarget{
 constructor(tag='div'){super();this.tagName=tag;this.children=[];this.dataset={};this.attrs={};this.style={};this.hidden=false;this._value='';this.selectedIndex=0;this.className='';this.classList={add:c=>this.className+=' '+c,toggle:()=>{}};}
 append(...nodes){for(const node of nodes){if(node.parent)node.parent.children=node.parent.children.filter(n=>n!==node);this.children.push(node);node.parent=this;}}
 replaceChildren(...nodes){this.children=[];this.append(...nodes);}
 after(node){this.sibling=node;if(this.parent){node.parent=this.parent;this.parent.children.splice(this.parent.children.indexOf(this)+1,0,node);}}
 setAttribute(k,v){this.attrs[k]=String(v);}
 removeAttribute(k){delete this.attrs[k];}
 get options(){return this.children;}
 set value(v){this._value=v;if(this.tagName==='select')this.selectedIndex=this.children.findIndex(o=>o.value===v);}
 get value(){return this.tagName==='select'?this.children[this.selectedIndex]?.value??'':this._value;}
 setCustomValidity(v){this.validationMessage=v;}
 contains(node){return node===this||this.children.some(n=>n.contains(node));}
 focus(){document.activeElement=this;}
 scrollIntoView(){}
 getBoundingClientRect(){return {left:20,top:40,bottom:80,width:300,height:360};}
 closest(){return this.role==='option'?this:null;}
 querySelector(selector){return walk(this).find(n=>selector.startsWith('.')?n.className.split(' ').includes(selector.slice(1)):n.dataset.day===selector.match(/data-day="([^"]+)"/)?.[1]);}
}
const walk=root=>root.children.flatMap(c=>[c,...walk(c)]);
const key=(node,value)=>{const e=new Event('keydown',{cancelable:true});Object.defineProperty(e,'key',{value});node.dispatchEvent(e);};
const click=node=>node.dispatchEvent(new Event('click'));
const blurTo=(root,target)=>{const event=new Event('focusout');Object.defineProperty(event,'relatedTarget',{value:target});root.dispatchEvent(event);};
test('calendar arithmetic handles leap dates, month ends and year changes without timezone conversion',()=>{
 assert.equal(validDate('2028-02-29'),true);for(const v of ['2026-02-29','2026-04-31','0000-01-01','bad'])assert.equal(validDate(v),false);
 assert.equal(shiftMonth('2028-01-31',1),'2028-02-29');assert.equal(shiftMonth('2026-03-31',-1),'2026-02-28');assert.equal(shiftDate('2026-12-31',1),'2027-01-01');
 const days=monthDays('2026-10-19');assert.equal(days.length,42);assert.equal(days[0],'2026-09-28');assert.equal(days.at(-1),'2026-11-08');
 assert.equal(validTime('23:59'),true);assert.equal(validTime('24:00'),false);assert.equal(validTime('09:60'),false);assert.equal(validPickerValue('2028-02-29T07:03','datetime'),true);
 const markup=dateTimeField({id:'start',label:'<script>',kind:'datetime',value:'2026-10-19T09:00'});assert.match(markup,/data-picker="datetime"/);assert.doesNotMatch(markup,/<script>|type="datetime-local"/);
});
test('booking, calendar and working-hours forms reuse the same field renderer without native temporal controls',()=>{
 const business={id:'test',name:'Test'},ctx={time_zone:'UTC',staff:[]};
 const settings=renderBusinessSettings(business,{opens_at:'08:17:00',closes_at:'17:43:00'});assert.match(settings,/data-picker="time"[^>]*value="08:17"/);assert.match(settings,/name="closes_at"/);
 const calendar=renderCalendar(business,ctx,{time_zone:'UTC',bookings:[],busy:[]},{day:'2026-10-19',view:'day',days:1});assert.match(calendar,/data-picker="date"/);assert.match(calendar,/data-picker="datetime"/);
 const booking=renderBookings(business,[],ctx,{booking:{id:'test',status:'assigned',version:1,local_start:'2026-10-19T09:37',duration_minutes:120,assigned_staff:[],customer_snapshot:{name:'Test'},address_snapshot:{},price_lines:[],required_team_size:1,total_cents:0}});assert.match(booking,/data-picker="datetime"[^>]*value="2026-10-19T09:37"/);
 for(const markup of [settings,calendar,booking])assert.doesNotMatch(markup,/type="(?:date|time|datetime-local)"/);
});
test('server rejects impossible or overflowing dates/times before any availability or booking write',async()=>{
 let calls=0;const client={rpc:()=>{calls++;},from:()=>{calls++;}};
 for(const value of ['2026-10-19T24:00','2026-10-19T23:60','2026-02-30T09:00','2026-02-29T09:00','0000-01-01T09:00']){
  const params=new URLSearchParams({version:'1',action:'reschedule',local_start:value,duration_minutes:'120',change_reason:'Test'});
  await assert.rejects(updateBooking(client,'test',{id:'test'},params),/date\/time/);
  await assert.rejects(checkAvailability(client,'test',params),e=>e.status===422);
 }
 assert.equal(calls,0);
});
test('shared pickers commit canonical values, cancel, navigate with keyboard, reset and retain typed validation',async()=>{
 const previous={document:globalThis.document,window:globalThis.window};const doc=new Element();doc.createElement=tag=>new Element(tag);globalThis.document=doc;globalThis.window=Object.assign(new Element(),{innerWidth:390,innerHeight:844});
 try{
  const input=new Element('input');input.id='day';input.value='2028-02-28';input.dataset={picker:'date',timeZone:'UTC'};input.form=new Element('form');
  let changes=0;input.addEventListener('change',()=>changes++);const picker=enhancePicker(input),popup=picker.root.children[1],trigger=picker.root.children[0].children[1];
  picker.open();assert.equal(popup.hidden,false);assert.equal(trigger.attrs['aria-expanded'],'true');let selected=popup.querySelector('[data-day="2028-02-28"]');key(selected,'ArrowRight');assert.equal(document.activeElement.dataset.day,'2028-02-29');click(document.activeElement);assert.equal(input.value,'2028-02-29');assert.equal(changes,1);assert.equal(popup.hidden,true);
  picker.open();key(picker.root,'Escape');assert.equal(popup.hidden,true);assert.equal(input.value,'2028-02-29');
  input.value='2026-02-30';input.dispatchEvent(new Event('input'));assert.match(input.validationMessage,/valid date/);input.value='2026-03-01';input.dispatchEvent(new Event('input'));assert.equal(input.validationMessage,'');
  input.dispatchEvent(new Event('invalid',{cancelable:true}));assert.equal(document.activeElement,input);assert.equal(input.attrs['aria-invalid'],'true');const error=picker.root.children[2];assert.equal(error.hidden,false);assert.equal(error.attrs.role,'alert');assert.match(error.textContent,/valid date/);assert.equal(input.attrs['aria-errormessage'],error.id);
  input.value='';input.form.dispatchEvent(new Event('reset'));await new Promise(r=>setTimeout(r,5));assert.equal(input.validationMessage,'');assert.equal(input.attrs['aria-invalid'],undefined);assert.equal(error.hidden,true);assert.equal(error.textContent,'');
  assert.equal(enhancePicker(input),undefined);
  const combined=new Element('input');combined.id='start';combined.name='local_start';combined.form=new Element('form');combined.value='2026-10-19T07:03';combined.dataset={picker:'datetime',timeZone:'UTC'};const datetime=enhancePicker(combined);datetime.open();
  const selects=walk(datetime.root).filter(n=>n.tagName==='select');assert.equal(selects.length,1);assert.equal(selects[0].value,'07:03');assert.ok(selects[0].options.some(o=>o.value==='07:03'));
  selects[0].value='15:45';selects[0].dispatchEvent(new Event('change'));click(walk(datetime.root).find(n=>n.textContent==='Done'));assert.equal(combined.value,'2026-10-19 15:45');
  {const formData=new FormData(),event=new Event('formdata');Object.defineProperty(event,'formData',{value:formData});combined.form.dispatchEvent(event);assert.equal(formData.get('local_start'),'2026-10-19T15:45');}
  datetime.open();selects[0].value='18:00';selects[0].dispatchEvent(new Event('change'));click(walk(datetime.root).find(n=>n.textContent==='Cancel'));assert.equal(combined.value,'2026-10-19 15:45');
  const time=new Element('input');time.id='opening';time.value='08:17';time.dataset={picker:'time'};const clock=enhancePicker(time);clock.open();const timeSelects=walk(clock.root).filter(n=>n.tagName==='select');timeSelects[0].value='10:15';timeSelects[0].dispatchEvent(new Event('change'));click(walk(clock.root).find(n=>n.textContent==='Done'));assert.equal(time.value,'10:15');
  combined.value='2026-10-19T09:37';datetime.open();assert.equal(selects[0].value,'09:37');assert.ok(selects[0].options.some(o=>o.value==='09:37'));assert.ok(walk(datetime.root).some(n=>n.role==='option'&&n.textContent==='09:37'&&n.attrs['aria-selected']==='true'));click(walk(datetime.root).find(n=>n.textContent==='Done'));assert.equal(combined.value,'2026-10-19 09:37');
  datetime.open();clock.open();assert.equal(datetime.root.children[1].hidden,true);assert.equal(clock.root.children[1].hidden,false);
 }finally{globalThis.document=previous.document;globalThis.window=previous.window;}
});
test('pointer focus transitions keep dates and custom time options clickable before focus settles',async()=>{
 const previous={document:globalThis.document,window:globalThis.window};const doc=new Element();doc.createElement=tag=>new Element(tag);globalThis.document=doc;globalThis.window=Object.assign(new Element(),{innerWidth:390,innerHeight:844});
 try{
  const input=new Element('input');input.id='date-pointer';input.value='2026-10-12';input.dataset={picker:'date',timeZone:'UTC'};
  const picker=enhancePicker(input);picker.open();const popup=picker.root.children[1],target=popup.querySelector('[data-day="2026-10-20"]');
  // Real browsers dispatch focusout while activeElement is temporarily body.
  doc.activeElement=doc;blurTo(picker.root,target);await Promise.resolve();assert.equal(popup.hidden,false);
  target.focus();click(target);assert.equal(input.value,'2026-10-20');assert.equal(popup.hidden,true);
  const combined=new Element('input');combined.id='time-pointer';combined.value='2026-10-12T09:00';combined.dataset={picker:'datetime',timeZone:'UTC'};
  const time=enhancePicker(combined);time.open();const timePopup=time.root.children[1],hourDropdown=walk(timePopup).find(n=>n.className==='dropdown'),hourTrigger=hourDropdown.children[0],hourOptions=hourDropdown.children[1];
  doc.activeElement=doc;blurTo(time.root,hourTrigger);await Promise.resolve();assert.equal(timePopup.hidden,false);hourTrigger.focus();click(hourTrigger);
  const selection=new Event('click');Object.defineProperty(selection,'target',{value:hourOptions.children.find(o=>o.textContent==='15:00')});hourOptions.dispatchEvent(selection);
  const done=walk(timePopup).find(n=>n.textContent==='Done');doc.activeElement=doc;blurTo(time.root,done);await Promise.resolve();assert.equal(timePopup.hidden,false);done.focus();click(done);assert.equal(combined.value,'2026-10-12 15:00');
  // A null destination during grid replacement must wait for the next focus.
  picker.open();doc.activeElement=doc;blurTo(picker.root,null);await Promise.resolve();assert.equal(popup.hidden,false);popup.querySelector('[data-day="2026-10-20"]').focus();await new Promise(r=>setTimeout(r,5));assert.equal(popup.hidden,false);
  // Genuine keyboard/pointer departure and null-target blur still dismiss.
  blurTo(picker.root,new Element());assert.equal(popup.hidden,true);picker.open();doc.activeElement=doc;blurTo(picker.root,null);await new Promise(r=>setTimeout(r,5));assert.equal(popup.hidden,true);
 }finally{globalThis.document=previous.document;globalThis.window=previous.window;}
});

test('single time choices span the day and preserve off-grid exact minutes without rounding',()=>{
 const choices=timeChoices();assert.equal(choices.length,96);assert.equal(choices[0],'00:00');assert.equal(choices.at(-1),'23:45');
 assert.equal(timeChoices('09:30').length,96);assert.equal(timeChoices('09:37').length,97);assert.ok(timeChoices('09:37').includes('09:37'));assert.ok(timeChoices('23:59').includes('23:59'));assert.equal(timeChoices('24:00').length,96);
});
