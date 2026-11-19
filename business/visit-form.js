'use strict';
const date = document.querySelector('[data-date]');
if (date) {
  const form = date.form;
  const syncStart = () => {
    const start = form.querySelector('[name=time]:checked');
    const day = new Date(date.value + 'T12:00:00Z');
    const selected = Boolean(start && Number.isFinite(day.getTime()));
    const formatted = selected ? day.toLocaleDateString('en-GB', {weekday:'short', day:'numeric', month:'short', timeZone:'UTC'}).replace(',', '') : '';
    const value = selected ? formatted + ' @ ' + start.value + ' SAST' : '';
    for (const row of document.querySelectorAll('[data-summary-time-row]')) row.hidden = !selected;
    for (const node of document.querySelectorAll('[data-summary-when]')) node.textContent = value;
  };
  for (const start of form.querySelectorAll('[name=time]')) start.addEventListener('change', syncStart);
  syncStart();
  const updateDate = () => {
    if (!date.value || !date.validity.valid) return;
    for (const radio of form.querySelectorAll('[name=time]')) radio.disabled = true;
    form.requestSubmit();
  };
  form.querySelector('[data-date-fallback]').hidden = true;
  date.addEventListener('change', updateDate);
  for (const button of form.querySelectorAll('[data-alternative]')) {
    button.addEventListener('click', () => { date.value = button.dataset.alternative; updateDate(); });
  }
  const dialog = form.querySelector('dialog');
  if (dialog) {
    dialog.close();dialog.showModal();
    dialog.querySelector('[data-close]').addEventListener('click', () => dialog.close());
  }
}
const pricing = document.querySelector('#visit-pricing');
if (pricing) {
  const model = JSON.parse(pricing.textContent);
  const form = document.querySelector('form');
  const money = cents => 'ZAR ' + (cents/100).toFixed(2);
  function recalculate() {
    let cents = Number(model.amount), minutes = Number(model.duration);
    for (const option of model.options) {
      const control = form.elements.namedItem('options[' + option.id + ']');
      const quantity = control ? Number(control.value) : Math.max(option.minimum,option.included);
      const units = Math.max(0,quantity-option.included);
      cents += units*option.price;
      minutes += units*option.minutes;
    }
    const hours = Math.floor(minutes/60);
    const duration = [hours && hours + (hours===1?' hour':' hours'),minutes%60 && minutes%60+' min'].filter(Boolean).join(' ');
    const total = model.mode==='quote'?'Quote required':money(cents);
    for (const node of document.querySelectorAll('[data-total]')) node.textContent=total;
    for (const node of document.querySelectorAll('[data-duration]')) node.textContent=duration;
  }
  function updateAddress() {
    const address = ['address','unit','service_area'].map(name => form.elements.namedItem(name).value.trim()).filter(Boolean).join(', ');
    for (const node of document.querySelectorAll('[data-summary-address]')) node.textContent = address || 'Add address';
  }
  for (const name of ['address','unit','service_area']) {
    const field = form.elements.namedItem(name);
    field.addEventListener('input', updateAddress);
    field.addEventListener('change', updateAddress);
  }
  updateAddress();
  form.addEventListener('change',recalculate);
  recalculate();
}

const contact = document.getElementById('visit-contact');
if (contact && typeof contact.showModal === 'function') {
  const form = contact.closest('form');
  const trigger = form.querySelector('[data-contact-trigger]');
  const fields = contact.querySelector('[data-contact-fields]');
  const back = contact.querySelector('[data-contact-close]');
  contact.removeAttribute('open');
  fields.disabled = true;
  trigger.hidden = back.hidden = false;

  form.addEventListener('submit', event => {
    if (contact.open) return;
    event.preventDefault();
    fields.disabled = false;
    contact.showModal();
    fields.querySelector('input').focus();
  });
  back.addEventListener('click', () => contact.close());
  contact.addEventListener('close', () => {
    if (contact.open) return;
    fields.disabled = true;
    trigger.focus();
  });
}
