// Progressive enhancement only: the complete form still submits without JavaScript.
export function enhanceCatalogueSetup(form){
 const profile=form.elements.namedItem('cleaning_profile'),configure=form.querySelector('[data-configure-profile]');
 if(profile&&configure){configure.hidden=true;profile.addEventListener('change',()=>form.requestSubmit(configure));}
 const sync=()=>{
  const kind=form.elements.namedItem('kind')?.value;
  form.querySelectorAll('[data-setup-service-only]').forEach(group=>{group.hidden=kind==='extra';const team=group.querySelector('input[name="team_size"]');if(team)team.required=kind==='service';const profile=group.querySelector('select[name="cleaning_profile"]');if(kind==='extra'&&profile?.value){profile.value='';profile.dispatchEvent(new Event('change',{bubbles:true}));}});
  form.querySelectorAll('[data-setup-when]').forEach(group=>{
   const [name,expected]=group.dataset.setupWhen.split(':'),control=form.elements.namedItem(name);
   group.hidden=(control?.type==='checkbox'?(control.checked?'on':'off'):control?.value)!==expected;
   group.querySelectorAll('input').forEach(input=>{if(!input.dataset.setupRequired)input.dataset.setupRequired=String(input.required||input.type!=='checkbox');input.required=!group.hidden&&input.dataset.setupRequired==='true';});
  });
  const noCharge=form.elements.namedItem('pets_no_charge')?.checked;
  form.querySelectorAll('[data-pet-pricing]').forEach(group=>{group.hidden=!!noCharge;});
  form.querySelectorAll('.setup-extra').forEach(row=>{const checkbox=row.querySelector('[data-extra-toggle]'),group=row.querySelector('[data-extra-minutes]');if(group){group.hidden=!checkbox?.checked;const input=group.querySelector('input');if(input)input.required=!!checkbox?.checked;}});
 };
 const unused=form.querySelector('[data-unused-pets]'),visible=form.querySelector('[data-pet-visible]'),add=form.querySelector('[data-add-pet]');
 if(unused&&visible&&add){unused.hidden=true;add.hidden=!unused.querySelector('[data-pet-row]');add.addEventListener('click',()=>{const row=unused.querySelector('[data-pet-row]');if(row){visible.append(row);row.querySelector('input')?.focus();}add.hidden=!unused.querySelector('[data-pet-row]');sync();});}
 form.addEventListener('change',sync);
 form.addEventListener('input',sync);
 form.addEventListener('invalid',event=>{let parent=event.target.parentElement;while(parent&&parent!==form){if(parent.tagName==='DETAILS')parent.open=true;parent=parent.parentElement;}},true);
 form.addEventListener('reset',()=>setTimeout(sync,0));sync();
}
if(typeof document!=='undefined')document.querySelectorAll('form.catalogue-setup').forEach(enhanceCatalogueSetup);
