import {escapeHtml} from './workspace-layout.js';

// T31 persisted-state checklist. No client-provided "completed" flag or privileged mutation.
export function onboardingProgress(settings,items=[],branding=null) {
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
  const branded=typeof branding?.accent_color==='string'&&/^#[0-9A-F]{6}$/.test(branding.accent_color);
  return Object.freeze({
    profile:businessProfile,serviceAreas,operatingHours,services:activeServices.length>0,branding:branded,
    completed:[businessProfile,serviceAreas,operatingHours,activeServices.length>0,branded].filter(Boolean).length,
    total:5
  });
}
export function renderOnboardingProgress(business,progress) {
 const id=encodeURIComponent(business.id);
 const steps=[
  ['profile','Profile','Name and contact details','/settings?business='+id+'#profile'],
  ['serviceAreas','Areas','Where you work','/settings?business='+id+'#profile'],
  ['operatingHours','Hours','Working days and times','/settings?business='+id+'#hours'],
  ['services','Services','Services, prices and extras','/catalogue?business='+id],
  ['branding','Branding','Your business colour','/branding?business='+id]
 ];
 const next=steps.find(([key])=>!progress[key]);
 const complete=!next;
 return '<section class="setup-page"><div class="setup-heading"><h1>Setup</h1><p>'+(complete?'You’re ready to open your workspace.':'Add your details to get started.')+'</p></div>'
 +'<section class="panel setup-card" aria-labelledby="setup-progress"><div class="setup-progress-heading"><h2 id="setup-progress">Your progress</h2><span>'+progress.completed+' of '+progress.total+' complete</span></div>'
 +'<progress class="setup-progress" max="'+progress.total+'" value="'+progress.completed+'" aria-label="Business setup progress">'+progress.completed+' of '+progress.total+'</progress>'
 +'<ol class="setup-steps">'+steps.map(([key,label,description,url],i)=>'<li class="'+(progress[key]?'is-complete':'')+'"><span class="setup-number" aria-hidden="true">'+(progress[key]?'✓':i+1)+'</span><div class="setup-step-copy"><h3>'+escapeHtml(label)+'</h3><p>'+description+'</p></div><span class="setup-status">'+(progress[key]?'Done':'To do')+'</span><a class="setup-step-link" href="'+url+'" aria-label="'+(progress[key]?'Edit ':'Set up ')+escapeHtml(label)+'">'+(progress[key]?'Edit':'Set up')+'</a></li>').join('')+'</ol>'
 +'<div class="setup-footer"><p>'+(next?'Next: '+escapeHtml(next[1]):'All five steps are complete.')+'</p><a class="setup-primary" href="'+(next?next[3]:'/dashboard?business='+id)+'">'+(next?'Continue setup':'Open dashboard')+' <span aria-hidden="true">→</span></a></div></section>'
 +'<section class="setup-team" aria-labelledby="setup-team-title"><div><h2 id="setup-team-title">Team</h2><p>Optional — add your team when you’re ready.</p></div><div><a href="/team-invite?business='+id+'">Invite staff</a><a href="/team-members?business='+id+'">Manage access</a></div></section></section>';
}
