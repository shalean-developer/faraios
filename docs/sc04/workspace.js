/* Keep transient drafts in the current page only; never replay a submission. */
(() => {
  'use strict';
  let pending = false;
  const showError = (form, message) => {
    let alert = form.querySelector('[data-connection-error]');
    if (!alert) {
      alert = document.createElement('p');
      alert.className = 'alert';
      alert.dataset.connectionError = '';
      alert.setAttribute('role', 'alert');
      alert.tabIndex = -1;
      form.prepend(alert);
    }
    alert.textContent = message;
    alert.focus();
  };
  document.addEventListener('submit', async event => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !form.closest('.workspace-content') || form.method.toLowerCase() !== 'post') return;
    event.preventDefault();
    if (pending) return;
    if (!navigator.onLine) {
      showError(form, 'You are offline. Your input is still here. Reconnect before submitting again. Nothing was sent.');
      return;
    }
    const destination = new URL(form.getAttribute('action') || location.href, location.href);
    if (destination.origin !== location.origin) return;
    const body = new URLSearchParams(new FormData(form));
    const buttons = [...form.querySelectorAll('button[type="submit"], input[type="submit"]')];
    const disabled = buttons.map(button => button.disabled);
    pending = true;
    buttons.forEach(button => { button.disabled = true; });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(destination, { method: 'POST', body, credentials: 'same-origin', signal: controller.signal });
      const target = new URL(response.url);
      if (target.origin !== location.origin) throw new Error('Unexpected origin');
      if (response.redirected) { location.assign(target.href); return; }
      if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) throw new Error('Unexpected response');
      const html = await response.text();
      if (!/^\s*<!doctype html>/i.test(html)) throw new Error('Incomplete response');
      // Render only the same-origin PHP response, including its server-side auth,
      // CSRF, validation and stale-version handling. No client approval bypass.
      document.open();
      document.write(html);
      document.close();
    } catch (_) {
      showError(form, 'Connection lost. Your input is still here. The request may have saved: reconnect and check the records before submitting again. It will not be sent automatically.');
    } finally {
      clearTimeout(timeout);
      pending = false;
      buttons.forEach((button, index) => { button.disabled = disabled[index]; });
    }
  });
})();
