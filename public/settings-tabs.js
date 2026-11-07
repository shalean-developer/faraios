const form=document.querySelector('.business-settings-form');
const tabs=[...document.querySelectorAll('[data-settings-tab]')];
if(form&&tabs.length){
 const panels=tabs.map(tab=>document.getElementById(tab.hash.slice(1)));
 const activate=(index,focus=false)=>{
  tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});
  if(focus)tabs[index].focus();
 };
 const group=document.createElement('div');group.className='settings-tab-list';group.setAttribute('role','tablist');group.setAttribute('aria-label','Settings');
 tabs[0].before(group);tabs.forEach((tab,i)=>{
  group.append(tab);tab.id='settings-tab-'+panels[i].id;tab.setAttribute('role','tab');tab.setAttribute('aria-controls',panels[i].id);
  panels[i].setAttribute('role','tabpanel');panels[i].setAttribute('aria-labelledby',tab.id);
  tab.addEventListener('click',event=>{event.preventDefault();activate(i);history.replaceState(null,'',tab.hash);});
  tab.addEventListener('keydown',event=>{
   const key=event.key;let next;
   if(key==='ArrowRight')next=(i+1)%tabs.length;
   if(key==='ArrowLeft')next=(i+tabs.length-1)%tabs.length;
   if(key==='Home')next=0;if(key==='End')next=tabs.length-1;
   if(next!==undefined){event.preventDefault();activate(next,true);history.replaceState(null,'',tabs[next].hash);}
  });
 });
 let firstInvalid=false;
 form.addEventListener('invalid',event=>{
  if(firstInvalid)return;
  firstInvalid=true;setTimeout(()=>{firstInvalid=false;},0);
  const index=panels.findIndex(panel=>panel.contains(event.target));
  if(index>=0)activate(index);
 },true);
 const initial=tabs.findIndex(tab=>tab.hash===location.hash);
 const message=document.querySelector('.feedback-error')?.textContent??'';
 const errorPanel=/workload|daily limit/.test(message)?2:/working day|Closing time|time zone|opening time/.test(message)?1:0;
 activate(message?errorPanel:initial<0?0:initial);
 addEventListener('hashchange',()=>{const i=tabs.findIndex(tab=>tab.hash===location.hash);if(i>=0)activate(i);});
}
