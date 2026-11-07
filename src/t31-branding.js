// T31 business branding: only allow an HTTPS logo from the operator's supplied host.
// Logo upload/storage and provider activation are separate qualification gates.
export function parseBranding(form) {
 const color=String(form.get('accent_color')??'').trim();
 const logo=String(form.get('logo_url')??'').trim();
 if(!/^#[0-9a-fA-F]{6}$/.test(color))throw Error('Choose a valid six-digit brand colour');
 if(logo.length>500||logo&&(!/^https:\/\/[a-z\d.-]+(?:\:[0-9]{2,5})?\/[\w%./~-]+(?:\?[\w%=&.-]+)?$/i.test(logo)||logo.includes('..')))throw Error('Use an HTTPS logo URL without credentials');
 return {accent_color:color.toUpperCase(),logo_url:logo};
}
export async function readBranding(client,businessId){
 const {data,error}=await client.from('t31_business_branding').select('business_id,accent_color,logo_url,version').eq('business_id',businessId).maybeSingle();
 if(error)throw Error('Branding unavailable');
 return data;
}
export async function saveBranding(client,businessId,values){
 const {data,error}=await client.from('t31_business_branding').upsert({...values,business_id:businessId},{onConflict:'business_id'}).select('business_id');
 if(error||data?.length!==1||data[0].business_id!==businessId)throw Error('Branding not saved');
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderBranding(business,settings={},message=''){
 const s=settings??{},back='/onboarding?business='+encodeURIComponent(business.id);
 return '<section class="ui-page"><a class="module-back" href="'+back+'">← Back to setup</a><h1>Branding</h1><p>Choose your business colour and logo.</p>'
 +(message?'<p class="feedback" role="status">'+esc(message)+'</p>':'')
 +'<form class="panel ui-form" method="post" action="/branding?business='+encodeURIComponent(business.id)+'"><h2>Brand details</h2>'
 +'<div class="form-field"><label for="accent">Brand colour</label><input id="accent" name="accent_color" required maxlength="7" pattern="#[0-9a-fA-F]{6}" aria-describedby="colour-help" value="'+esc(s.accent_color??'#146C94')+'"><small id="colour-help">Hex colour, for example #146C94.</small></div>'
 +'<div class="form-field"><label for="logo">Logo URL <span class="muted">(optional)</span></label><input id="logo" name="logo_url" type="url" maxlength="500" aria-describedby="logo-help" value="'+esc(s.logo_url)+'"><small id="logo-help">Use an HTTPS image link. Uploads are not available yet.</small></div>'
 +'<div class="form-actions"><button type="submit">Save branding</button><a class="button secondary" href="'+back+'">Cancel</a></div></form></section>';
}
