import {dateTimeField} from './date-time-field.js';
import {escapeHtml as esc} from './workspace-layout.js';

export function parseVatSettings(form){
 const enabled=form.get('vat_enabled'),version=Number(form.get('vat_version'));
 const number=(form.get('vat_number')??'').trim(),date=form.get('vat_registration_date')??'',reason=(form.get('vat_reason')??'').trim();
 if(!['yes','no'].includes(enabled)||!/^(0|[1-9][0-9]*)$/.test(form.get('vat_version')??'')||!Number.isSafeInteger(version)||version<0)throw new Error('Reopen VAT settings and choose On or Off.');
 if(reason.length<1||reason.length>500||form.get('vat_confirmed')!=='yes')throw new Error('Record a reason and confirm the VAT setting matches the business registration.');
 if(enabled==='yes'&&(!/^4\d{9}$/.test(number)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))throw new Error('Enter a valid South African VAT number and registration date.');
 return {p_version:version,p_enabled:enabled==='yes',p_vat_number:enabled==='yes'?number:null,p_registration_date:enabled==='yes'?date:null,p_reason:reason,p_confirmed:true};
}
export async function readVatSettings(client,businessId){
 const {data,error}=await client.from('business_vat_settings').select('business_id,enabled,vat_number,registration_date,version').eq('business_id',businessId).maybeSingle();
 if(error||data&&data.business_id!==businessId)throw new Error('VAT settings unavailable');return data;
}
export async function saveVatSettings(client,businessId,form){
 const {data,error}=await client.rpc('configure_business_vat',{...parseVatSettings(form),p_business_id:businessId});
 if(error)throw Object.assign(new Error(error.code==='40001'?'VAT settings changed. Reopen the page before saving.':error.code==='42501'?'Settings access denied':error.code==='P0001'?error.message:'VAT settings could not be saved.'),{status:error.code==='40001'?409:error.code==='42501'?403:422});
 if(!Number.isSafeInteger(data)||data<1)throw new Error('VAT settings could not be confirmed');return data;
}
export function renderVatSettings(business,policy){
 const p=policy??{};
 return `<section class="panel editor-panel"><h2>VAT</h2><p>Prices are customer totals. When VAT is on, the total includes 15% VAT; switching this setting does not add 15% to catalogue prices. Review your prices before using a changed registration.</p><form class="settings-form" method="post" action="/vat-settings?business=${encodeURIComponent(business.id)}"><input type="hidden" name="vat_version" value="${esc(p.version??0)}"><label for="vat_enabled">Charge VAT on new agreements</label><select data-dropdown id="vat_enabled" name="vat_enabled"><option value="no"${!p.enabled?' selected':''}>Off — no VAT charged</option><option value="yes"${p.enabled?' selected':''}>On — VAT included</option></select><div class="form-grid"><div class="form-field"><label for="vat_number">South African VAT number (required when on)</label><input id="vat_number" name="vat_number" inputmode="numeric" maxlength="10" pattern="4[0-9]{9}" value="${esc(p.vat_number??'')}"></div><div class="form-field">${dateTimeField({id:'vat_registration_date',label:'Registration effective date (required when on)',value:p.registration_date??'',required:false})}</div></div><label for="vat_reason">Reason for this change</label><textarea id="vat_reason" name="vat_reason" maxlength="500" required></textarea><label class="invoice-confirm"><input type="checkbox" name="vat_confirmed" value="yes" required> I confirm this setting matches the business’s current VAT registration.</label><p class="muted">Only an owner can change VAT. Saved quotes, recurring agreements, bookings and invoice drafts retain their original amounts and VAT details. An old quote needs a new draft if the VAT setting changes before issue. VAT accounting sync needs separate verification.</p><button>Save VAT setting</button></form></section>`;
}
export function renderVatSummary(tax){
 if(!tax)return '<p class="muted">VAT status was not captured for this saved agreement. Review before issuing an accounting document.</p>';
 if(!tax.enabled)return '<p class="muted">No VAT charged on this agreement.</p>';
 const money=c=>new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(c/100);
 return `<p class="muted">Includes VAT at 15%: ${esc(money(tax.vat_cents))}. Amount excluding VAT: ${esc(money(tax.net_cents))}. VAT number: ${esc(tax.vat_number)}.</p>`;
}
