'use strict';
// Fragments are never sent to the web server or written into access logs.
const token = new URLSearchParams(location.hash.slice(1)).get('token');
history.replaceState(null, '', location.pathname);
if (/^[a-f0-9]{64}$/.test(token || '')) {
  document.querySelector('[name="token"]').value = token;
  document.querySelector('.wl-token-form button').disabled = false;
  document.querySelector('.wl-token-help').textContent = 'Select the button above to complete your request.';
}
