import {escapeHtml as esc,moduleHeading,statusBadge} from './workspace-layout.js';
export async function notificationOperation(client,business,action,payload={}){
 const {data,error}=await client.rpc('t26_notifications',{business,action,payload});
 if(error)throw Object.assign(new Error('Notification action rejected. Reopen the job before retrying.'),{status:error.code==='42501'?403:422});
 return data;
}
export function notificationForm(data){
 const action=data.get('action');const fields={mode:['mode'],reminder:['invoiceId'],deliver:['jobId']}[action];
 if(!fields)throw Object.assign(Error('Invalid notification action'),{status:400});
 return {action,payload:Object.fromEntries(['requestId',...fields].map(k=>[k,data.get(k)]))};
}
const labels={confirmation:'Booking confirmation',assignment:'Cleaner assignment',payment_received:'Verified payment',pending_payment:'Pending payment reminder'};
export function renderNotifications(business,data,{owner=false,page=0}={}){
 const base='/notifications?business='+encodeURIComponent(business.id);
 const hidden=(key,value)=>`<input type="hidden" name="${esc(key)}" value="${esc(value)}">`;
 const form=(action,body)=>`<form method="post" action="${esc(base)}">${hidden('action',action)}${hidden('requestId',crypto.randomUUID())}${body}</form>`;
 return moduleHeading({title:'Notifications and failed jobs',business,description:'External delivery is disabled. The test sink records a message in this workspace only.'})+
 `<section class="panel"><h2>Delivery control</h2><p>Current mode: <strong>${esc(data.mode)}</strong>. Drafts and assessment requests are not confirmed appointments.</p>${owner?form('mode',`<label>Mode<select name="mode"><option value="disabled"${data.mode==='disabled'?' selected':''}>Disabled</option><option value="sink"${data.mode==='sink'?' selected':''}>Test sink only</option></select></label><button>Save delivery control</button>`):''}</section>`+
 `<section class="panel"><h2>Queue a payment reminder</h2><p>Use an invoice from this business. Current payment and booking state is checked before delivery. Each invoice permits one reminder.</p>${form('reminder','<label>Invoice ID<input name="invoiceId" required maxlength="36"></label><button>Queue reminder</button>')}</section>`+
 data.rows.slice(0,50).map(row=>`<article class="panel"><h2>${esc(labels[row.kind]??row.kind)}</h2><p>${statusBadge(row.state)} · Attempts ${esc(row.attempts)} / 5</p><p>Booking: <a href="/bookings?business=${encodeURIComponent(business.id)}&amp;booking=${encodeURIComponent(row.bookingId)}">${esc(row.bookingId)}</a></p>${row.error?`<p role="status">${esc(row.error.replaceAll('_',' '))}</p>`:''}${row.state==='failed'?`<p>Retry available after ${esc(row.availableAt)}. After five failures, investigate before further action.</p>`:''}${data.mode==='sink'&&['queued','failed'].includes(row.state)&&row.attempts<5?form('deliver',hidden('jobId',row.id)+`<button>${row.state==='failed'?'Retry in test sink':'Deliver to test sink'}</button>`):''}${row.message?`<p>${esc(row.message.businessName)}: ${esc(row.message.text)}</p><p>${esc(row.message.localStart)} · ${esc(row.message.timeZone)}</p>${row.message.balanceCents!==null?`<p>Verified: ${esc(row.message.verifiedCents)} cents · Balance: ${esc(row.message.balanceCents)} cents</p>`:''}`:''}</article>`).join('')+
 (!data.rows.length?'<p>No notification jobs.</p>':'')+`<nav aria-label="Notification pages">${page?`<a href="${esc(base)}&amp;page=${page-1}">Previous</a>`:''}${data.rows.length>50?` <a href="${esc(base)}&amp;page=${page+1}">Next</a>`:''}</nav>`;
}
