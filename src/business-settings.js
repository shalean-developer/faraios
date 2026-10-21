import {renderVatSettings} from './vat.js';
import {moduleHeading,feedback} from './workspace-layout.js';
import {dateTimeField} from './date-time-field.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function parseBusinessSettings(form){
 const text=(key,max,required=false)=>{const v=(form.get(key)??'').trim();if((required&&!v)||v.length>max)throw new Error(`Check ${key.replaceAll('_',' ')}.`);return v;};
 const display_name=text('display_name',160,true),contact_email=text('contact_email',254),contact_phone=text('contact_phone',40);
 if(contact_email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact_email))throw new Error('Enter a valid contact email.');
 const service_areas=[...new Set(text('service_areas',4000).split(/\r?\n/).map(v=>v.trim()).filter(Boolean))];
 if(service_areas.length>50||service_areas.some(v=>v.length>100))throw new Error('Use at most 50 service areas, each up to 100 characters.');
 const working_days=[...new Set(form.getAll('working_days').map(v=>{if(!/^[0-6]$/.test(v))throw new Error('Select valid working days.');return Number(v);}))].sort();
 if(!working_days.length)throw new Error('Select at least one working day.');
 const opens_at=text('opens_at',5,true),closes_at=text('closes_at',5,true);
 const valid=v=>/^([01]\d|2[0-3]):[0-5]\d$/.test(v);
 if(!valid(opens_at)||!valid(closes_at)||opens_at>=closes_at)throw new Error('Closing time must be later than opening time on the same day.');
 const time_zone=text('time_zone',64,true);if(!['Africa/Johannesburg','UTC'].includes(time_zone))throw new Error('Select a supported time zone.');
 const daily=(form.get('max_daily_minutes')??'').trim();if(daily&&!/^(?:[1-9][0-9]{0,3})$/.test(daily)||daily&&(Number(daily)<15||Number(daily)>1440))throw new Error('Enter a daily workload limit from 15 to 1440 minutes, or leave blank.');
 return {...(form.has('max_daily_minutes')?{max_daily_minutes:daily?Number(daily):null}:{}),display_name,contact_email,contact_phone,service_areas,working_days,opens_at,closes_at,time_zone};
}
export async function readBusinessSettings(client,businessId){
 const {data,error}=await client.from('business_settings').select('display_name,contact_email,contact_phone,service_areas,working_days,opens_at,closes_at,time_zone,max_daily_minutes').eq('business_id',businessId).maybeSingle();
 if(error)throw new Error('Settings unavailable');return data;
}
export async function saveBusinessSettings(client,businessId,settings){
 const {data,error}=await client.from('business_settings').upsert({...settings,business_id:businessId},{onConflict:'business_id'}).select('business_id');
 if(error||data?.length!==1||data[0].business_id!==businessId)throw new Error('Settings could not be saved');
}
export function renderBusinessSettings(business,settings={},message='',error=false,vat=null){
 const s=settings??{};
 const input=(key,label,type='text',max=160)=>`<div class="form-field">${type==='time'?dateTimeField({id:key,label,kind:'time',value:String(s[key]??'').slice(0,5),required:true}):`<label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" maxlength="${max}" value="${esc(s[key])}"${key==='display_name'?' required':''}>`}</div>`;
 return moduleHeading({title:'Business settings',business,description:'Manage your business contact details, service areas and working hours.'})+feedback(message,error)+`<form class="settings-form business-settings-form" method="post" action="/settings?business=${encodeURIComponent(business.id)}"><section class="panel editor-panel"><h2>Business details</h2><div class="form-grid">${input('display_name','Display name')}${input('contact_email','Contact email','email',254)}${input('contact_phone','Contact phone','tel',40)}<div class="form-field form-wide"><label for="service_areas">Service areas</label><textarea id="service_areas" name="service_areas" rows="4" maxlength="4000" aria-describedby="areas-help">${esc(Array.isArray(s.service_areas)?s.service_areas.join('\n'):s.service_areas)}</textarea><small id="areas-help">Enter one area per line.</small></div></div></section><section class="panel editor-panel"><h2>Working hours</h2><p class="muted">One opening interval applies to the selected days. Overnight and split shifts are not supported yet.</p><fieldset class="weekday-options"><legend>Working days</legend>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,i)=>`<label class="day"><input type="checkbox" name="working_days" value="${i}"${s.working_days?.includes(i)?' checked':''}> ${day}</label>`).join('')}</fieldset><div class="form-grid">${input('opens_at','Opening time','time',5)}${input('closes_at','Closing time','time',5)}<div class="form-field"><label for="time_zone">Time zone</label><select data-dropdown id="time_zone" name="time_zone" required><option value="">Select time zone</option>${['Africa/Johannesburg','UTC'].map(t=>`<option${s.time_zone===t?' selected':''}>${t}</option>`).join('')}</select></div></div></section><section class="panel editor-panel"><h2>Cleaner daily workload</h2><label for="max_daily_minutes">Maximum planned work per cleaner per day (minutes)</label><input id="max_daily_minutes" name="max_daily_minutes" type="number" min="15" max="1440" step="1" value="${esc(s.max_daily_minutes??'')}"><p class="muted">Leave blank if not configured. Includes assigned visits, setup and required work travel across businesses. Break and rest arrangements and pay entitlements need separate review. Existing appointments are not rewritten.</p></section><div class="form-actions"><button>Save settings</button><a class="button secondary" href="/dashboard?business=${encodeURIComponent(business.id)}">Cancel</a></div></form>${renderVatSettings(business,vat)}`;
}
