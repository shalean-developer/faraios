'use strict';
// Server validation is a new page: put keyboard recovery at its first error.
(() => {
 const alert = document.querySelector('main .alert[role="alert"]');
 if (alert) { alert.setAttribute('tabindex', '-1'); alert.focus(); }
})();
