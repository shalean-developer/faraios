import {validCustomerId} from './customers.js';
import {bookingStatuses} from './bookings.js';
import {escapeHtml as esc,localDateTime,statusBadge} from './workspace-layout.js';

const fields='id,business_id,customer_id,local_start,time_zone,starts_at,status,price_lines';
const historyLimit=200;

// Called only after the office customer route verifies membership and customer scope.
// Filter in the database before limiting; names and browser claims are not identities.
export async function readCustomerBookingHistory(client,businessId,customerId){
 if(!validCustomerId(businessId)||!validCustomerId(customerId))throw new Error('Booking history unavailable');
 const {data,error}=await client.from('one_off_bookings').select(fields)
  .eq('business_id',businessId).eq('customer_id',customerId)
  .order('starts_at',{ascending:false}).order('id',{ascending:false}).limit(historyLimit+1);
 if(error||!Array.isArray(data)||data.some(row=>row.business_id!==businessId||row.customer_id!==customerId))throw new Error('Booking history unavailable');
 return {bookings:data.slice(0,historyLimit),hasMore:data.length>historyLimit};
}

export function renderCustomerBookingHistory(business,{bookings,hasMore}){
 const base='/bookings?business='+encodeURIComponent(business.id);
 return `<section class="panel" aria-labelledby="customer-booking-history"><h2 id="customer-booking-history">Booking history</h2><p class="muted">${hasMore?'Showing the latest 200 scheduled visits. Older visits are not shown.':'Latest scheduled visits first.'} Includes upcoming, completed and cancelled bookings.</p>${bookings.length?bookings.map(row=>`<article class="address-row"><div><h3>${esc(row.price_lines?.[0]?.name||'Booking')}</h3>${localDateTime(row.local_start)}<p class="muted">${esc(row.time_zone)}</p>${statusBadge(row.status,bookingStatuses[row.status]??row.status)}</div><a class="row-action" href="${base}&amp;booking=${encodeURIComponent(row.id)}" aria-label="Open booking ${esc(row.id)}">Open booking <span aria-hidden="true">→</span></a></article>`).join(''):'<p>No bookings for this customer in this business yet.</p>'}</section>`;
}
