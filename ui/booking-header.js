/* Booking header: only a minimal same-origin account indicator is requested. */
(() => {
 'use strict';
 const header=document.querySelector('.booking-header');
 if(!header)return;
 const measure=()=>document.documentElement.style.setProperty('--booking-header-height',header.getBoundingClientRect().height+'px');
 measure();new ResizeObserver(measure).observe(header);
 const identity=header.querySelector('[data-header-session]');
 if(!identity)return;
 identity.addEventListener('click',event=>{
  const link=event.target.closest('a');if(!link)return;
  const target=new URL(link.href,location.href),current=new URL(location.href);
  if(target.origin!==location.origin||!target.pathname.endsWith('/account/customer.php')||current.searchParams.get('booking')!=='1')return;
  const step=current.searchParams.get('step');
  target.searchParams.set('return',['service','details','schedule','contact','review'].includes(step)?'booking-'+step:'booking');link.href=target.href;
 });
 const endpoint=new URL(identity.dataset.headerSession,location.href);
 if(endpoint.origin!==location.origin)return;
 fetch(endpoint,{credentials:'same-origin',cache:'no-store',redirect:'error',headers:{Accept:'application/json'}})
 .then(response=>response.ok?response.json():null)
 .then(data=>{
  if(!data?.authenticated||typeof data.initials!=='string'||data.initials.length>8)return;
  const link=document.createElement('a');link.href=identity.dataset.accountUrl;link.className='booking-user-avatar';link.setAttribute('aria-label','Your account');link.title='Your account';link.textContent=data.initials;
  identity.replaceChildren(link);
 }).catch(()=>{});
})();
