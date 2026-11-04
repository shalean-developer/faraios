import {escapeHtml} from './workspace-layout.js';

// T31 persisted-state checklist. No client-provided "completed" flag or privileged mutation.
export function onboardingProgress(settings,items=[]) {
  if(!Array.isArray(items)||items.some(item=>!item||typeof item!=='object'))throw Error('Onboarding data unavailable');
  const s=settings??{};
  const businessProfile=typeof s.display_name==='string'&&s.display_name.trim().length>0
    &&(typeof s.contact_email==='string'&&s.contact_email.trim().length>0||typeof s.contact_phone==='string'&&s.contact_phone.trim().length>0);
  const serviceAreas=Array.isArray(s.service_areas)&&s.service_areas.some(a=>typeof a==='string'&&a.trim().length>0);
  const operatingHours=Array.isArray(s.working_days)&&s.working_days.length>0
    &&typeof s.opens_at==='string'&&s.opens_at.length>=5
    &&typeof s.closes_at==='string'&&s.closes_at.length>=5
    &&typeof s.time_zone==='string'&&s.time_zone.length>0;
  const activeServices=items.filter(item=>item.kind==='service'&&item.is_active===true&&Number.isSafeInteger(item.price_cents)&&item.price_cents>=0);
  return Object.freeze({
    profile:businessProfile,serviceAreas,operatingHours,services:activeServices.length>0,
    completed:[businessProfile,serviceAreas,operatingHours,activeServices.length>0].filter(Boolean).length,
    total:4
  });
}
export function renderOnboardingProgress(business,progress) {
  const id=encodeURIComponent(business.id);
  const steps=[
    ['profile','Business contact and display name','/settings?business='+id],
    ['serviceAreas','Service areas','/settings?business='+id],
    ['operatingHours','Operating hours','/settings?business='+id],
    ['services','Active cleaning service and pricing','/catalogue?business='+id]
  ];
  return '<section class="module-heading"><div><p class="eyebrow">'+escapeHtml(business.name)+'</p><h1>Set up your cleaning business</h1><p>Complete the configuration for this workspace. Progress comes from saved business records.</p></div></section>'
    +'<section class="panel"><h2>Onboarding progress: '+progress.completed+' of '+progress.total+'</h2>'
    +'<ol>'+steps.map(([key,label,url])=>'<li><strong>'+escapeHtml(label)+'</strong> — '+(progress[key]?'Configured':'Not configured')+' · <a href="'+url+'">'+(progress[key]?'Review':'Configure')+'</a></li>').join('')+'</ol>'
    +'<p class="muted">Brand logo upload and staff invitations are not yet available in T31. Do not enter provider credentials or financial data here.</p>'
    +'<a href="/dashboard?business='+id+'">Return to workspace</a></section>';
}
