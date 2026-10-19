import {validDate,validTime,validPickerValue} from './date-time-values.js';
export {validDate,validTime,validPickerValue} from './date-time-values.js';
import {enhanceDropdown} from './dropdown.js';
const pad=n=>String(n).padStart(2,'0');
export function shiftDate(value,days){const d=new Date(value+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+days);const s=d.toISOString().slice(0,10);return validDate(s)?s:value;}
export function shiftMonth(value,months){
 const d=new Date(value+'T12:00:00Z'),day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+months);const last=new Date(d);last.setUTCMonth(last.getUTCMonth()+1);last.setUTCDate(0);d.setUTCDate(Math.min(day,last.getUTCDate()));const result=d.toISOString().slice(0,10);return validDate(result)?result:value;
}
export function monthDays(value){
 const first=value.slice(0,7)+'-01',weekday=(new Date(first+'T12:00:00Z').getUTCDay()+6)%7;
 return Array.from({length:42},(_,i)=>{const d=new Date(first+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+i-weekday);const value=d.toISOString().slice(0,10);return validDate(value)?value:null;});
}
const element=(tag,className='',text='')=>{const node=document.createElement(tag);node.className=className;if(text)node.textContent=text;return node;};
const button=(text,label)=>{const node=element('button','',text);node.type='button';if(label)node.setAttribute('aria-label',label);return node;};
export function enhancePicker(input){
 const kind=input.dataset.picker;
 if(input.dataset.pickerEnhanced||input.disabled||!['date','time','datetime'].includes(kind))return;
 const root=element('div','date-time-picker'),control=element('div','picker-control'),trigger=button('',kind==='time'?'Choose time':kind==='datetime'?'Choose date and time':'Choose date');trigger.className='picker-toggle';
 const icon=element('span',kind==='time'?'picker-clock-icon':'picker-calendar-icon');icon.setAttribute('aria-hidden','true');trigger.append(icon);
 const popup=element('div','picker-popup');popup.id=input.id+'-picker';popup.hidden=true;popup.setAttribute('role','dialog');popup.setAttribute('aria-label',kind==='time'?'Choose time':kind==='datetime'?'Choose date and time':'Choose date');
 const fieldLabel=input.labels?.[0]?.textContent;if(fieldLabel){trigger.setAttribute('aria-label','Choose '+fieldLabel);popup.setAttribute('aria-label','Choose '+fieldLabel);}
 trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-controls',popup.id);trigger.setAttribute('aria-expanded','false');
 const error=element('span','picker-error');error.id=input.id+'-error';error.hidden=true;error.setAttribute('role','alert');input.setAttribute('aria-errormessage',error.id);
 input.after(root);root.append(control,popup,error);control.append(input,trigger);
 let selected='',focused='',month='',hour='00',minute='00';const timeDropdowns=[];
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:input.dataset.timeZone||'UTC',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const title=element('p','picker-month');title.id=input.id+'-month';title.setAttribute('aria-live','polite');
 const grid=element('div','picker-grid');grid.setAttribute('role','grid');grid.setAttribute('aria-labelledby',title.id);
 const close=(restore=false)=>{timeDropdowns.forEach(dropdown=>dropdown?.close());popup.hidden=true;trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus();};
 const validate=()=>{const bad=!!input.value&&!validPickerValue(input.value,kind);input.setCustomValidity(bad?'Enter a valid '+(kind==='datetime'?'date and time':kind)+'.':'');if(!bad){input.removeAttribute('aria-invalid');error.hidden=true;error.textContent='';}};
 const commit=()=>{input.value=kind==='date'?selected:kind==='time'?hour+':'+minute:selected+'T'+hour+':'+minute;validate();input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));close(true);};
 const renderDays=()=>{
  title.textContent=new Intl.DateTimeFormat('en-ZA',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(month+'-01T12:00:00Z'));
  grid.replaceChildren();const headings=element('div','picker-weekdays');headings.setAttribute('role','row');
  for(const name of ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']){const h=element('span','',name);h.setAttribute('role','columnheader');headings.append(h);}grid.append(headings);
  const days=monthDays(month+'-01');
  for(let row=0;row<6;row++){
   const group=element('div','picker-week');group.setAttribute('role','row');
   for(const value of days.slice(row*7,row*7+7)){
    if(!value){const blank=element('span');blank.setAttribute('role','gridcell');blank.setAttribute('aria-disabled','true');group.append(blank);continue;}
    const cell=button(String(Number(value.slice(-2))),new Intl.DateTimeFormat('en-ZA',{dateStyle:'full',timeZone:'UTC'}).format(new Date(value+'T12:00:00Z')));cell.dataset.day=value;cell.setAttribute('role','gridcell');cell.setAttribute('aria-selected',String(value===selected));cell.tabIndex=value===focused?0:-1;
    if(value.slice(0,7)!==month)cell.classList.add('picker-other-month');if(value===today())cell.setAttribute('aria-current','date');
    cell.addEventListener('click',()=>{selected=value;focused=value;month=value.slice(0,7);if(kind==='date')commit();else{renderDays();focusDay();}});
    cell.addEventListener('keydown',event=>{
     let next;const dow=(new Date(value+'T12:00:00Z').getUTCDay()+6)%7;
     if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))next=shiftDate(value,{ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[event.key]);
     if(event.key==='Home'||event.key==='End')next=shiftDate(value,event.key==='Home'?-dow:6-dow);
     if(event.key==='PageUp'||event.key==='PageDown')next=shiftMonth(value,(event.key==='PageUp'?-1:1)*(event.shiftKey?12:1));
     if(next){event.preventDefault();focused=next;month=next.slice(0,7);renderDays();focusDay();}
    });group.append(cell);
   }grid.append(group);
  }
 };
 const focusDay=()=>grid.querySelector(`[data-day="${focused}"]`)?.focus();
 const timeSelects=[];
 if(kind!=='time'){
  const head=element('div','picker-month-nav'),prev=button('‹','Previous month'),next=button('›','Next month');head.append(prev,title,next);popup.append(head,grid);
  const move=direction=>{focused=shiftMonth(focused,direction);month=focused.slice(0,7);renderDays();};prev.addEventListener('click',()=>move(-1));next.addEventListener('click',()=>move(1));
 }
 if(kind!=='date'){
  const time=element('div','picker-time'),caption=element('p','picker-time-caption','Time · 24-hour');popup.append(caption,time);
  for(const [part,count] of [['hour',24],['minute',60]]){
   const block=element('div'),label=element('label','',part==='hour'?'Hour':'Minute'),select=element('select');select.id=input.id+'-'+part;label.htmlFor=select.id;
   for(let i=0;i<count;i++){const option=element('option','',pad(i));option.value=pad(i);select.append(option);}
   select.addEventListener('change',()=>{if(part==='hour')hour=select.value;else minute=select.value;});block.append(label,select);time.append(block);timeSelects.push(select);timeDropdowns.push(enhanceDropdown(select));
  }
 }
 const actions=element('div','picker-actions'),cancel=button('Cancel'),done=button('Done');cancel.addEventListener('click',()=>close(true));done.addEventListener('click',commit);
 if(kind!=='time'){const current=button('Today');current.addEventListener('click',()=>{selected=today();focused=selected;month=selected.slice(0,7);if(kind==='date')commit();else{renderDays();focusDay();}});actions.append(current);}
 actions.append(cancel);if(kind!=='date')actions.append(done);popup.append(actions);
 const open=()=>{
  document.dispatchEvent(new CustomEvent('faraios:picker-open',{detail:root}));
  const valid=validPickerValue(input.value,kind);selected=valid&&kind!=='time'?input.value.slice(0,10):today();focused=selected;month=selected.slice(0,7);
  const time=valid&&kind!=='date'?input.value.slice(-5):'00:00';[hour,minute]=time.split(':');
  timeSelects.forEach((select,i)=>{select.value=i?minute:hour;select.dispatchEvent(new Event('change'));});
  if(kind!=='time')renderDays();popup.hidden=false;trigger.setAttribute('aria-expanded','true');
  popup.style.maxHeight='calc(100dvh - 32px)';
  const rect=control.getBoundingClientRect(),box=popup.getBoundingClientRect(),width=box.width,height=Math.min(box.height,window.innerHeight-32);
  popup.style.left=Math.max(16,Math.min(rect.left,window.innerWidth-width-16))+'px';const top=Math.max(16,rect.bottom+height+8<=window.innerHeight?rect.bottom+8:rect.top-height-8);popup.style.top=top+'px';popup.style.maxHeight=(window.innerHeight-top-16)+'px';
  if(kind!=='time')focusDay();else popup.querySelector('.dropdown-trigger')?.focus();
 };
 trigger.addEventListener('click',()=>popup.hidden?open():close(true));input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();open();}});
 root.addEventListener('keydown',event=>{if(event.key==='Escape'&&!popup.hidden){event.preventDefault();event.stopPropagation();close(true);}});
 root.addEventListener('focusout',()=>queueMicrotask(()=>{if(!root.contains(document.activeElement))close();}));
 document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
 document.addEventListener('faraios:picker-open',event=>{if(event.detail!==root)close();});window.addEventListener('resize',()=>close());
 document.addEventListener('scroll',event=>{if(!popup.contains(event.target))close();},true);
 input.addEventListener('input',validate);input.addEventListener('change',validate);
 input.addEventListener('invalid',event=>{event.preventDefault();input.setAttribute('aria-invalid','true');error.textContent='Enter '+(kind==='datetime'?'a valid date and time (YYYY-MM-DDTHH:mm).':kind==='date'?'a valid date (YYYY-MM-DD).':'a valid 24-hour time (HH:mm).');error.hidden=false;input.focus();});
 input.form?.addEventListener('reset',()=>setTimeout(()=>{close();input.setCustomValidity('');input.removeAttribute('aria-invalid');error.hidden=true;error.textContent='';},0));
 input.dataset.pickerEnhanced='true';validate();return {root,open,close};
}
if(typeof document!=='undefined')document.querySelectorAll('input[data-picker]').forEach(enhancePicker);
