(() => {
 const drawer = document.querySelector('.app-sidebar');
 const open = document.querySelector('.drawer-open');
 const close = document.querySelector('.drawer-close');
 const main = document.querySelector('main');
 const bar = document.querySelector('.app-topbar');
 const mobile = matchMedia('(max-width: 900px)');
 if (!drawer || !open || !close) return;
 let expanded = false;
 function setOpen(value, restore = true) {
  expanded = value && mobile.matches;
  open.setAttribute('aria-expanded', String(expanded));
  drawer.classList.toggle('is-open', expanded);
  drawer.inert = mobile.matches && !expanded;
  main.inert = expanded;
  bar.inert = expanded;
  document.body.classList.toggle('drawer-visible', expanded);
  if (expanded) { drawer.setAttribute('role','dialog'); drawer.setAttribute('aria-modal','true'); close.focus(); }
  else { drawer.removeAttribute('role'); drawer.removeAttribute('aria-modal'); if (restore && mobile.matches) open.focus(); }
 }
 open.addEventListener('click', () => setOpen(true));
 close.addEventListener('click', () => setOpen(false));
 document.addEventListener('keydown', event => {
  if (!expanded) return;
  if (event.key === 'Escape') { event.preventDefault(); setOpen(false); }
  if (event.key === 'Tab') {
   const items = [...drawer.querySelectorAll('a,button')];
   const first = items[0], last = items.at(-1);
   if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
   else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
 });
 mobile.addEventListener('change', () => setOpen(false, false));
 setOpen(false, false);
 document.body.classList.add('layout-enhanced');
})();
