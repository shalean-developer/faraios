/* FaraiOS reusable date and time pickers. Native inputs keep the form contract. */
(() => {
 'use strict';
 if(window.FaraiOSPicker)return;
 const instances=new WeakMap();
 const pad=n=>String(n).padStart(2,'0');
 const iso=d=>d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());
 const parse=v=>/^\d{4}-\d{2}-\d{2}$/.test(v)?new Date(Number(v.slice(0,4)),Number(v.slice(5,7))-1,Number(v.slice(8,10)),12):null;
 function enhance(root=document){
  root.querySelectorAll('input[data-faraios-picker]').forEach(source=>{
   if(instances.has(source)||!['date','time'].includes(source.type))return;
   const type=source.type,wrap=document.createElement('div');wrap.className='f-picker';
   source.before(wrap);wrap.append(source);source.classList.add('f-picker__native');source.tabIndex=-1;source.setAttribute('aria-hidden','true');
   const trigger=document.createElement('button');trigger.type='button';trigger.className='f-picker__trigger';trigger.id=source.id+'-picker';
   const labels=[...source.labels];labels.forEach(label=>label.htmlFor=trigger.id);
   trigger.setAttribute('aria-label',labels.map(l=>l.textContent).join(' ')||type);
   trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-required',String(source.required));
   const panel=document.createElement('div');panel.className='f-picker__panel';panel.id=source.id+'-panel';panel.hidden=true;panel.setAttribute('role','dialog');panel.setAttribute('aria-label',type==='date'?'Choose date':'Choose time');trigger.setAttribute('aria-controls',panel.id);
   const error=document.createElement('small');error.className='f-picker__error';error.id=source.id+'-error';error.hidden=true;trigger.setAttribute('aria-describedby',error.id);
   wrap.append(trigger,panel,error);
   let month=new Date(),hour=9,minute=0;
   const sync=()=>{
    const date=parse(source.value);
    trigger.textContent=source.value?(type==='date'?new Intl.DateTimeFormat('en-ZA',{weekday:'short',day:'numeric',month:'long',year:'numeric'}).format(date):source.value):type==='date'?'Choose a date':'Choose a time';
    trigger.disabled=source.disabled;
   };
   const close=(focus=false)=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();};
   const commit=value=>{source.value=value;source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));error.hidden=true;trigger.removeAttribute('aria-invalid');sync();close(true);};
   const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.addEventListener('click',fn);return b;};
   function calendar(){
    panel.replaceChildren();
    const head=document.createElement('div');head.className='f-picker__month';
    const title=document.createElement('strong');title.textContent=new Intl.DateTimeFormat('en-ZA',{month:'long',year:'numeric'}).format(month);title.setAttribute('aria-live','polite');
    const prev=button('‹',()=>{month.setMonth(month.getMonth()-1);calendar();panel.querySelector('[aria-label="Previous month"]').focus();});prev.setAttribute('aria-label','Previous month');
    const next=button('›',()=>{month.setMonth(month.getMonth()+1);calendar();panel.querySelector('[aria-label="Next month"]').focus();});next.setAttribute('aria-label','Next month');
    const min=parse(source.min),max=parse(source.max);
    prev.disabled=!!min&&new Date(month.getFullYear(),month.getMonth(),1)<=new Date(min.getFullYear(),min.getMonth(),1);
    next.disabled=!!max&&new Date(month.getFullYear(),month.getMonth()+1,0)>=max;
    head.append(prev,title,next);panel.append(head);
    const grid=document.createElement('div');grid.className='f-picker__calendar';
    ['Mo','Tu','We','Th','Fr','Sa','Su'].forEach(day=>{const s=document.createElement('span');s.textContent=day;grid.append(s);});
    const first=new Date(month.getFullYear(),month.getMonth(),1,12),offset=(first.getDay()+6)%7;
    for(let i=0;i<offset;i++)grid.append(document.createElement('span'));
    const count=new Date(month.getFullYear(),month.getMonth()+1,0).getDate();
    for(let day=1;day<=count;day++){
     const d=new Date(month.getFullYear(),month.getMonth(),day,12),value=iso(d),b=button(String(day),()=>commit(value));
     b.dataset.date=value;b.setAttribute('aria-label',new Intl.DateTimeFormat('en-ZA',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(d));
     b.setAttribute('aria-pressed',String(source.value===value));b.disabled=!!source.min&&value<source.min||!!source.max&&value>source.max;
     if(value===iso(new Date()))b.setAttribute('aria-current','date');
     b.addEventListener('keydown',event=>{
      const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-((d.getDay()+6)%7),End:6-((d.getDay()+6)%7)}[event.key];
      if(delta===undefined)return;event.preventDefault();const target=new Date(d);target.setDate(target.getDate()+delta);const v=iso(target);
      if(source.min&&v<source.min||source.max&&v>source.max)return;
      month=new Date(target.getFullYear(),target.getMonth(),1,12);calendar();panel.querySelector('[data-date="'+v+'"]')?.focus();
     });grid.append(b);
    }panel.append(grid);
   }
   function clock(){
    panel.replaceChildren();
    const title=document.createElement('strong');title.textContent='Choose a time · 24-hour';panel.append(title);
    const columns=document.createElement('div');columns.className='f-picker__time';
    for(const [name,count,current] of [['Hour',24,hour],['Minute',60,minute]]){
     const column=document.createElement('div'),label=document.createElement('span');label.textContent=name;column.append(label);
     const list=document.createElement('div');list.className='f-picker__time-list';list.setAttribute('role','group');list.setAttribute('aria-label',name);
     for(let n=0;n<count;n++){
      const b=button(pad(n),()=>{if(name==='Hour')hour=n;else minute=n;list.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));});
      b.setAttribute('aria-label',name+' '+pad(n));b.setAttribute('aria-pressed',String(n===current));
      b.addEventListener('keydown',e=>{const buttons=[...list.children],i=buttons.indexOf(b);let target;
       if(e.key==='ArrowDown')target=Math.min(count-1,i+1);if(e.key==='ArrowUp')target=Math.max(0,i-1);if(e.key==='Home')target=0;if(e.key==='End')target=count-1;
       if(target!==undefined){e.preventDefault();buttons[target].focus();}
      });list.append(b);
     }column.append(list);columns.append(column);
    }panel.append(columns);
    panel.append(button('Use time',()=>commit(pad(hour)+':'+pad(minute))));
   }
   trigger.addEventListener('click',()=>{
    if(!panel.hidden){close();return;}
    document.querySelectorAll('.f-picker__panel:not([hidden])').forEach(other=>{other.hidden=true;other.parentElement.querySelector('.f-picker__trigger').setAttribute('aria-expanded','false');});
    if(type==='date'){const d=parse(source.value)||parse(source.min)||new Date();month=new Date(d.getFullYear(),d.getMonth(),1,12);calendar();}
    else{hour=source.value?Number(source.value.slice(0,2)):9;minute=source.value?Number(source.value.slice(3,5)):0;clock();}
    panel.hidden=false;trigger.setAttribute('aria-expanded','true');
    wrap.classList.remove('f-picker--up');
    const rect=trigger.getBoundingClientRect(),height=panel.getBoundingClientRect().height;
    if(innerHeight-rect.bottom<height+12 && rect.top>=height+12)wrap.classList.add('f-picker--up');
    const selected=panel.querySelector('button[aria-pressed="true"]:not(:disabled)')||panel.querySelector('[data-date]:not(:disabled)')||panel.querySelector('button:not(:disabled)');selected?.focus();selected?.scrollIntoView({block:'nearest'});panel.scrollIntoView({block:'nearest'});
   });
   wrap.addEventListener('keydown',e=>{if(e.key==='Escape'){e.preventDefault();close(true);}});
   document.addEventListener('pointerdown',e=>{if(!wrap.contains(e.target))close();});
   document.addEventListener('focusin',e=>{if(!wrap.contains(e.target))close();});
   source.addEventListener('invalid',e=>{e.preventDefault();error.textContent=source.validationMessage;error.hidden=false;trigger.setAttribute('aria-invalid','true');trigger.focus();});
   source.addEventListener('change',sync);source.addEventListener('input',sync);
   source.form?.addEventListener('reset',()=>queueMicrotask(()=>{sync();close();error.hidden=true;trigger.removeAttribute('aria-invalid');}));
   new MutationObserver(sync).observe(source,{attributes:true,attributeFilter:['disabled','required','min','max']});
   instances.set(source,{sync});sync();
  });
 }
 window.FaraiOSPicker={enhance,refresh:source=>instances.get(source)?.sync()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>enhance());else enhance();
})();
