'use strict';
// A local editing warning only. Persistence always uses the authenticated server.
const form = document.querySelector('.task-form');
if(form){let dirty=false;form.addEventListener('input',()=>{dirty=true;});form.addEventListener('submit',()=>{dirty=false;});window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});}
