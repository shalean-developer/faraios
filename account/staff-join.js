'use strict';
// Fragment stays out of HTTP logs. Opening a link never accepts an invitation.
function captureInvitation() {
  const params = new URLSearchParams(location.hash.slice(1));
  const id = params.get('id') || '';
  const token = params.get('token') || '';
  history.replaceState(null, '', location.pathname);
  if (/^[a-f0-9-]{36}$/.test(id) && /^[a-f0-9]{64}$/.test(token)) {
    document.getElementById('invitation').value = id;
    document.getElementById('token').value = token;
    document.getElementById('continue').disabled = false;
    document.getElementById('continue').textContent = 'Sign in';
    document.getElementById('create-account').disabled = false;
    document.getElementById('join-capture').hidden = false;
    document.querySelector('.join-current').hidden = true;
  }
}
captureInvitation();
window.addEventListener('hashchange', captureInvitation);
