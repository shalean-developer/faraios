import {renderWorkspaceNavigation,renderWorkspaceFrame,compactDisplayId} from './workspace-layout.js';
import {renderWorkspaceHeader} from './workspace-header.js';
import {canAccess, accessibleBusinesses} from './access.js';
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Only the server-resolved identity is accepted here. This UI is not an API access boundary.
export function renderWorkspace(identity, selected='all', {restoreTest=false}={}) {
  if(identity.onboardingPreview)return renderPreviewWorkspace(identity,selected);
  const allowed=accessibleBusinesses(identity.userId,identity.memberships);
  if(selected!=='all'&&!allowed.includes(selected))throw new Error('Business access denied');
  const businesses=identity.businesses.filter(b=>allowed.includes(b.id));
  const visible=businesses.filter(b=>selected==='all'||b.id===selected);
  const permits=(businessId,permission)=>canAccess({userId:identity.userId,businessId,permission,memberships:identity.memberships});
  const any=permission=>visible.some(b=>permits(b.id,permission));
  const role=id=>identity.memberships.find(m=>m.businessId===id&&m.userId===identity.userId&&m.status==='active')?.role;
  const title=selected==='all'?'Your workspace':visible[0]?.name??'Your workspace';
  const ownerBusinesses=businesses.filter(b=>role(b.id)==='owner');

  const cards=[...(any('bookings.read')?[['Bookings','Open Bookings to plan visits, assign teams and manage progress.']]:[]),...(any('jobs.assigned.read')?[['My assignments','Open My Jobs in the menu to view your assigned visits and schedule.']]:[]),...(any('finance.read')?[['Business finances','Invoices and payments are not connected yet.']]:[]),...(any('earnings.own.read')?[['My earnings','Open My earnings to view your own agreements, accruals and explained corrections.']]:[])];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · FaraiOS ${restoreTest?'restore test':'staging'}</title><link rel="stylesheet" href="/style.css"><script type="module" src="/dropdown.js"></script></head><body class="workspace-layout"><a class="skip-link" href="#main-content">Skip to content</a><div class="notice">${restoreTest?'FaraiOS RESTORE TEST · Read-only recovery workspace · Integrations disabled':'FARAiOS STAGING · Test workspace · No production data'}</div><div class="workspace-topbar">${renderWorkspaceHeader({business:selected==='all'?null:visible[0]})}</div><div class="workspace">${renderWorkspaceNavigation(identity,selected)}<main id="main-content" tabindex="-1" class="content module-content"><section class="intro" aria-labelledby="workspace-title"><div><p class="eyebrow">OVERVIEW</p><h1 id="workspace-title">${esc(title)}</h1><p>${selected==='all'?'A view across your active business memberships.':'Your selected business workspace.'}</p></div>${businesses.length?`<form method="get" action="/dashboard"><label for="business">Business view</label><div class="switch"><select data-dropdown id="business" name="business"><option value="all"${selected==='all'?' selected':''}>All businesses</option>${businesses.map(b=>`<option value="${esc(b.id)}"${selected===b.id?' selected':''}>${esc(b.name)}</option>`).join('')}</select><button>Apply</button></div></form>`:''}</section>${!restoreTest?`<section class="panel"><h2>Independent cleaning business onboarding</h2><a href="/business/new">${businesses.length?'Create another cleaning business':'Create your cleaning business'}</a>${ownerBusinesses.filter(b=>selected==='all'||b.id===selected).map(b=>`<p><a href="/onboarding?business=${encodeURIComponent(b.id)}">Continue setup: ${esc(b.name)}</a></p>`).join('')}</section>`:''}${visible.length?`<p class="scope">${visible.length} ${visible.length===1?'business':'businesses'} in this view. Access follows your role in each business.</p><section class="cards" aria-label="Workspace summary">${cards.map(([label,description])=>`<article class="panel"><h2>${label}</h2><div class="metric" aria-label="Dashboard total not connected">—</div><p class="muted">${description}</p></article>`).join('')}</section><section class="panel"><h2>Businesses in this view</h2>${visible.map(b=>`<article class="business-row"><div><strong>${esc(b.name)}</strong><p>${esc(role(b.id))}</p><p>${permits(b.id,'finance.read')?'Can view finances, manage invoices and record payments.':'Assigned jobs and own earnings only.'}${permits(b.id,'business.manage')?' Owner controls include refunds, payout approval and payment settings.':''}</p></div><a href="/dashboard?business=${encodeURIComponent(b.id)}">Open workspace →</a></article>`).join('')}</section><section class="panel next"><h2>Your workspace is ready for the next modules</h2><p>Business access and switching are connected. Items marked Planned will become available as each module is built and verified.</p></section>`:'<section class="panel"><h2>No business access assigned</h2><p>Create your cleaning business to begin setting up your independent workspace.</p></section>'}<p class="muted">Sign in again after 30 minutes or token expiry. Restarting the local server clears sessions.</p></main></div></body></html>`;
}


function renderPreviewWorkspace(identity,selected){
 const allowed=accessibleBusinesses(identity.userId,identity.memberships);
 if(selected!=='all'&&!allowed.includes(selected))throw new Error('Business access denied');
 const businesses=identity.businesses.filter(b=>allowed.includes(b.id));
 const visible=businesses.filter(b=>selected==='all'||b.id===selected);
 const role=id=>identity.memberships.find(m=>m.businessId===id&&m.userId===identity.userId&&m.status==='active')?.role;
 const business=selected==='all'?null:visible[0],e=v=>esc(compactDisplayId(v));
 const canCreate=!businesses.length||(business?role(business.id)==='owner':businesses.some(b=>role(b.id)==='owner'));
 const duplicateName=b=>businesses.filter(other=>other.name.trim().toLowerCase()===b.name.trim().toLowerCase()).length>1;
 const reference=b=>duplicateName(b)?' · '+compactDisplayId(b.id):'';
 const roles={owner:'Owner',manager:'Manager',staff:'Cleaner'};
 const actions=b=>{
  const id=encodeURIComponent(b.id),name=e(b.name+reference(b));
  if(!business)return '<a class="button primary" href="/dashboard?business='+id+'" aria-label="Open '+name+'">Open workspace</a>';
  return (role(b.id)==='owner'?'<a class="button secondary" href="/onboarding?business='+id+'">Setup</a>':'')
   +(canAccess({userId:identity.userId,businessId:b.id,permission:'catalogue.read',memberships:identity.memberships})?'<a class="button primary" href="/catalogue?business='+id+'">Services</a>':'');
 };
 const body='<section class="ui-overview"><div class="module-heading"><div><h1>'+(business?'Overview':'Businesses')+'</h1><p>'+(business?'Your selected workspace.':'Choose a business to continue.')+'</p></div><div class="ui-business-actions">'
 +(business&&businesses.length>1?'<a class="button secondary" href="/dashboard?business=all#business">Switch business</a>':'')
 +(canCreate?'<a class="button secondary" href="/business/new">Create business</a>':'')+'</div></div>'
 +'<section class="panel" id="business" aria-label="Business workspaces">'
 +(visible.length?visible.map(b=>'<article class="business-row"><div><strong>'+e(b.name)+'</strong><p>'+roles[role(b.id)]+(duplicateName(b)?' · <span class="business-reference">Ref '+e(b.id)+'</span>':'')+'</p>'
 +(business&&role(b.id)==='staff'?'<p>Staff tools are not available in this preview.</p>':'')
 +'</div><div class="ui-business-actions">'+actions(b)+'</div></article>').join(''):'<h2>No businesses yet</h2><p>Create a business to get started.</p>')
 +'</section></section>';
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+(business?'Overview':'Businesses')+' · FaraiOS staging</title><link rel="stylesheet" href="/style.css?v=t31-overview-audit-20261107"><script type="module" src="/dropdown.js"></script></head><body class="workspace-layout"><div class="notice">FaraiOS STAGING · Test workspace · No production data</div>'+renderWorkspaceFrame(identity,business,body,'/dashboard')+'</body></html>';
}
