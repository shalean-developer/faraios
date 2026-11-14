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
const catalogue = JSON.parse(document.getElementById('booking-catalogue').textContent);
const remembered = JSON.parse(document.getElementById('booking-selections').textContent);
const optionPanel = document.getElementById('booking-options');
let activeService = '';
const money = n => `${catalogue.currency} ${(n / 100).toLocaleString('en',{minimumFractionDigits:['JPY','UGX','RWF'].includes(catalogue.currency)?0:2,maximumFractionDigits:2})}`;
const optionInputs = new Map();
const rebuildOptions = service => {
 for (const [id,input] of optionInputs) remembered[id] = input.value;
 optionInputs.clear(); optionPanel.replaceChildren(); activeService = service?.id || '';
 const options = service?.options || [];
 for (const [title,kinds] of [['Rooms',['bedrooms','bathrooms']],['Extra rooms',['room']],['Extras',['extra','toggle']]]) {
  const group = options.filter(o => kinds.includes(o.kind)); if (!group.length) continue;
  const section = document.createElement('section'); section.className = 'booking-option-group';
  const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
  for (const o of group) {
   const row = document.createElement('div'); row.className = 'booking-option';
   const label = document.createElement('label'); label.htmlFor = `quantity-${o.id}`; label.textContent = o.name;
   const hint = document.createElement('small'); hint.textContent = `${o.included} included · +${money(o.price)} per additional unit${o.minutes ? ` · +${o.minutes} min` : ''}`;
   const input = document.createElement('input'); input.type='number'; input.id=`quantity-${o.id}`; input.name=`options[${o.id}]`; input.min=o.minimum; input.max=o.maximum; input.step=1; input.required=true;
   input.value = String(Math.max(o.minimum, Math.min(o.maximum, Number(remembered[o.id] ?? Math.max(o.minimum,o.included)))));
   optionInputs.set(o.id,input);
   if (o.kind === 'toggle') {
    input.type='hidden'; const button=document.createElement('button');button.type='button';button.className='extra-choice';
    const refresh=()=>{button.setAttribute('aria-pressed',input.value==='1'?'true':'false');button.textContent=`${input.value==='1'?'✓ ':''}${o.name} · ${o.included>=1?'Included':'+'+money(o.price)}`;};
    button.addEventListener('click',()=>{input.value=input.value==='1'&&o.minimum===0?'0':'1';refresh();update();});refresh();row.append(button,input,hint);
   } else {
    const controls=document.createElement('div');controls.className='quantity-controls';
    for(const delta of [-1,1]){const button=document.createElement('button');button.type='button';button.textContent=delta===-1?'−':'+';button.setAttribute('aria-label',`${delta===-1?'Decrease':'Increase'} ${o.name}`);button.addEventListener('click',()=>{input.value=String(Math.max(o.minimum,Math.min(o.maximum,Number(input.value)+delta)));update();});if(delta===-1)controls.append(button,input);else controls.append(button);}
    const presets=document.createElement('div');presets.className='quantity-presets';presets.setAttribute('role','group');presets.setAttribute('aria-label',o.name);
    const buttons=[];let custom=false;
    const refresh=()=>{const q=Number(input.value);buttons.forEach(([button,value])=>button.setAttribute('aria-pressed',String(value===q&&!custom)));controls.hidden=!custom&&q<=o.minimum+2;};
    for(let q=o.minimum;q<=Math.min(o.maximum,o.minimum+2);q++){const button=document.createElement('button');button.type='button';button.textContent=String(q);buttons.push([button,q]);button.addEventListener('click',()=>{custom=false;input.value=String(q);refresh();update();});presets.append(button);}
    if(o.maximum>o.minimum+2){const button=document.createElement('button');button.type='button';button.textContent=`${o.minimum+3}+ Custom`;button.addEventListener('click',()=>{custom=true;if(Number(input.value)<o.minimum+3)input.value=String(o.minimum+3);refresh();update();input.focus();});presets.append(button);}
    input.addEventListener('input',()=>{custom=true;refresh();});refresh();row.append(label,presets,controls,hint);
   }section.append(row);
  }optionPanel.append(section);
 }
};
const calculateOptions = service => {
 if(activeService !== (service?.id||''))rebuildOptions(service);
 if(!service)return {price:'Choose a service',options:'None selected',breakdown:'Not selected',duration:'Not selected'};
 let total=service.amount||0,minutes=service.duration;const selected=[],lines=[`${service.name}: ${service.mode==='quote'?'Quote required':money(total)}`];
 for(const o of service.options||[]){const q=Number(optionInputs.get(o.id).value);const charge=Math.max(0,q-o.included);total+=charge*o.price;minutes+=charge*o.minutes;if(q>0)selected.push(`${o.name} × ${q}`);if(charge>0)lines.push(`${o.name} × ${charge}: ${money(charge*o.price)}`);}
 const invalid=total>999999999||minutes>10080;
 for(const input of optionInputs.values())input.setCustomValidity(invalid?'Selected scope exceeds supported price or duration.':'');
 const price=service.mode==='quote'?'Quote required':`${service.mode==='from'?'From ':''}${money(total)}`;
 return {price,options:selected.join(', ')||'None selected',breakdown:lines.join('\n'),duration:`${minutes} minutes`};
};

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
  const service = catalogue.items.find(s=>s.id===option?.value);
  const calculated = calculateOptions(service);
  const price = calculated.price;
  put('summary-options',calculated.options);put('summary-breakdown',calculated.breakdown);put('summary-duration',calculated.duration);
  const values = {
   service: option ? option.dataset.name : 'Not selected', price, options:calculated.options,
   address: [fields.address.value.trim(), fields.unit.value.trim()].filter(Boolean).join(', ') || 'Not entered',
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
