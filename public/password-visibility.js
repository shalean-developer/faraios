document.querySelectorAll('.password-toggle').forEach(button=>{
 const password=document.getElementById(button.getAttribute('aria-controls'));
 if(!password)return;
 button.hidden=false;
 button.addEventListener('click',()=>{
  const visible=password.type==='password';
  password.type=visible?'text':'password';
  button.setAttribute('aria-label',visible?'Hide password':'Show password');
  button.setAttribute('aria-pressed',String(visible));
  button.querySelector('.eye-slash')?.toggleAttribute('hidden',!visible);
 });
});
