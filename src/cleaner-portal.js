import {escapeHtml as esc,moduleHeading,localDateTime,statusBadge} from './workspace-layout.js';
import {bookingStatuses} from './bookings.js';
import {readAdjustmentSource,teamEarningsReview} from './adjustment-reviews.js';
const titles={jobs:'My Jobs',schedule:'Schedule',earnings:'Earnings',profile:'Profile'};
const money=n=>{if(!Number.isSafeInteger(n))throw Error('Invalid earnings amount');return new Intl.NumberFormat('en-ZA',{style:'currency',currency:'ZAR'}).format(n/100);};
export async function cleanerPortalData(client,businessId,userId,section,page=0){
 if(!Object.hasOwn(titles,section)||!Number.isSafeInteger(page)||page<0||page>1000000)throw Error('Invalid portal page');
 const {data,error}=await client.rpc('t24_cleaner_portal',{business:businessId,section,page});
 if(error||data?.userId!==userId||data.section!==section||data.page!==page)throw Error('Cleaner portal unavailable');
 if(section==='profile'){if(data.data?.userId!==userId)throw Error('Profile unavailable');return {profile:data.data,rows:[],hasNext:false};}
 if(!Array.isArray(data.data)||data.data.length>51)throw Error('Cleaner portal unavailable');
 const rows=data.data.slice(0,50);
 if(section==='earnings')for(const row of rows){
  if(row.syntheticOnly!==true||typeof row.accrued!=='boolean')throw Error('Earnings history unavailable');
  money(row.amountCents);
  if(row.accrued){const source=await readAdjustmentSource(client,businessId,row.sourceId);
   if(!source||source.worker_id!==userId||source.booking_id!==row.bookingId)throw Error('Earnings history unavailable');
   const review=teamEarningsReview([source],businessId)[0];if(review.originalCents!==row.amountCents)throw Error('Earnings history mismatch');row.review=review;
  }
 }
 return {rows,hasNext:data.data.length>50};
}
export function renderCleanerPortal(business,section,{rows=[],profile,hasNext=false},page=0){
 const root='/cleaner?business='+encodeURIComponent(business.id),link=s=>root+'&amp;view='+s;
 let html=moduleHeading({title:titles[section],business,description:'Your work and records for this business.'})+`<nav class="catalogue-tabs" aria-label="Cleaner portal">${Object.entries(titles).map(([s,t])=>`<a href="${link(s)}"${s===section?' aria-current="page"':''}>${t}</a>`).join('')}</nav>`;
 if(section==='profile')return html+`<section class="panel"><h2>${esc(profile.displayName||'Cleaner profile')}</h2><dl><dt>Contact number</dt><dd>${esc(profile.phone||'Not recorded')}</dd><dt>Business role</dt><dd>Cleaner</dd></dl><p>Ask the business owner to correct your saved profile or access.</p></section>`;
 if(section==='earnings')html+='<p class="scope">SYNTHETIC STAGING ONLY. Agreed amounts, accrued originals, corrections and reimbursements are separate. Customer payment does not create earnings. Settlement simulations are not bank payments.</p>';
 for(const r of rows){
  if(section==='earnings')html+=`<article class="panel"><h2>${esc(r.period)} · ${money(r.amountCents)}</h2><p>Booking ${esc(r.bookingId)} · Agreement version ${esc(r.originalVersion)}</p><p>${r.accrued?'Accrued original':'Verified agreement — not accrued'}</p>${r.review?`<dl><dt>Original earnings</dt><dd>${money(r.review.originalCents)}</dd><dt>Earnings after approved corrections</dt><dd>${money(r.review.reviewedCents)}</dd><dt>Approved reimbursements (separate)</dt><dd>${money(r.review.reimbursementCents)}</dd></dl><p>${r.review.pending} pending adjustments · ${r.review.disputed?'Dispute under review':'No adjustment dispute'}</p><a href="/earnings-adjustments?business=${encodeURIComponent(business.id)}&amp;source=${encodeURIComponent(r.sourceId)}">Explanation and correction history</a>`:''}</article>`;
  else html+=`<article class="panel"><h2>${esc(r.customerName||'Assigned visit')}</h2>${localDateTime(r.localStart)}<p>${esc(r.timeZone)} · ${esc(r.durationMinutes)} minutes</p>${statusBadge(r.status,bookingStatuses[r.status]??r.status)}<p>${['address_line','suburb','city','postal_code'].map(k=>esc(r.address?.[k])).filter(Boolean).join(', ')}</p>${section==='jobs'?`<p>${esc(r.address?.access_notes)}</p>`:''}<p>Booking ${esc(r.id)}</p></article>`;
 }
 if(!rows.length)html+='<section class="panel"><h2>No records on this page</h2><p>Only your own records in this business appear here.</p></section>';
 if(section==='earnings')html+=`<p><a href="/monthly-settlements?business=${encodeURIComponent(business.id)}">My monthly settlement reviews and references</a></p>`;
 return html+`<nav aria-label="Records pages">${page?`<a href="${link(section)}&amp;page=${page-1}">Previous</a> `:''}${hasNext?`<a href="${link(section)}&amp;page=${page+1}">Next</a>`:''}</nav>`;
}
