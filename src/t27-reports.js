import {canAccess} from './access.js';
import {readOperationalReport} from './t27-report-api.js';
import {escapeHtml as esc} from './workspace-layout.js';
const metrics=[
 ['bookingsInPeriod','Bookings scheduled in period','count'],
 ['bookingValueCents','Non-Draft, non-cancelled booking value','money'],
 ['unassignedWork','Confirmed, unassigned work (current)','count'],
 ['awaitingAssessment','Awaiting office assessment (current)','count'],
 ['failedNotificationJobs','Failed notification jobs (current)','count'],
 ['verifiedOnlineCreditsCents','Verified online credits','money'],
 ['verifiedEftReceiptsCents','Verified EFT receipts','money'],
 ['allocatedVerifiedEftCents','Verified EFT allocated to invoices','money'],
 ['internalDraftInvoicesCents','Internal draft invoices (not issued)','money'],
 ['issuedInvoicesCents','Issued invoice value (not verified)','money'],
 ['issuedOutstandingCents','Issued outstanding balance (not verified)','money'],
 ['approvedReimbursementsCents','Approved reimbursements','money'],
 ['accruedEarningsCents','Accrued synthetic earnings','money'],
 ['clearedPayoutsCents','Cleared synthetic payouts','money']
];
export function reportDates(params,today){
 const from=params.get('from')??today.slice(0,7)+'-01', through=params.get('through')??today;
 const valid=s=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'));
 if(!valid(from)||!valid(through)||from>through||(Date.parse(through)-Date.parse(from))/86400000>366)throw Object.assign(Error('Choose a valid date range of up to 367 calendar days.'),{status:400});
 return {from,through};
}
export async function collectReports(client,identity,selected,from,through){
 const businesses=identity.businesses.filter(b=>identity.businessIds.includes(b.id)&&
 canAccess({userId:identity.userId,businessId:b.id,permission:'finance.read',memberships:identity.memberships}));
 if(selected!=='all'&&!businesses.some(b=>b.id===selected))throw Object.assign(Error('Report access denied'),{status:403});
 const visible=businesses.filter(b=>selected==='all'||b.id===selected);
 const rows=[];for(const b of visible){rows.push({business:b,report:await readOperationalReport(client,b.id,from,through)});}
 return rows;
}
export function renderReports(rows,{from,through,selected}){
 const totals=Object.fromEntries(metrics.map(([k])=>[k,rows.some(row=>row.report[k]===null||row.report[k]===undefined)?null:rows.reduce((sum,row)=>{
  const raw=row.report[k];if(raw===null||raw===undefined)return sum;const n=Number(raw);if(!Number.isSafeInteger(n)||n<0)throw Error('Report metric invalid');return sum+n;
 },0)]));
 const display=(key,value)=>value===null||value===undefined?'Not verified':key.endsWith('Cents')?'R '+(value/100).toFixed(2):String(value);
 const block=(name,values)=>'<section class="panel"><h2>'+esc(name)+'</h2><dl>'+metrics.map(([k,label])=>
 '<div class="business-row"><dt>'+esc(label)+'</dt><dd>'+esc(display(k,values[k]))+'</dd></div>').join('')+'</dl></section>';
 return '<h1>Reports and operational overview</h1><p>Staging records only. Booking value is not revenue; invoices, receipts, earnings, reimbursements and payouts are different financial stages. No external alerts are sent.</p>'+
 '<form method="get" action="/reports"><label>Business <select name="business"><option value="all"'+(selected==='all'?' selected':'')+'>Authorised combined view</option>'+
 rows.map(({business})=>'<option value="'+esc(business.id)+'"'+(selected===business.id?' selected':'')+'>'+esc(business.name)+'</option>').join('')+'</select></label>'+
 '<label>From <input type="date" name="from" value="'+esc(from)+'"></label><label>Through <input type="date" name="through" value="'+esc(through)+'"></label><button>Apply</button></form>'+
 (rows.length>1?block('Combined authorised businesses',totals):'')+
 rows.map(({business,report})=>block(business.name,report)).join('')+
 (rows.length?'':'<p>No permitted financial reports for this account.</p>');
}
