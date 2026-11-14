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
const extraIcon = name => {
 const key=name.toLowerCase();
 const paths=/fridge|refrigerator/.test(key)?['M7 3h18v26H7z','M7 13h18M11 7v3m0 7v5']:
 /oven/.test(key)?['M6 4h20v24H6z','M6 10h20M10 14h12v9H10z','M10 7h1m4 0h1m4 0h1']:
 /cabinet|cupboard/.test(key)?['M5 4h22v24H5z','M5 16h22M16 4v24M12 10h1m6 0h1m-8 12h1m6 0h1']:
 /window/.test(key)?['M5 4h22v24H5z','M16 4v24M5 16h22']:
 /wall/.test(key)?['M4 7h24v18H4z','M4 13h24M4 19h24M12 7v6m9-6v6M8 13v6m10-6v6m-6 0v6m9-6v6']:
 /plant|water/.test(key)?['M16 28V14','M16 18C5 18 4 12 4 7c8 0 12 3 12 11Z','M16 14C16 6 23 4 28 4c0 8-4 12-12 12']:
 /iron|shirt/.test(key)?['m10 5-7 5 4 6 4-3v15h10V13l4 3 4-6-7-5','M11 5c0 5 10 5 10 0']:
 /laundry|wash/.test(key)?['M6 3h20v26H6z','M6 9h20M10 6h1m4 0h1','M22 19a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z','M11 18c4-3 6 4 10 0']:
 /flatlet|house|cottage/.test(key)?['m3 15 13-11 13 11M7 12v16h18V12M13 28V18h6v10']:
 ['M16 4v24M4 16h24','m7 7 18 18M25 7 7 25'];
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.setAttribute('viewBox','0 0 32 32');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.5');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
 for(const d of paths){const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',d);svg.append(path);}return svg;
};
const rebuildOptions = service => {
 for (const [id,input] of optionInputs) remembered[id] = input.value;
 optionInputs.clear(); optionPanel.replaceChildren(); activeService = service?.id || '';
 const options = service?.options || [];
 for (const [title,kinds] of [['Rooms',['bedrooms','bathrooms']],['Extra rooms',['room']],['Extras',['extra','toggle']]]) {
  const group = options.filter(o => kinds.includes(o.kind)); if (!group.length) continue;
  const section = document.createElement('section'); section.className = 'booking-option-group';
  const heading = document.createElement('h3'); heading.textContent = title; section.append(heading);
  const tiles=document.createElement('div');tiles.className='extra-task-grid';if(kinds.includes('toggle'))section.append(tiles);
  for (const o of group) {
   const row = document.createElement('div'); row.className = 'booking-option';
   const label = document.createElement('label'); label.htmlFor = `quantity-${o.id}`; label.textContent = o.name;
   const hint = document.createElement('small'); hint.textContent = `${o.included} included · +${money(o.price)} per additional unit${o.minutes ? ` · +${o.minutes} min` : ''}`;
   const input = document.createElement('input'); input.type='number'; input.id=`quantity-${o.id}`; input.name=`options[${o.id}]`; input.min=o.minimum; input.max=o.maximum; input.step=1; input.required=true;
   input.value = String(Math.max(o.minimum, Math.min(o.maximum, Number(remembered[o.id] ?? Math.max(o.minimum,o.included)))));
   optionInputs.set(o.id,input);
   if (o.kind === 'toggle') {
    input.type='hidden'; const button=document.createElement('button');button.type='button';button.className='extra-choice';
    row.classList.add('extra-task');
    const circle=document.createElement('span');circle.className='extra-task-circle';circle.append(extraIcon(o.name));
    const caption=document.createElement('span');caption.className='extra-task-label';caption.textContent=o.name;button.append(circle,caption);hint.className='extra-task-hint';
    const refresh=()=>{const selected=input.value==='1';const description=`${o.name} · ${o.included>=1?'Included':'+'+money(o.price)}`;button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',description);button.title=`${description}${o.minutes?' · +'+o.minutes+' min':''}`;};
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
   }if(o.kind==='toggle')tiles.append(row);else section.append(row);
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
 return {price,options:selected.join(', ')||'None selected',breakdown:lines.join('\n'),duration:[Math.floor(minutes/60)?`${Math.floor(minutes/60)} hr`:'',minutes%60?`${minutes%60} min`:''].filter(Boolean).join(' ') || '0 min'};
};

 const put = (id, value) => { document.getElementById(id).textContent = value; };
 const constraints = () => {
  fields.email.setCustomValidity(!fields.email.value.trim() && !fields.phone.value.trim() ? 'Enter an email address or phone number.' : '');
  const phone = fields.phone.value.trim();
  fields.phone.setCustomValidity(phone && (!/^[+0-9 ()-]{5,40}$/.test(phone) || phone.replace(/\D/g, '').length < 5) ? 'Enter a valid phone number.' : '');
  for (const [key, min] of [['name', 2], ['address', 5], ['requirements', 0]]) {
   fields[key].setCustomValidity(fields[key].value.trim().length < min ? `Enter at least ${min} characters.` : '');
  }
  const noteLength=(fields.requirements.value.trim() ? ('Notes or instructions: '+fields.requirements.value.trim()).length : 'No additional instructions.'.length)+(fields.service_area?.value ? ('Service area: '+fields.service_area.value+'\n\n').length : 0);
  if(noteLength>2000)fields.requirements.setCustomValidity('Shorten your notes or instructions to fit the selected service area.');
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
   area: fields.service_area?.value || 'Not selected',
   address: [fields.address.value.trim(), fields.unit.value.trim()].filter(Boolean).join(', ') || 'Not entered',
   schedule: [fields.date.value, fields.time.value].filter(Boolean).join(' · ') || 'Not selected',
   requirements: fields.requirements.value.trim() || 'None',
   name: fields.name.value.trim() || 'Not entered',
   email: fields.email.value.trim() || 'Not provided', phone: fields.phone.value.trim() || 'Not provided'
  };
  for (const key of ['service', 'address', 'schedule', 'area']) put(`summary-${key}`, values[key]);
  for (const id of ['selected-price', 'summary-price', 'summary-total']) put(id, price);
  for (const node of form.querySelectorAll('[data-review]')) node.textContent = values[node.dataset.review];
  document.getElementById('summary-where-row').hidden = !fields.address.value.trim() && !fields.service_area?.value;
  document.getElementById('summary-what-row').hidden = !service;
  document.getElementById('summary-when-row').hidden = !fields.date.value && !fields.time.value;
  put('summary-address', [fields.address.value.trim(), fields.unit.value.trim()].filter(Boolean).join(', '));
  put('summary-area', fields.service_area?.value || '');
  document.getElementById('summary-options').hidden = calculated.options === 'None selected';
  if(fields.date.value) {
   const date = new Date(fields.date.value+'T12:00:00');
   put('summary-schedule', [new Intl.DateTimeFormat('en-ZA',{weekday:'short',day:'numeric',month:'short'}).format(date),fields.time.value].filter(Boolean).join(' · '));
  }
  const breakdown=document.getElementById('review-breakdown');breakdown.replaceChildren();
  if(service?.mode==='quote'){const p=document.createElement('p');p.textContent='The business will provide a quote for your selected service, rooms and extras.';breakdown.append(p);}
  else for(const line of calculated.breakdown.split('\n')){
   const row=document.createElement('div');row.className='review-price-line';const split=line.lastIndexOf(': ');
   const label=document.createElement('span'),amount=document.createElement('span');label.textContent=split<0?line:line.slice(0,split);amount.textContent=split<0?'':line.slice(split+2);row.append(label,amount);breakdown.append(row);
  }
  put('review-total-label',service?.mode==='quote'?'Pricing':service?.mode==='from'?'Estimated total from':'Estimated total');
  put('review-duration',calculated.duration);
  put('review-schedule',document.getElementById('summary-schedule').textContent);
  document.getElementById('review-notes-section').hidden=!fields.requirements.value.trim();
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
 document.querySelectorAll('[data-summary-edit]').forEach(button => button.addEventListener('click', () => {
  show(Number(button.dataset.summaryEdit));
 }));
 const costToggle = document.getElementById('summary-cost-toggle');
 costToggle.addEventListener('click', () => {
  const expanded = costToggle.getAttribute('aria-expanded') !== 'true';
  costToggle.setAttribute('aria-expanded', String(expanded));
  document.getElementById('summary-cost-details').hidden = !expanded;
 });
 const details = document.querySelector('.summary-shell');
 const media = window.matchMedia('(max-width: 900px)');
 const resize = () => { details.open = !media.matches; };
 media.addEventListener('change', resize);
 resize(); update();
 // After a server rejection, retain every field and return to the first invalid step.
 const rejected = document.querySelector('#booking [role="alert"]');
 show(rejected ? Math.max(0, steps.findIndex((step, i) => !valid(i, false))) : 0, false);
}
