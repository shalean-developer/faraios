// Progressive enhancement: the full reference remains available without scripts.
export function enhanceReference(root,{clipboard=globalThis.navigator?.clipboard}={}){
 const button=root.querySelector('[data-copy-reference]'),input=root.querySelector('input[readonly]'),details=root.querySelector('details'),status=root.querySelector('[role="status"]');
 if(!button||!input||!details||!status||button.dataset.enhanced)return;
 button.dataset.enhanced='true';button.hidden=false;
 button.addEventListener('click',async()=>{
  button.disabled=true;
  try{
   if(!clipboard?.writeText)throw new Error('Clipboard unavailable');
   await clipboard.writeText(input.value);status.textContent='Reference copied.';
  }catch{
   details.open=true;input.focus();input.select();status.textContent='Copy unavailable. The full reference is selected; copy it manually.';
  }finally{button.disabled=false;}
 });
}
if(typeof document!=='undefined')for(const root of document.querySelectorAll('[data-quote-reference]'))enhanceReference(root);
