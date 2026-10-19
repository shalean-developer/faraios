// Enhance marked selects while retaining native form submission and a no-script fallback.
export function enhanceDropdown(select){
 if(select.dataset.enhanced||select.multiple||select.disabled)return;
 const root=document.createElement('div');root.className='dropdown';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='dropdown-trigger';
 const list=document.createElement('div');list.className='dropdown-options';list.id=select.id+'-options';list.role='listbox';list.hidden=true;
 const label=select.labels?.[0];
 if(label){label.id ||= select.id+'-label';trigger.setAttribute('aria-labelledby',label.id+' '+select.id+'-value');list.setAttribute('aria-labelledby',label.id);}
 const value=document.createElement('span');value.id=select.id+'-value';trigger.append(value);
 const arrow=document.createElement('span');arrow.className='dropdown-arrow';arrow.setAttribute('aria-hidden','true');trigger.append(arrow);
 trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-controls',list.id);trigger.setAttribute('aria-expanded','false');
 if(select.required)trigger.setAttribute('aria-required','true');
 const optionRow=(option,index)=>{
  const row=document.createElement('div');row.role='option';row.id=list.id+'-'+index;row.textContent=option.textContent;row.dataset.index=String(index);
  row.setAttribute('aria-disabled',String(option.disabled));list.append(row);return row;
 };
 let options=Array.from(select.options).map(optionRow);
 let active=select.selectedIndex,search='',lastKey=0;
 const sync=()=>{value.textContent=select.options[select.selectedIndex]?.textContent??'';options.forEach((row,i)=>row.setAttribute('aria-selected',String(i===select.selectedIndex)));};
 const highlight=index=>{active=index;options.forEach((row,i)=>row.classList.toggle('highlighted',i===active));if(options[active]){trigger.setAttribute('aria-activedescendant',options[active].id);options[active].scrollIntoView({block:'nearest'});}};
 const refreshOptions=()=>{list.replaceChildren();options=Array.from(select.options).map(optionRow);active=select.selectedIndex;search='';lastKey=0;sync();close();};
 const close=()=>{list.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');};
 const open=()=>{list.hidden=false;trigger.setAttribute('aria-expanded','true');highlight(select.selectedIndex);};
 const choose=index=>{if(!select.options[index]||select.options[index].disabled)return;select.selectedIndex=index;select.dispatchEvent(new Event('input',{bubbles:true}));select.dispatchEvent(new Event('change',{bubbles:true}));sync();close();trigger.focus();};
 const move=direction=>{let next=active;for(let n=0;n<options.length;n++){next=(next+direction+options.length)%options.length;if(!select.options[next].disabled){highlight(next);break;}}};
 trigger.addEventListener('click',()=>list.hidden?open():close());
 trigger.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&list.hidden)return;
  if(event.key==='Escape')event.stopPropagation();
  if(['ArrowDown','ArrowUp','Home','End','Enter',' ','Escape'].includes(event.key)){
   event.preventDefault();
   if(event.key==='Escape'){close();return;}
   if(event.key==='Enter'||event.key===' '){if(list.hidden)open();else choose(active);return;}
   if(list.hidden)open();
   if(event.key==='ArrowDown'||event.key==='ArrowUp')move(event.key==='ArrowDown'?1:-1);
   else {active=event.key==='Home'?-1:options.length;move(event.key==='Home'?1:-1);}
  }else if(event.key==='Tab')close();
  else if(event.key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
   const now=Date.now();search=now-lastKey>700?event.key:search+event.key;lastKey=now;
   const index=Array.from(select.options).findIndex(o=>!o.disabled&&o.textContent.toLowerCase().startsWith(search.toLowerCase()));
   if(index>=0){event.preventDefault();if(list.hidden)open();highlight(index);}
  }
 });
 // Keep focus on the combobox until the option click commits its value.
 list.addEventListener('mousedown',event=>event.preventDefault());
 list.addEventListener('click',event=>{const row=event.target.closest('[role="option"]');if(row&&list.contains(row))choose(Number(row.dataset.index));});
 document.addEventListener('pointerdown',event=>{if(!root.contains(event.target))close();});
 root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close();});
 select.addEventListener('change',sync);
 select.addEventListener('invalid',event=>{event.preventDefault();trigger.setAttribute('aria-invalid','true');trigger.focus();open();});
 select.addEventListener('change',()=>trigger.removeAttribute('aria-invalid'));
 select.form?.addEventListener('reset',()=>setTimeout(()=>{sync();close();trigger.removeAttribute('aria-invalid');},0));
 label?.addEventListener('click',event=>{event.preventDefault();trigger.focus();});
 select.after(root);root.append(trigger,list);sync();select.hidden=true;select.dataset.enhanced='true';return {open,close,refreshOptions};
}
if(typeof document!=='undefined')document.querySelectorAll('select[data-dropdown]').forEach(enhanceDropdown);

