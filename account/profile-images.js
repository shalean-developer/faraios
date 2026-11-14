/* Prepare bounded images locally; saving remains an explicit owner action. */
(() => {
 'use strict';
 const form=document.querySelector('form[data-profile-images]');if(!form)return;
 const limit=150000,sourceLimit=10000000,pending=new Map();let awaitingSubmit=false;
 const encode=(canvas,quality)=>new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
 async function prepare(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw Error('Choose a PNG, JPG or WebP image.');
  if(file.size>sourceLimit)throw Error('Choose an image up to 10 MB.');
  if(!window.createImageBitmap||!window.DataTransfer){if(file.size<=limit)return file;throw Error('Choose an image up to 150 KB and 2000 × 2000 pixels.');}
  const bitmap=await createImageBitmap(file);
  try{
   if(bitmap.width*bitmap.height>40000000||bitmap.width>10000||bitmap.height>10000)throw Error('Choose an image up to 40 megapixels and 10000 pixels per side.');
   if(file.size<=limit&&bitmap.width<=2000&&bitmap.height<=2000)return file;
   const canvas=document.createElement('canvas');let scale=Math.min(1,2000/bitmap.width,2000/bitmap.height);
   for(let attempt=0;attempt<9;attempt++){
    canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');if(!context)throw Error('Image preparation is unavailable. Choose an image up to 150 KB.');
    context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    for(const quality of [.9,.75,.6,.45]){
     const blob=await encode(canvas,quality);
     if(blob&&blob.type==='image/webp'&&blob.size<=limit)return new File([blob],file.name.replace(/\.[^.]*$/,'')+'.webp',{type:blob.type,lastModified:file.lastModified});
    }
    scale*=.75;
   }
   throw Error('This image could not be made small enough. Choose another image.');
  }finally{bitmap.close();}
 }
 for(const input of form.querySelectorAll('input[type=file]')){
  const status=document.createElement('small');status.id=input.id+'-status';status.setAttribute('role','status');status.setAttribute('aria-live','polite');input.insertAdjacentElement('afterend',status);input.setAttribute('aria-describedby',status.id);
  let sequence=0;
  input.addEventListener('change',()=>{
   const current=++sequence,file=input.files[0];input.setCustomValidity('');status.textContent='';
   if(!file){pending.delete(input);return;}
   status.textContent='Preparing image…';
   const task=(async()=>{
    try{
     const ready=await prepare(file);if(current!==sequence)return;
     if(ready!==file){const transfer=new DataTransfer();transfer.items.add(ready);input.files=transfer.files;}
     status.textContent=(ready===file?'Ready':'Resized and ready')+' · '+Math.ceil(ready.size/1000)+' KB';
    }catch(error){if(current!==sequence)return;const message=error instanceof Error&&error.message&&!error.message.includes('source image')?error.message:'This image could not be read. Choose another PNG, JPG or WebP.';input.setCustomValidity(message);status.textContent=message;}
    finally{if(current===sequence)pending.delete(input);}
   })();pending.set(input,task);
  });
 }
 form.addEventListener('submit',async event=>{
  if(!pending.size)return;
  event.preventDefault();if(awaitingSubmit)return;awaitingSubmit=true;const submitter=event.submitter;await Promise.allSettled([...pending.values()]);awaitingSubmit=false;
  if(form.reportValidity())form.requestSubmit(submitter);
 });
})();
