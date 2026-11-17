'use strict';
// Server validation is a new page: put keyboard recovery at its first error.
(() => {
 const alert = document.querySelector('main .alert[role="alert"]');
 if (!alert) return;
 alert.setAttribute('tabindex', '-1');
 alert.focus();
 // Fragment navigation can reset focus after deferred scripts have run.
 // Retry after load, but never take focus back from a control the user chose.
 const recover = () => setTimeout(() => {
  if (document.activeElement === document.body) alert.focus();
 }, 0);
 if (document.readyState === 'complete') recover();
 else window.addEventListener('load', recover, {once: true});
})();
