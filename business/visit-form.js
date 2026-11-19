'use strict';
const date = document.querySelector('[data-date]');
if (date) {
  const form = date.form;
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
    const rows = [[model.name,cents]];
    for (const option of model.options) {
      const control = form.elements.namedItem('options[' + option.id + ']');
      const quantity = control ? Number(control.value) : Math.max(option.minimum,option.included);
      const units = Math.max(0,quantity-option.included);
      if (units) rows.push([option.name,units*option.price]);
      cents += units*option.price;
      minutes += units*option.minutes;
    }
    const hours = Math.floor(minutes/60);
    const duration = [hours && hours + (hours===1?' hour':' hours'),minutes%60 && minutes%60+' min'].filter(Boolean).join(' ');
    const total = model.mode==='quote'?'Quote required':money(cents);
    for (const node of document.querySelectorAll('[data-total]')) node.textContent=total;
    for (const node of document.querySelectorAll('[data-duration]')) node.textContent=duration;
    for (const node of document.querySelectorAll('[data-area]')) node.textContent=['One-time visit',form.elements.service_area?.value].filter(Boolean).join(' / ');
    for (const list of document.querySelectorAll('[data-lines]')) {
      list.replaceChildren();
      for (const [label,value] of rows) {
        const row=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');
        dt.textContent=label;dd.textContent=money(value);row.append(dt,dd);list.append(row);
      }
    }
    document.querySelector('.mobile-summary summary').textContent='Summary · '+total+' · '+duration;
  }
  form.addEventListener('change',recalculate);
  recalculate();
}
