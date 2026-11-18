"use strict";
const form = document.querySelector('.task-form');
const serverError = document.getElementById('tracker-error');
if (serverError) serverError.focus();
if (form) {
 let dirty=false;
 const message=document.getElementById('tracker-validation');
 const fields=[...form.querySelectorAll('[maxlength]')];
 function validate(field) {
  const max=Number(field.getAttribute('maxlength'));
  field.setCustomValidity(new TextEncoder().encode(field.value.replace(/\r\n?/g,'\n').trim()).length>max ? `This field exceeds its ${max}-byte limit. Shorten the text before saving.` : '');
 }
 form.addEventListener('input',event=>{dirty=true;if(fields.includes(event.target))validate(event.target);if(message)message.hidden=true;});
 fields.forEach(validate);
 form.addEventListener('invalid',()=>{if(message){message.textContent='Not saved. Correct the highlighted field, then select Save task again.';message.hidden=false;}},true);
 form.addEventListener('submit',()=>{dirty=false;});
 window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
}
