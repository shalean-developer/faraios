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
 return {display_name,contact_email,contact_phone,service_areas,working_days,opens_at,closes_at,time_zone};
}
export async function readBusinessSettings(client,businessId){
 const {data,error}=await client.from('business_settings').select('display_name,contact_email,contact_phone,service_areas,working_days,opens_at,closes_at,time_zone').eq('business_id',businessId).maybeSingle();
 if(error)throw new Error('Settings unavailable');return data;
}
export async function saveBusinessSettings(client,businessId,settings){
 const {data,error}=await client.from('business_settings').upsert({...settings,business_id:businessId},{onConflict:'business_id'}).select('business_id');
 if(error||data?.length!==1||data[0].business_id!==businessId)throw new Error('Settings could not be saved');
}
export function renderBusinessSettings(business,settings={},message='',error=false){
 const s=settings??{};
 const input=(key,label,type='text',max=160)=>`<label for="${key}">${label}</label><input id="${key}" name="${key}" type="${type}" maxlength="${max}" value="${esc(type==='time'?String(s[key]??'').slice(0,5):s[key])}"${['display_name','opens_at','closes_at'].includes(key)?' required':''}>`;
 return `<a href="/dashboard?business=${encodeURIComponent(business.id)}">← Back to ${esc(business.name)}</a><h1>Business settings</h1><p>Settings for ${esc(business.name)} only.</p>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}<form class="panel settings-form" method="post" action="/settings?business=${encodeURIComponent(business.id)}">${input('display_name','Display name')}${input('contact_email','Contact email','email',254)}${input('contact_phone','Contact phone','tel',40)}<label for="service_areas">Service areas — one per line</label><textarea id="service_areas" name="service_areas" rows="5" maxlength="4000">${esc(Array.isArray(s.service_areas)?s.service_areas.join('\n'):s.service_areas)}</textarea><fieldset><legend>Working days</legend>${['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'].map((day,i)=>`<label class="day"><input type="checkbox" name="working_days" value="${i}"${s.working_days?.includes(i)?' checked':''}> ${day}</label>`).join('')}</fieldset>${input('opens_at','Opening time','time',5)}${input('closes_at','Closing time','time',5)}<label for="time_zone">Time zone</label><select id="time_zone" name="time_zone" required><option value="">Select time zone</option>${['Africa/Johannesburg','UTC'].map(t=>`<option${s.time_zone===t?' selected':''}>${t}</option>`).join('')}</select><p class="muted">One opening interval applies to the selected days. Overnight and split shifts come later. Services and pricing are the next catalogue step.</p><button>Save settings</button></form>`;
}
