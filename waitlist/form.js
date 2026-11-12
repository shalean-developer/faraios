'use strict';
(() => {
  const endpoint = new URL('api.php', document.currentScript.src).href;
  const page = document.querySelector('#waitlist');
  const form = page.querySelector('form');
  const status = page.querySelector('[role="status"]');
  const submit = form.querySelector('[type="submit"]');
  let csrf = '';
  let loading;
  async function prepare() {
    csrf = '';
    submit.disabled = true;
    status.textContent = 'Preparing your form…';
    try {
      const response = await fetch(endpoint, {credentials: 'same-origin', cache: 'no-store'});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Please try again shortly.');
      csrf = data.csrf;
      status.textContent = '';
      submit.disabled = false;
    } catch (error) {
      status.textContent = error.message || 'Unable to connect. Reload the page to try again.';
    }
  }
  loading = prepare();
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const fields = new FormData(form);
    const interests = fields.getAll('interests');
    if (!interests.length) {
      status.textContent = 'Choose at least one interest.';
      form.querySelector('[name="interests"]').focus();
      return;
    }
    await loading;
    if (!csrf) return;
    submit.disabled = true;
    submit.textContent = 'Joining…';
    status.textContent = '';
    try {
      const response = await fetch(endpoint, {
        method: 'POST', credentials: 'same-origin', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({name: fields.get('name'), email: fields.get('email'), business_type: fields.get('business_type'), interests, consent: fields.get('consent'), website: fields.get('website'), csrf})
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'We could not save your request. Please try again.');
      form.hidden = true;
      form.reset();
      const success = page.querySelector('.wl-success');
      success.hidden = false;
      success.querySelector('h3').focus();
    } catch (error) {
      status.textContent = error.message || 'Connection lost. Your request may have saved. You can safely try again.';
    } finally {
      submit.disabled = false;
      submit.textContent = 'Join the waitlist';
    }
  });
})();
