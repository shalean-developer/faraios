import {canAccess,accessibleBusinesses} from './access.js';
import {renderWorkspaceHeader} from './workspace-header.js';

export const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Navigation is derived from verified membership records. Destinations still enforce access.
export function renderWorkspaceNavigation(identity,selected='all',active='/dashboard'){
 const allowed=accessibleBusinesses(identity.userId,identity.memberships);
 const businesses=identity.businesses.filter(b=>allowed.includes(b.id)&&(selected==='all'||b.id===selected));
 if(selected!=='all'&&!businesses.length)throw new Error('Business access denied');
 const permits=permission=>businesses.some(b=>canAccess({userId:identity.userId,businessId:b.id,permission,memberships:identity.memberships}));
 const items=[['Overview','/dashboard',null],['Bookings','/bookings','bookings.read'],['Recurring bookings','/recurring','bookings.read'],['Availability & calendar','/calendar','bookings.read'],['Customers','/customers','customers.read'],['Services & extras','/catalogue','catalogue.read'],['Staff & teams','/staff','staff.read'],['Quotes','/quotes','quotes.read'],['My assignments',null,'jobs.assigned.read'],['Finance','/invoices','finance.read'],['Earnings','/earnings','finance.read'],['Earnings rules','/earnings-rules','finance.read'],['My earnings',null,'earnings.own.read'],['Business settings','/settings','business.manage'],['Team access',null,'members.manage']];
 items.splice(items.findIndex(i=>i[0]==='Earnings rules'),0,['Cancellation reviews','/cancellations','finance.read']);
 items.splice(items.findIndex(i=>i[0]==='Earnings rules'),0,['Earnings adjustments','/earnings-adjustments','finance.read']);
 items.splice(items.findIndex(i=>i[0]==='Earnings rules'),0,['Monthly settlement reviews','/monthly-settlements','finance.read']);
 items.splice(items.findIndex(i=>i[0]==='My earnings'),0,['My settlement reviews','/monthly-settlements','earnings.own.read']);
 items.splice(items.findIndex(i=>i[0]==='My earnings'),0,['My adjustment reviews','/earnings-adjustments','earnings.own.read']);
 const links=items.filter(([, ,permission])=>!permission||permits(permission)).map(([label,path])=>path&&(selected!=='all'||path==='/dashboard')?`<a href="${path}${selected==='all'?'':'?business='+encodeURIComponent(selected)}"${path===active?' class="active" aria-current="page"':''}>${escapeHtml(label)}</a>`:`<span aria-disabled="true">${escapeHtml(label)}<small>${path?'Select a business':'Planned'}</small></span>`).join('');
 return `<aside class="workspace-sidebar"><details class="mobile-navigation"><summary><span class="menu-icon" aria-hidden="true">☰</span><span class="sr-only">Toggle workspace menu</span><span aria-hidden="true">Menu</span></summary><nav aria-label="Mobile workspace">${links}</nav></details><p class="side-label">WORKSPACE</p><div class="desktop-navigation"><nav aria-label="Workspace">${links}</nav></div><p class="side-note">One account. Your authorised businesses.</p></aside>`;
}

export function renderWorkspaceFrame(identity,business,body,active='/dashboard'){
 return `<a class="skip-link" href="#main-content">Skip to content</a><div class="workspace-topbar">${renderWorkspaceHeader({business})}</div><div class="workspace">${renderWorkspaceNavigation(identity,business?.id??'all',active)}<main id="main-content" tabindex="-1" class="content module-content">${body}</main></div>`;
}

export function moduleHeading({title,business,description='',actions='',back=''}){
 return `${back?`<a class="module-back" href="${back}">← Back</a>`:''}<div class="module-heading"><div><p class="eyebrow">${escapeHtml(business.name)}</p><h1>${escapeHtml(title)}</h1>${description?`<p class="module-description">${escapeHtml(description)}</p>`:''}</div>${actions?`<div class="module-actions">${actions}</div>`:''}</div>`;
}

export function feedback(message,error=false){return message?`<p class="feedback ${error?'feedback-error':'feedback-success'}" role="${error?'alert':'status'}">${escapeHtml(message)}</p>`:'';}
export function statusBadge(status,label){return `<span class="status-badge status-${escapeHtml(String(status).replace(/[^a-z_]/g,''))}">${escapeHtml(label??status)}</span>`;}
export function localDateTime(value){
 const local=String(value??'').slice(0,16),match=local.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}:\d{2})$/);
 if(!match)return '<span class="muted">Not scheduled</span>';
 const date=new Date(Date.UTC(Number(match[1]),Number(match[2])-1,Number(match[3])));
 return `<time datetime="${escapeHtml(local)}"><strong>${escapeHtml(new Intl.DateTimeFormat('en-ZA',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(date))}</strong><small>${escapeHtml(match[4])}</small></time>`;
}
