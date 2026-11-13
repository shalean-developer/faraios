'use strict';
const form=document.getElementById('booking-request');
if(form){
 const service=form.elements.service;
 const put=(id,value)=>{document.getElementById(id).textContent=value;};
 const update=()=>{const option=service.selectedOptions[0];const price=option?.dataset.price||'Choose a service';put('summary-service',service.value?option.textContent:'Not selected');put('summary-address',form.elements.address.value.trim()||'Not entered');put('summary-schedule',[form.elements.date.value,form.elements.time.value].filter(Boolean).join(' · ')||'Not selected');for(const id of ['selected-price','summary-price','summary-total'])put(id,price);};
 form.addEventListener('input',update);form.addEventListener('change',update);update();
 const details=document.querySelector('.request-summary details');const media=window.matchMedia('(max-width: 700px)');const resize=()=>{details.open=!media.matches;};media.addEventListener('change',resize);resize();
}
