'use strict';
const directoryForm=document.getElementById('directory-filters');
const directoryLoading=document.getElementById('directory-loading');
if(directoryForm&&directoryLoading){
 directoryForm.addEventListener('submit',()=>{directoryLoading.hidden=false;directoryForm.setAttribute('aria-busy','true');});
 window.addEventListener('pageshow',()=>{directoryLoading.hidden=true;directoryForm.removeAttribute('aria-busy');});
}
