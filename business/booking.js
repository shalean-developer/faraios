'use strict';
const form = document.getElementById('booking-request');
if (form) {
 const fields = form.elements;
 const steps = [...form.querySelectorAll('[data-step]')];
 const progress = [...document.querySelectorAll('.booking-progress li')];
 const back = document.getElementById('booking-back');
 const next = document.getElementById('booking-continue');
 const send = document.getElementById('booking-send');
 const zone = document.getElementById('summary-zone').textContent;
 let current = 0;
 const put = (id, value) => { document.getElementById(id).textContent = value; };
 const constraints = () => {
  fields.email.setCustomValidity(!fields.email.value.trim() && !fields.phone.value.trim() ? 'Enter an email address or phone number.' : '');
  const phone = fields.phone.value.trim();
  fields.phone.setCustomValidity(phone && (!/^[+0-9 ()-]{5,40}$/.test(phone) || phone.replace(/\D/g, '').length < 5) ? 'Enter a valid phone number.' : '');
  for (const [key, min] of [['name', 2], ['address', 5], ['requirements', 10]]) {
   fields[key].setCustomValidity(fields[key].value.trim().length < min ? `Enter at least ${min} characters.` : '');
  }
  const parts = new Intl.DateTimeFormat('en-CA', {timeZone: zone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).formatToParts(new Date());
  const local = Object.fromEntries(parts.map(p => [p.type, p.value]));
  const today = `${local.year}-${local.month}-${local.day}`;
  fields.date.min = today;
  const past = fields.date.value && fields.time.value && `${fields.date.value} ${fields.time.value}` <= `${today} ${local.hour}:${local.minute}`;
  fields.time.setCustomValidity(past ? 'Choose a future preferred time in the business time zone.' : '');
 };
 const update = () => {
  const option = form.querySelector('input[name="service"]:checked');
  const price = option?.dataset.price || 'Choose a service';
  const values = {
   service: option ? option.dataset.name : 'Not selected', price,
   address: fields.address.value.trim() || 'Not entered',
   schedule: [fields.date.value, fields.time.value].filter(Boolean).join(' · ') || 'Not selected',
   requirements: fields.requirements.value.trim() || 'Not entered',
   name: fields.name.value.trim() || 'Not entered',
   email: fields.email.value.trim() || 'Not provided', phone: fields.phone.value.trim() || 'Not provided'
  };
  for (const key of ['service', 'address', 'schedule']) put(`summary-${key}`, values[key]);
  for (const id of ['selected-price', 'summary-price', 'summary-total']) put(id, price);
  for (const node of form.querySelectorAll('[data-review]')) node.textContent = values[node.dataset.review];
  constraints();
 };
 const show = (index, focus = true) => {
  current = index;
  document.querySelector('.request-summary').hidden = current === 0;
  document.querySelector('.request-layout').classList.toggle('service-selection', current === 0);
  steps.forEach((step, i) => { step.hidden = i !== current; });
  progress.forEach((item, i) => {
   if (i === current) item.setAttribute('aria-current', 'step'); else item.removeAttribute('aria-current');
   item.classList.toggle('complete', i < current);
  });
  back.hidden = current === 0;
  next.hidden = current === 0 || current === steps.length - 1;
  send.hidden = current !== steps.length - 1;
  put('step-status', `Step ${current + 1} of 5 · ${steps[current].querySelector('legend').textContent}`);
  if (focus) steps[current].querySelector('legend').focus();
 };
 const valid = (index, report = true) => {
  update();
  const invalid = [...steps[index].querySelectorAll('input, select, textarea')].find(field => !field.checkValidity());
  if (!invalid) return true;
  if (report) { show(index); invalid.reportValidity(); }
  return false;
 };
 form.noValidate = true;
 steps.forEach(step => step.querySelector('legend').tabIndex = -1);
 back.addEventListener('click', () => show(Math.max(0, current - 1)));
 next.addEventListener('click', () => { if (valid(current)) show(current + 1); });
 form.querySelectorAll('input[name="service"]').forEach(card => {
  card.addEventListener('click', () => { if (current === 0 && valid(0)) show(1); });
 });
 form.addEventListener('input', update);
 form.addEventListener('change', update);
 form.addEventListener('submit', event => {
  if (current !== 4) { event.preventDefault(); if (valid(current)) show(current + 1); return; }
  for (let i = 0; i < 4; i++) if (!valid(i)) { event.preventDefault(); return; }
 });
 const details = document.querySelector('.request-summary details');
 const media = window.matchMedia('(max-width: 900px)');
 const resize = () => { details.open = !media.matches; };
 media.addEventListener('change', resize);
 resize(); update();
 // After a server rejection, retain every field and return to the first invalid step.
 const rejected = document.querySelector('#booking [role="alert"]');
 show(rejected ? Math.max(0, steps.findIndex((step, i) => !valid(i, false))) : 0, false);
}
