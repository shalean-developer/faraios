import {validDate,validPickerValue} from '../public/date-time-values.js';
import {dateTimeField} from './date-time-field.js';
import {bookingStatuses} from './bookings.js';
import {validCustomerId} from './customers.js';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const invalid=message=>Object.assign(new Error(message),{status:422});
export function calendarOptions(params,timeZone,now=new Date()){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const day=params.get('day')||today,view=params.get('view')||'week';
 if(!validDate(day)||!['day','week'].includes(view))throw invalid('Choose a valid calendar date and view.');
 return {day,view,days:view==='day'?1:7,today};
}
export async function readCalendar(client,businessId,options){
 const {data,error}=await client.rpc('calendar_window',{p_business_id:businessId,p_day:options.day,p_days:options.days});
 if(error||!data?.time_zone||!Array.isArray(data.bookings)||!Array.isArray(data.busy))throw new Error('Calendar unavailable.');
 return data;
}
export async function checkAvailability(client,businessId,params){
 const local=params.get('local_start'),raw=params.get('duration_minutes'),booking=params.get('booking')||null;
 if(!validPickerValue(local,'datetime')||!/^\d+$/.test(raw??'')||Number(raw)<15||Number(raw)>1440||booking&&!validCustomerId(booking))throw invalid('Enter a valid start time and duration from 15 to 1440 minutes.');
 const {data,error}=await client.rpc('staff_availability',{p_business_id:businessId,p_local_start:local,p_minutes:Number(raw),p_booking_id:booking});
 if(error?.code==='42501')throw Object.assign(new Error('Booking access denied'),{status:403});
 if(error||!data?.time_zone||!Array.isArray(data.staff))throw invalid('Availability could not be checked. Check the date and try again.');
 return data;
}
export function renderCalendar(business,ctx,data,options,{availability=null,values={},message='',error=false}={}){
 const base='/calendar?business='+encodeURIComponent(business.id),tz=data.time_zone;
 const dateOf=value=>new Intl.DateTimeFormat('en-CA',{timeZone:tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
 const clock=value=>new Intl.DateTimeFormat('en-ZA',{timeZone:tz,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(value));
 const shift=n=>new Date(Date.parse(options.day+'T12:00:00Z')+n*86400000).toISOString().slice(0,10);
 const label=id=>ctx.staff.find(s=>s.user_id===id)?.label??'Staff account';
 const period=(start,end)=>`${esc(dateOf(start))} ${esc(clock(start))}–${esc(dateOf(end))} ${esc(clock(end))}`;
 const today=options.today??dateOf(new Date());
 const agendaPeriod=(start,end)=>dateOf(start)===dateOf(end)?`${esc(clock(start))}–${esc(clock(end))}`:period(start,end);
 const url=day=>`${base}&amp;day=${day}&amp;view=${options.view}`;
 let html=`<header class="catalogue-top"><div class="catalogue-intro"><p class="eyebrow">SCHEDULING</p><h1>Availability &amp; calendar</h1><p>${esc(business.name)} · ${esc(tz)}</p></div><a class="button" href="/bookings?business=${encodeURIComponent(business.id)}">Open bookings</a></header>${message?`<p role="${error?'alert':'status'}">${esc(message)}</p>`:''}<section class="panel"><form class="calendar-filters" method="get" action="/calendar"><input type="hidden" name="business" value="${esc(business.id)}"><div>${dateTimeField({id:'day',label:'Starting date',value:options.day,timeZone:tz})}</div><div><label for="view">View</label><select data-dropdown id="view" name="view"><option value="day"${options.view==='day'?' selected':''}>Day</option><option value="week"${options.view==='week'?' selected':''}>Week</option></select></div><button>Show calendar</button></form><nav class="calendar-navigation" aria-label="Calendar dates"><a href="${url(shift(-options.days))}">← Previous ${options.view}</a><a href="${base}">Today</a><a href="${url(shift(options.days))}">Next ${options.view} →</a></nav><p class="calendar-guidance">Assigning a team blocks those cleaners across businesses. Other businesses’ jobs appear as Busy only. Draft and Confirmed bookings without a team do not reserve cleaners.</p><p class="calendar-travel-note"><strong>Allow travel time:</strong> the calendar currently blocks the scheduled job duration only.</p></section><div class="calendar-days">`;
 for(let n=0;n<options.days;n++){
  const day=shift(n),end=shift(n+1),belongs=row=>dateOf(row.starts_at)<end&&dateOf(row.ends_at)>=day&&(dateOf(row.ends_at)!==day||clock(row.ends_at)!=='00:00');
  const entries=data.bookings.filter(belongs),busy=data.busy.filter(belongs);
  html+=`<section class="panel calendar-day${day===today?' is-today':''}"><div class="calendar-day-heading"><h2${day===today?' aria-current="date"':''}>${esc(new Intl.DateTimeFormat('en-ZA',{weekday:'long',day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(day+'T12:00:00Z')))}</h2>${day===today?'<span class="calendar-today">Today</span>':''}</div>${entries.map(b=>`<article class="calendar-entry"><a class="calendar-customer" href="/bookings?business=${encodeURIComponent(business.id)}&amp;booking=${encodeURIComponent(b.id)}"><strong>${esc(b.name)}</strong></a><p class="calendar-time">${agendaPeriod(b.starts_at,b.ends_at)}</p><span class="calendar-status calendar-status-${esc(b.status)}">${esc(bookingStatuses[b.status]??b.status)}</span><p class="calendar-team">${b.assigned_staff.length?'Assigned staff: '+esc(b.assigned_staff.map(label).join(', ')):`No team assigned · ${esc(b.required_team_size)} required`}</p></article>`).join('')}${busy.map(b=>`<article class="calendar-entry calendar-busy"><div class="calendar-busy-heading"><strong>${esc(label(b.staff_id))}</strong><span class="calendar-status calendar-status-busy">Busy</span></div><p class="calendar-time">${agendaPeriod(b.starts_at,b.ends_at)}</p><p class="muted">Other-business assignment</p></article>`).join('')}${!entries.length&&!busy.length?'<p class="calendar-empty">No scheduled jobs.</p>':''}</section>`;
 }
 html+='</div>';
 html+=`<section class="panel"><h2>Check cleaner availability</h2><p>Check a proposed time before assigning or rescheduling. Saving always checks again to prevent simultaneous assignments.</p><form class="calendar-filters" method="get" action="/calendar"><input type="hidden" name="business" value="${esc(business.id)}"><input type="hidden" name="day" value="${options.day}"><input type="hidden" name="view" value="${options.view}">${values.booking?`<input type="hidden" name="booking" value="${esc(values.booking)}">`:''}<div>${dateTimeField({id:'local_start',label:'Start time ('+tz+')',kind:'datetime',value:values.local_start??options.day+'T09:00',timeZone:tz})}</div><div><label for="duration_minutes">Duration (minutes)</label><input id="duration_minutes" type="number" name="duration_minutes" min="15" max="1440" step="1" value="${esc(values.duration_minutes??120)}" required></div><button>Check availability</button></form>${availability?`<p role="status">${period(availability.starts_at,availability.ends_at)}${values.booking?' · Excludes this booking’s current reservation':''}</p><ul class="availability-results">${availability.staff.map(s=>`<li><strong>${esc(label(s.user_id))}</strong><span class="catalogue-status ${s.busy?'':'is-active'}">${s.busy?'Busy':'Available'}</span></li>`).join('')||'<li>No active staff memberships in this business.</li>'}</ul><p class="muted">Available means no overlapping assignment. Check business working hours and any travel arrangements before confirming.</p>`:''}</section>`;
 return html;
}
