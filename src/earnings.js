import {moduleHeading,feedback} from './workspace-layout.js';

const MAX=2147483647;
const models=['fixed_per_worker','percentage_pool'];
const id=v=>typeof v==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
const integer=(v,max=MAX)=>Number.isSafeInteger(v)&&v>=0&&v<=max;
const fail=message=>{throw new Error(message);};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(v/100);
const deepFreeze=v=>{if(v&&typeof v==='object'){for(const child of Object.values(v))deepFreeze(child);Object.freeze(v);}return v;};
const columns='id,business_id,service_id,version,model,rate_cents,basis_points,cap_cents,max_minutes,basis_definition,allocation,rounding';

export function parseRand(value,{optional=false}={}){
 const raw=String(value??'').trim();if(optional&&raw==='')return null;
 if(!/^\d{1,8}(\.\d{1,2})?$/.test(raw))fail('Enter a Rand amount with at most two decimal places.');
 const [whole,fraction='']=raw.split('.'),n=BigInt(whole)*100n+BigInt(fraction.padEnd(2,'0'));
 if(n>BigInt(MAX))fail('Amount exceeds the supported limit.');return Number(n);
}
export function parseEarningsRule(form){
 const model=form.get('model');if(!models.includes(model))fail('Choose an earnings method.');
 const minutes=(form.get('max_minutes')??'').trim();
 if(minutes!==''&&(!/^\d{1,4}$/.test(minutes)||Number(minutes)<15||Number(minutes)>1440))fail('Covered duration must be 15–1440 minutes.');
 const rule={model,max_minutes:minutes===''?null:Number(minutes),rate_cents:null,basis_points:null,cap_cents:null,basis_definition:'',allocation:null,rounding:null};
 if(model==='fixed_per_worker')rule.rate_cents=parseRand(form.get('rate'),{optional:true});
 else{
  const pct=(form.get('percentage')??'').trim();
  if(pct!==''){if(!/^\d{1,3}(\.\d{1,2})?$/.test(pct))fail('Enter a percentage from 0 to 100 with at most two decimal places.');const [w,f='']=pct.split('.');rule.basis_points=Number(w)*100+Number(f.padEnd(2,'0'));if(rule.basis_points>10000)fail('Percentage cannot exceed 100.');}
  rule.cap_cents=parseRand(form.get('cap'),{optional:true});
  rule.basis_definition=(form.get('basis_definition')??'').trim();if(rule.basis_definition.length>1000)fail('Keep the eligible-value definition within 1000 characters.');
  rule.allocation=form.get('allocation')||null;rule.rounding=form.get('rounding')||null;
  if(rule.allocation!==null&&rule.allocation!=='equal')fail('Choose the supported equal team split.');
  if(rule.rounding!==null&&!['half_up','floor'].includes(rule.rounding))fail('Choose a supported rounding method.');
 }
 return rule;
}
export function earningsRuleIssues(rule){
 if(!rule||!models.includes(rule.model))return ['Choose an earnings method.'];
 const issues=[];
 if(!integer(rule.max_minutes,1440)||rule.max_minutes<15)issues.push('Set the covered duration.');
 if(rule.model==='fixed_per_worker'){
  if(!integer(rule.rate_cents))issues.push('Set the fixed amount per cleaner.');
 }else{
  if(!integer(rule.basis_points,10000))issues.push('Set the percentage.');
  if(!integer(rule.cap_cents))issues.push('Set the cap per cleaner per visit.');
  if(typeof rule.basis_definition!=='string'||!rule.basis_definition.trim()||rule.basis_definition.length>1000)issues.push('Define which labour charges, extras and discounts are eligible.');
  if(rule.allocation!=='equal')issues.push('Choose the team split.');
  if(!['half_up','floor'].includes(rule.rounding))issues.push('Choose how to round the percentage pool.');
 }
 return issues;
}
/** New-agreement scenario only. Never route an existing/recurring agreement here.
 * This returns a preview, not an earned liability or payout instruction.
 */
export function previewEarnings({businessId,serviceId,rule,eligibleCents,workerIds,durationMinutes,agreementKind}){
 if(agreementKind!=='new')fail('Use the verified existing agreement; new rules cannot recalculate it.');
 if(!id(businessId)||!id(serviceId)||rule?.business_id!==businessId||rule.service_id!==serviceId)fail('Earnings business or service scope mismatch.');
 if(!Number.isSafeInteger(rule.version)||rule.version<1)fail('Saved rule version required.');
 const issues=earningsRuleIssues(rule);if(issues.length)fail('Setup needed: '+issues.join(' '));
 if(!integer(durationMinutes,1440)||durationMinutes<15||durationMinutes>rule.max_minutes)fail('Review the job duration before agreeing earnings.');
 if(!Array.isArray(workerIds)||workerIds.length<1||workerIds.length>100||workerIds.some(v=>!id(v))||new Set(workerIds.map(v=>v.toLowerCase())).size!==workerIds.length)fail('Use 1–100 distinct cleaner references.');
 const sorted=[...workerIds].map(v=>v.toLowerCase()).sort();let pool,shares;
 if(rule.model==='fixed_per_worker'){
  pool=BigInt(rule.rate_cents)*BigInt(sorted.length);shares=sorted.map(()=>rule.rate_cents);
 }else{
  if(!integer(eligibleCents))fail('Enter the eligible labour value in integer cents.');
  const raw=BigInt(eligibleCents)*BigInt(rule.basis_points);
  pool=(raw+(rule.rounding==='half_up'?5000n:0n))/10000n;
  const base=pool/BigInt(sorted.length),remainder=pool%BigInt(sorted.length);
  shares=sorted.map((_,i)=>Math.min(Number(base+(BigInt(i)<remainder?1n:0n)),rule.cap_cents));
 }
 const total=shares.reduce((s,v)=>s+BigInt(v),0n);if(total>BigInt(MAX)||pool>BigInt(MAX))fail('Earnings exceed the supported limit.');
 return deepFreeze({kind:'preview',agreementKind:'new',businessId,serviceId,ruleVersion:rule.version,currency:'ZAR',rule:structuredClone(rule),durationMinutes,eligibleCents:rule.model==='percentage_pool'?eligibleCents:null,uncappedPoolCents:Number(pool),totalCents:Number(total),cappedOffCents:Number(pool-total),workers:sorted.map((userId,i)=>({userId,amountCents:shares[i]}))});
}
export async function listEarningsRules(client,businessId){
 const rows=[],seen=new Set();for(let start=0;;start+=500){
  const {data,error}=await client.from('business_earnings_rules').select(columns).eq('business_id',businessId).order('service_id').range(start,start+499);
  if(error||!Array.isArray(data)||data.some(r=>r.business_id!==businessId||seen.has(r.service_id)))fail('Earnings setup unavailable.');
  for(const row of data){seen.add(row.service_id);rows.push(row);}if(data.length<500)return rows;
 }
}
export async function saveEarningsRule(client,businessId,serviceId,form,existing){
 if(!id(businessId)||!id(serviceId))fail('Invalid earnings scope.');
 const payload={...parseEarningsRule(form),business_id:businessId,service_id:serviceId};let q;
 if(existing){
  if(existing.business_id!==businessId||existing.service_id!==serviceId||!Number.isSafeInteger(existing.version)||existing.version<1)fail('Earnings scope mismatch.');
  const v=form.get('version');if(!/^[1-9]\d*$/.test(v??'')||Number(v)!==existing.version){const e=new Error('This setup changed. Reopen it before saving.');e.status=409;throw e;}
  q=client.from('business_earnings_rules').update(payload).eq('business_id',businessId).eq('service_id',serviceId).eq('version',existing.version);
 }else q=client.from('business_earnings_rules').insert(payload);
 const {data,error}=await q.select('business_id,service_id');
 if(error||data?.length!==1||data[0].business_id!==businessId||data[0].service_id!==serviceId){const e=new Error('Earnings setup changed or could not be saved. Reopen and try again.');e.status=error?.code==='23505'||!error?409:422;throw e;}
}
export function templateRule(template,service){
 const choice=template?.services?.[service.cleaning_profile];return choice?{...choice,business_id:service.business_id,service_id:service.id}:null;
}
export function renderEarningsRules(business,services,rules,{owner=false,service=null,template=null,values=null,preview=null,message='',error=false}={}){
 const root='/earnings-rules?business='+encodeURIComponent(business.id),existing=service?rules.find(r=>r.service_id===service.id):null;
 const s=values??existing??(service?templateRule(template,service):null)??{};
 const heading=moduleHeading({title:'Earnings rules',business,description:'Set cleaner pay by service and preview a new job before agreeing the amount.'})+feedback(message,error);
 const note='<p class="scope">Setup and previews only. Existing agreements and recurring continuations keep their verified terms. No earnings are posted and no payouts are made here.</p>';
 if(!service)return heading+note+`<section class="panel earnings-services"><div class="earnings-service-head" aria-hidden="true"><span>Service</span><span>Method</span><span>Setup</span><span></span></div>${services.map(v=>{const r=rules.find(x=>x.service_id===v.id),p=r??templateRule(template,v),issues=earningsRuleIssues(p);return `<article class="earnings-service-row"><h2>${esc(v.name)}</h2><span>${p?.model==='percentage_pool'?'Percentage with cap':p?.model==='fixed_per_worker'?'Fixed per cleaner':'Choose a method'}</span><span>${issues.length?'Setup needed':'Ready for preview'}${r?` · v${r.version}`:''}</span><a href="${root}&amp;service=${encodeURIComponent(v.id)}">${owner?'Configure':'View'}</a></article>`;}).join('')||'<p>Add a service to the catalogue first.</p>'}</section>`;
 const raw=values?.raw??{};
 const target=root+'&amp;service='+encodeURIComponent(service.id),field=(key,label,value,type='text',extra='')=>`<div class="form-field"><label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" value="${esc(Object.hasOwn(raw,key)?raw[key]:value??'')}" ${extra}></div>`;
 const amount=v=>v==null?'':(v/100).toFixed(2),opt=(v,t,current)=>`<option value="${v}"${current===v?' selected':''}>${t}</option>`;
 const method=`<form method="get" action="/earnings-rules" class="earnings-method"><input type="hidden" name="business" value="${esc(business.id)}"><input type="hidden" name="service" value="${esc(service.id)}"><div class="form-field"><label for="method">Earnings method</label><select data-dropdown id="method" name="method" required>${opt('','Choose a method',s.model)}${opt('percentage_pool','Percentage with cap',s.model)}${opt('fixed_per_worker','Fixed per cleaner',s.model)}</select></div><button>Choose method</button></form>`;
 const setup=owner?method+(models.includes(s.model)?`<form method="post" action="${target}" class="settings-form"><input type="hidden" name="action" value="save"><input type="hidden" name="model" value="${esc(s.model)}"><input type="hidden" name="version" value="${existing?.version??''}"><div class="form-grid">${s.model==='fixed_per_worker'?field('rate','Fixed amount per cleaner (R)',amount(s.rate_cents),'text','inputmode="decimal" maxlength="11"'):field('percentage','Percentage for the whole job (%)',s.basis_points==null?'':(s.basis_points/100).toFixed(2),'text','inputmode="decimal" maxlength="6"')+field('cap','Cap per cleaner per visit (R)',amount(s.cap_cents),'text','inputmode="decimal" maxlength="11"')+`<div class="form-field"><label for="allocation">Team split</label><select data-dropdown id="allocation" name="allocation">${opt('','Choose a split',s.allocation)}${opt('equal','Equal shares',s.allocation)}</select></div><div class="form-field"><label for="rounding">Round the percentage pool</label><select data-dropdown id="rounding" name="rounding">${opt('','Choose rounding',s.rounding)}${opt('half_up','Nearest cent (half up)',s.rounding)}${opt('floor','Round down to cents',s.rounding)}</select></div>`}${field('max_minutes','Maximum covered visit duration (minutes)',s.max_minutes,'number','min="15" max="1440" step="1"')} ${s.model==='percentage_pool'?`<div class="form-field form-wide"><label for="basis_definition">Eligible labour value</label><textarea id="basis_definition" name="basis_definition" maxlength="1000" rows="3">${esc(raw.basis_definition??s.basis_definition)}</textarea><small>Define included labour/extras and treatment of discounts, equipment, fees and tax. The preview uses the eligible amount you enter.</small></div>`:''}</div><p class="muted">Blank amounts remain unconfigured. Zero is an explicit amount. Changes affect new previews only.</p><div class="form-actions"><button>Save setup</button><a href="${root}">Back to services</a></div></form>`:'<p>Choose a method to configure this service.</p>'):`<p>Owner access is required to change rules.</p><dl><dt>Method</dt><dd>${esc(s.model==='percentage_pool'?'Percentage with cap':s.model==='fixed_per_worker'?'Fixed per cleaner':'Not configured')}</dd><dt>Per-cleaner amount / cap</dt><dd>${s.model==='fixed_per_worker'?(s.rate_cents==null?'Not set':money(s.rate_cents)):(s.cap_cents==null?'Not set':money(s.cap_cents))}</dd><dt>Percentage</dt><dd>${s.basis_points==null?'Not set':esc((s.basis_points/100).toFixed(2)+'%')}</dd><dt>Covered duration</dt><dd>${s.max_minutes==null?'Not set':esc(s.max_minutes)+' minutes'}</dd><dt>Eligible labour definition</dt><dd>${esc(s.basis_definition||'Not set')}</dd><dt>Team split / rounding</dt><dd>${esc(s.allocation??'Not set')} / ${esc(s.rounding??'Not set')}</dd></dl>`;
 const issues=earningsRuleIssues(existing);
 const previewForm=existing&&!issues.length?`<section class="panel editor-panel"><h2>Preview a new job</h2><p>Uses saved rule v${existing.version}. This does not change a booking or an existing agreement.</p><form method="post" action="${target}" class="settings-form"><input type="hidden" name="action" value="preview"><div class="form-grid">${existing.model==='percentage_pool'?field('eligible','Eligible labour value (R)','','text','required inputmode="decimal" maxlength="11"'):''}${field('cleaners','Number of cleaners',1,'number','required min="1" max="100" step="1"')}${field('duration','Agreed visit duration (minutes)','','number','required min="15" max="1440" step="1"')}</div><button>Calculate preview</button></form>${preview?`<div class="earnings-preview" role="status"><h3>Preview total: ${money(preview.totalCents)}</h3>${preview.workers.map((w,i)=>`<p>Cleaner ${i+1}: <strong>${money(w.amountCents)}</strong></p>`).join('')}${preview.cappedOffCents?`<p>${money(preview.cappedOffCents)} above the individual caps.</p>`:''}<p>Covered duration: ${preview.durationMinutes} minutes. Confirm scope and each cleaner's amount before acceptance.</p></div>`:''}</section>`:`<p class="scope">${existing?'Complete setup before previewing: '+esc(issues.join(' ')):'Save this service’s setup before previewing.'}</p>`;
 return heading+note+`<a class="module-back" href="${root}">← All services</a><section class="panel editor-panel"><h2>${esc(service.name)}</h2>${setup}</section>`+previewForm;
}
