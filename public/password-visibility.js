const button=document.querySelector('.password-toggle');
const password=document.getElementById('register-password');
if(button&&password){
 button.hidden=false;
 button.addEventListener('click',()=>{
  const visible=password.type==='password';
  password.type=visible?'text':'password';
  button.setAttribute('aria-label',visible?'Hide password':'Show password');
  button.setAttribute('aria-pressed',String(visible));
  button.querySelector('.eye-slash').toggleAttribute('hidden',!visible);
 });
}
