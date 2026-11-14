/* FaraiOS shared single-select. Native value/validation remains the form contract. */
(() => {
 'use strict';
 if (window.FaraiOSSelect) return;
 let opened = null;
 const controls = new WeakMap();
 let sequence = 0;
 function enhance(root = document) {
  const sources = [...root.querySelectorAll('select[data-faraios-select]')];
  if(root.matches?.('select[data-faraios-select]')) sources.unshift(root);
  for (const source of sources) {
   if (controls.has(source) || source.multiple || source.querySelector('optgroup')) continue;
   if(!source.id)source.id='f-select-source-'+(++sequence);
   const originalTabIndex=source.getAttribute('tabindex');
   const wrap=document.createElement('div');wrap.className='f-select';
   source.before(wrap);wrap.append(source);
   const trigger=document.createElement('button');trigger.type='button';trigger.className='f-select__trigger';trigger.id=source.id+'-trigger';trigger.setAttribute('role','combobox');trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls',source.id+'-list');
   const value=document.createElement('span');value.className='f-select__value';value.id=source.id+'-value';
   const chevron=document.createElement('span');chevron.className='f-select__chevron';chevron.setAttribute('aria-hidden','true');trigger.append(value,chevron);
   const list=document.createElement('div');list.className='f-select__list';list.id=source.id+'-list';list.setAttribute('role','listbox');list.hidden=true;
   const error=document.createElement('span');error.className='f-select__error';error.id=source.id+'-error';error.hidden=true;error.setAttribute('aria-live','polite');
   wrap.append(trigger,list,error);
   const labels=[...source.labels];
   for(const [i,label] of labels.entries()){if(!label.id)label.id=source.id+'-label-'+i;label.htmlFor=trigger.id;}
   const labelIds=labels.map(label=>label.id).join(' ')||source.getAttribute('aria-labelledby');
   if(labelIds){trigger.setAttribute('aria-labelledby',labelIds);list.setAttribute('aria-labelledby',labelIds);}
   else trigger.setAttribute('aria-label',source.getAttribute('aria-label')||source.name||'Choose an option');
   trigger.setAttribute('aria-describedby',[source.getAttribute('aria-describedby'),value.id,error.id].filter(Boolean).join(' '));
   if(originalTabIndex!==null)trigger.setAttribute('tabindex',originalTabIndex);
   source.classList.add('f-select__source');source.tabIndex=-1;source.setAttribute('aria-hidden','true');
   let active=-1,rows=[],typed='',timer;
   const enabled=()=>rows.map((row,i)=>!row.disabled?i:-1).filter(i=>i>=0);
   const clearError=()=>{error.hidden=true;error.textContent='';trigger.removeAttribute('aria-invalid');};
   const close=()=>{list.hidden=true;trigger.setAttribute('aria-expanded','false');trigger.removeAttribute('aria-activedescendant');wrap.classList.remove('f-select--up');clearTimeout(timer);typed='';if(opened===control)opened=null;};
   const highlight=index=>{
    active=index;rows.forEach((item,i)=>item.node.classList.toggle('f-select__option--active',i===index));
    if(rows[index]){trigger.setAttribute('aria-activedescendant',rows[index].node.id);rows[index].node.scrollIntoView({block:'nearest'});}
   };
   const sync=()=>{
    const selected=source.options[source.selectedIndex];
    value.textContent=selected?.textContent||source.dataset.placeholder||'Select an option';
    trigger.disabled=source.disabled;trigger.setAttribute('aria-required',String(source.required));
    trigger.classList.toggle('f-select__trigger--placeholder',!source.value);
    rows.forEach(row=>{const checked=row.index===source.selectedIndex;row.node.setAttribute('aria-selected',String(checked));row.node.classList.toggle('f-select__option--selected',checked);});
   };
   const build=()=>{
    list.replaceChildren();rows=[];
    for(const [index,option] of [...source.options].entries()){
     const node=document.createElement('div');node.id=source.id+'-option-'+index;node.className='f-select__option';node.setAttribute('role','option');node.dataset.index=String(index);node.textContent=option.textContent;
     const disabled=option.disabled||(source.required&&option.value==='');node.setAttribute('aria-disabled',String(disabled));rows.push({index,node,disabled});list.append(node);
    }sync();
   };
   const open=(edge=null)=>{
    if(trigger.disabled)return;if(opened&&opened!==control)opened.close();
    list.hidden=false;trigger.setAttribute('aria-expanded','true');opened=control;
    const rect=trigger.getBoundingClientRect(),below=innerHeight-rect.bottom-12,above=rect.top-12;
    const up=below<180&&above>below;wrap.classList.toggle('f-select--up',up);
    list.style.maxHeight=Math.min(256,Math.max(80,up?above:below))+'px';
    const available=enabled();const selected=rows[source.selectedIndex];
    highlight(edge==='last'?available.at(-1):edge==='first'?available[0]:selected&&!selected.disabled?source.selectedIndex:available[0]);
   };
   const choose=index=>{
    if(!rows[index]||rows[index].disabled)return;
    const changed=source.selectedIndex!==index;source.selectedIndex=index;sync();clearError();close();trigger.focus();
    if(changed){source.dispatchEvent(new Event('input',{bubbles:true}));source.dispatchEvent(new Event('change',{bubbles:true}));}
   };
   const control={close,refresh:build,source,trigger};controls.set(source,control);
   trigger.addEventListener('click',()=>list.hidden?open():close());
   trigger.addEventListener('keydown',event=>{
    const {key}=event;
    if(['ArrowDown','ArrowUp','Home','End'].includes(key)){
     event.preventDefault();if(list.hidden){open(key==='End'||key==='ArrowUp'?'last':key==='Home'?'first':null);return;}
     const available=enabled();if(!available.length)return;const at=available.indexOf(active);
     highlight(key==='Home'?available[0]:key==='End'?available.at(-1):available[(at+(key==='ArrowDown'?1:-1)+available.length)%available.length]);return;
    }
    if(key==='Enter'||key===' '){event.preventDefault();if(list.hidden)open();else choose(active);return;}
    if(key==='Escape'){event.preventDefault();close();return;}
    if(key==='Tab'){close();return;}
    if(key.length===1&&!event.ctrlKey&&!event.metaKey&&!event.altKey){
     event.preventDefault();clearTimeout(timer);typed+=key.toLocaleLowerCase();timer=setTimeout(()=>typed='',700);
     if(list.hidden)open();const matches=enabled().filter(i=>source.options[i].textContent.trim().toLocaleLowerCase().startsWith(typed));
     if(matches.length)highlight(matches[0]);
    }
   });
   list.addEventListener('pointerdown',event=>event.preventDefault());
   list.addEventListener('click',event=>{const option=event.target.closest('[role="option"]');if(option&&list.contains(option))choose(Number(option.dataset.index));});
   source.addEventListener('change',()=>{sync();if(source.validity.valid)clearError();});
   source.addEventListener('invalid',event=>{event.preventDefault();trigger.setAttribute('aria-invalid','true');error.textContent=source.validationMessage||'Choose an option.';error.hidden=false;trigger.focus();});
   source.form?.addEventListener('reset',()=>queueMicrotask(()=>{close();sync();clearError();}));
   new MutationObserver(()=>{close();build();}).observe(source,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['disabled','required','selected','label','value']});
   build();
  }
 }
 document.addEventListener('pointerdown',event=>{if(opened&&!opened.trigger.parentElement.contains(event.target))opened.close();});
 document.addEventListener('focusin',event=>{if(opened&&!opened.trigger.parentElement.contains(event.target))opened.close();});
 window.addEventListener('resize',()=>opened?.close());
 window.FaraiOSSelect={enhance,refresh:source=>controls.get(source)?.refresh()};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>enhance());else enhance();
})();
