import {cleanerPortalData,renderCleanerPortal} from './cleaner-portal.js';
import {earningsOperation,earningsFormInput,renderEarningsWorkspace} from './earnings-workspace.js';
import {eftOperation,renderEft} from './t21-eft.js';
import {listMonthlyStatements,readMonthlyStatement,appendMonthlyStatement,renderMonthlyStatements,settlementPreparerActions} from './monthly-settlements.js';
import {readVatSettings,saveVatSettings} from './vat.js';
import {listAdjustmentSources,readAdjustmentSource,appendAdjustmentReview,renderAdjustmentReviews,teamEarningsReview} from './adjustment-reviews.js';
import {listCancellationCases,readCancellationCase,appendCancellationCase,renderCancellationCases} from './cancellation-cases.js';
import {readSupervisorAllowances,saveSupervisorAllowance,renderSupervisorAllowances,previewMonthlyEarnings,allowanceMonth} from './supervisor-allowances.js';
import {parseEarningsRule,parseRand,listEarningsRules,saveEarningsRule,previewEarnings,renderEarningsRules,templateRule} from './earnings.js';
import {listInvoices,readInvoice,bookingInvoice,accountingConnection,invoiceTotals,prepareInvoice,saveAccountingConnection,syncInvoice,enqueueCustodyInvoice,renderInvoices} from './invoices.js';
import {listQuotes,readQuote,quoteHandoff,quoteAcceptanceActor,createQuote,changeQuote,convertQuote,renderQuotes} from './quotes.js';
import {listRecurring,readRecurring,recurringVisits,createRecurring,changeRecurring,generateRecurring,renderRecurring} from './recurring.js';
import {calendarOptions,readCalendar,checkAvailability,renderCalendar} from './calendar.js';
import {staffAccounts,listStaffRecords,parseStaffRecord,saveStaffRecord,resolveAssignedTeam,renderStaffTeams} from './staff-teams.js';
import {renderWorkspaceFrame} from './workspace-layout.js';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createAuthSessions} from './auth-session.js';
import {hostedRequestAllowed,stagingOrigin} from './hosted-staging.js';
import {parseBusinessSettings,readBusinessSettings,saveBusinessSettings,renderBusinessSettings} from './business-settings.js';
import {parseCatalogueItem,listCatalogue,saveCatalogueItem,deleteCatalogueItem,renderCatalogueDelete,renderCatalogueDeactivate,renderCatalogue} from './catalogue.js';
import {parseCustomerForm,listCustomers,readCustomer,listAddresses,readAddress,saveCustomerRecord,renderCustomers} from './customers.js';
import {bookingContext,listBookings,readBooking,parseBookingCreate,createBooking,updateBooking,renderBookings} from './bookings.js';
import {renderWorkspace} from './workspace.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const pageHtml=(title,body,business=null,identity=null,active='/dashboard',restoreTest=false)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · FaraiOS ${restoreTest?'restore test':'staging'}</title><link rel="stylesheet" href="/style.css"><script type="module" src="/dropdown.js"></script><script type="module" src="/date-time-picker.js"></script><script type="module" src="/catalogue-setup.js"></script>${title==='Quotes'?'<script type="module" src="/quote-detail.js"></script>':''}</head><body${business&&identity?' class="workspace-layout"':''}><div class="notice">FaraiOS ${restoreTest?'RESTORE TEST · Read-only recovery workspace · Integrations disabled':'STAGING · Test workspace · No production data'}</div>${business&&identity?renderWorkspaceFrame(identity,business,body,active):`<main class="${title==='Sign in'?'login':'workspace-page'}">${title==='Sign in'?'<div class="brand">FaraiOS</div>':''}${body}</main>`}</body></html>`;
const form=(message,restoreTest=false)=>pageHtml('Sign in',`<h1>Welcome back</h1><p>${restoreTest?'Use your restored FaraiOS test account.':'Use your FaraiOS staging test account.'}</p>${message?`<p role="alert">${esc(message)}</p>`:''}<form method="post" action="/login" class="panel"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" maxlength="254" required style="display:block;width:100%;padding:12px;margin:8px 0 20px"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required style="display:block;width:100%;padding:12px;margin:8px 0 20px"><button type="submit">Sign in</button><p class="muted">Accounts are provisioned in staging. Never enter a production password here.</p></form>`,null,null,'/dashboard',restoreTest);

export function createStagingServer({createClient,paymentProxy=null,paymentSetupProxy=null,accountingWorker=null,accountingAdapter=null,accountingProxy=null,accountingConnectionOnly=false,now=()=>Date.now(),restoreTest=false,earningsTemplates={},hostedStaging=false,hostedFingerprint=null,hostedTransport='passenger',hostedReady=()=>false}){
  if(typeof hostedStaging!=='boolean'||hostedStaging&&(!['passenger','litespeed'].includes(hostedTransport)||restoreTest||accountingWorker||accountingAdapter||!/^[a-f0-9]{64}$/.test(hostedFingerprint??'')))throw new Error('Invalid hosted staging server');
  if(process.env.NODE_ENV==='production'&&!hostedStaging)throw new Error('Local staging server cannot run in production');
  if(typeof restoreTest!=='boolean'||restoreTest&&(accountingWorker||accountingAdapter||accountingProxy))throw new Error('Invalid isolated restore server');
  if(accountingProxy!==null&&typeof accountingProxy!=='function'||accountingProxy&&(accountingWorker||accountingAdapter))throw new Error('Choose one accounting runtime');
  if(typeof accountingConnectionOnly!=='boolean'||accountingConnectionOnly&&!accountingProxy)throw new Error('Invalid connection-only accounting runtime');
  if(paymentProxy!==null&&(typeof paymentProxy!=='function'||!hostedStaging||restoreTest))throw new Error('Invalid TEST payment runtime');
  if(paymentSetupProxy!==null&&(typeof paymentSetupProxy!=='function'||!hostedStaging||restoreTest))throw new Error('Invalid TEST payment setup');
  const cookieName=hostedStaging?'__Host-faraios_staging':restoreTest?'faraios_restore_test':'faraios_staging';
  const secure=hostedStaging?'; Secure':'';
  const loginForm=message=>form(message,restoreTest);
  const auth=createAuthSessions({createClient,now});let failures=[];
  const server=createServer(async(req,res)=>{
    let headerBusiness=null,headerIdentity=null,activePath='/dashboard';
    const readIdentity=async sessionId=>(headerIdentity=await auth.read(sessionId));
    const html=(title,body)=>pageHtml(title,body,headerBusiness,headerIdentity,activePath,restoreTest);
    const expected=`127.0.0.1:${server.address()?.port}`, origin=hostedStaging?stagingOrigin:`http://${expected}`;
    const send=(code,body,type='text/html; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);};
    const redirect=path=>{res.writeHead(303,{Location:path,'Cache-Control':'no-store'});res.end();};
    const clear=()=>res.setHeader('Set-Cookie',cookieName+'=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'+secure);
    try{
      const privateListenerReady=hostedStaging&&hostedTransport==='litespeed'&&hostedReady()===true;
      if(hostedStaging&&hostedTransport==='litespeed'&&!privateListenerReady)return send(503,'Staging transport not ready','text/plain');
      if(hostedStaging?!hostedRequestAllowed(req,hostedTransport,privateListenerReady):req.headers.host!==expected||!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress))return send(403,hostedStaging?'HTTPS staging access required':'Local access only','text/plain');
      if(hostedStaging){
        res.setHeader('X-Robots-Tag','noindex, nofollow, noarchive');
        res.setHeader('Strict-Transport-Security','max-age=31536000');
        if(req.method!=='GET'&&req.headers.origin!==origin&&!(paymentProxy&&req.method==='POST'&&/^\/payments\/[0-9a-f-]{36}\/webhook$/i.test(req.url)))return send(403,'Origin rejected','text/plain');
      }
      const url=new URL(req.url,origin),id=req.headers.cookie?.match(new RegExp('(?:^|;\\s*)'+cookieName+'=([a-f0-9-]+)'))?.[1];
      if(hostedStaging&&req.method==='GET'&&url.pathname==='/environment-health')return send(200,JSON.stringify({environment:'staging',transport:hostedTransport,transportSecurity:hostedTransport==='litespeed'?'managed-tls-edge':'passenger-protected-https',projectRef:'xdmfyrsauvqznkloroxg',sourceFingerprint:hostedFingerprint,appPaymentDispatch:paymentProxy?'test-only':'disabled',appNotificationDispatch:'disabled',authEmailSafeguard:'requires-independent-verification',accountingWorker:'disabled'}),'application/json');
      activePath=url.pathname;
      if(restoreTest&&req.method!=='GET'&&!(req.method==='POST'&&['/login','/logout'].includes(url.pathname)))return send(405,'Restore test: business writes are disabled','text/plain');
      if(restoreTest&&req.method==='GET'&&url.pathname==='/restore-health')return send(200,JSON.stringify({environment:'restore-test',businessWrites:'disabled',accountingWorker:'disabled'}),'application/json');
      if(paymentSetupProxy&&/^\/payments\/[0-9a-f-]{36}\/settings$/i.test(url.pathname))return await paymentSetupProxy({req,res,auth,origin,cookieName});
      if(paymentProxy&&url.pathname.startsWith('/payments/'))return await paymentProxy({req,res,auth,origin,cookieName});
      if(accountingProxy&&url.pathname.startsWith('/accounting/'))return await accountingProxy({req,res,auth,origin,cookieName});
      if(req.method==='GET'&&url.pathname==='/date-time-values.js')return send(200,await readFile(new URL('../public/date-time-values.js',import.meta.url),'utf8'),'text/javascript; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/date-time-picker.js')return send(200,await readFile(new URL('../public/date-time-picker.js',import.meta.url),'utf8'),'text/javascript; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/dropdown.js')return send(200,await readFile(new URL('../public/dropdown.js',import.meta.url),'utf8'),'text/javascript; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/catalogue-setup.js')return send(200,await readFile(new URL('../public/catalogue-setup.js',import.meta.url),'utf8'),'text/javascript; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/quote-detail.js')return send(200,await readFile(new URL('../public/quote-detail.js',import.meta.url),'utf8'),'text/javascript; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/style.css')return send(200,await readFile(new URL('../public/style.css',import.meta.url),'utf8'),'text/css');
      if(req.method==='GET'&&(url.pathname==='/login'||url.pathname==='/'))return send(200,loginForm(''));
      if(url.pathname==='/cleaner'){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        if(req.method!=='GET')return send(405,'Cleaner portal is read-only','text/plain');
        const view=url.searchParams.get('view')??'jobs',raw=url.searchParams.get('page')??'0';
        if(!['jobs','schedule','earnings','profile'].includes(view)||!/^(0|[1-9]\d{0,6})$/.test(raw)||Number(raw)>1000000)return send(400,'Invalid portal page','text/plain');
        return await auth.withCleanerPortal(id,url.searchParams.get('business'),async(client,business,userId)=>{
          headerBusiness=business;
          const data=await cleanerPortalData(client,business.id,userId,view,Number(raw));
          return send(200,html('Cleaner portal',renderCleanerPortal(business,view,data,Number(raw))));
        });
      }
      if(url.pathname==='/earnings'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        let data=null;
        if(req.method==='POST'){
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>24000)return send(413,'Form too large','text/plain');}data=new URLSearchParams(body);
        }
        return await auth.withEarningsRules(id,url.searchParams.get('business'),req.method==='POST',async(client,business,owner)=>{
          headerBusiness=business;const bookingId=url.searchParams.get('booking'),rawPage=url.searchParams.get('page')??'0';
          if(!/^(0|[1-9]\d{0,6})$/.test(rawPage))return send(400,'Invalid earnings page','text/plain');
          const page=Number(rawPage);let context=null,rows=[];
          try{
            if(bookingId)context=await earningsOperation(client,'context',{businessId:business.id,bookingId});
            else rows=await earningsOperation(client,'list',{businessId:business.id,page});
          }catch{return send(422,html('Earnings',renderEarningsWorkspace(business,{owner,error:'Earnings unavailable. Verify business access and the approved staging schema.'})));}
          const show=error=>html('Earnings',renderEarningsWorkspace(business,{rows,context,owner,page,error,values:data}));
          if(req.method==='GET')return send(200,show(''));
          try{
            const input=earningsFormInput(data,business.id,context);
            await earningsOperation(client,data.get('action'),input);
            return redirect('/earnings?business='+encodeURIComponent(business.id)+'&booking='+encodeURIComponent(context.bookingId));
          }catch(error){return send(error.status??422,show(error.message));}
        });
      }
      if(url.pathname==='/monthly-settlements'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        let data=null;
        if(req.method==='POST'){
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>24000)return send(413,'Form too large','text/plain');}data=new URLSearchParams(body);
        }
        return await auth.withAdjustmentReviews(id,url.searchParams.get('business'),async(client,business,role,userId)=>{
          headerBusiness=business;const statementId=url.searchParams.get('statement');
          const record=statementId?await readMonthlyStatement(client,business.id,statementId):null;
          if(statementId&&(!record||role==='staff'&&record.worker_id!==userId))return send(404,'Statement unavailable','text/plain');
          const rows=!record?(await listMonthlyStatements(client,business.id)).filter(s=>role!=='staff'||s.worker_id===userId):[];
          let workers=[];if(!record&&role!=='staff'){
            workers=await staffAccounts(client,business.id);
          }
          const show=options=>html('Monthly settlement reviews',renderMonthlyStatements(business,{record,rows,workers,role,...options}));
          if(req.method==='GET')return send(200,show({}));
          if(role==='staff'&&data.get('action')!=='dispute'||role==='manager'&&!settlementPreparerActions.includes(data.get('action')))return send(403,'Owner approval required','text/plain');
          if(record&&data.get('action')==='create'||!record&&data.get('action')!=='create')return send(400,'Choose a statement action','text/plain');
          try{
            const saved=await appendMonthlyStatement(client,{businessId:business.id,record,form:data,role,userId});
            return redirect('/monthly-settlements?business='+encodeURIComponent(business.id)+'&statement='+encodeURIComponent(saved));
          }catch(error){return send(error.status??422,show({message:error.message,error:true,values:data}));}
        });
      }
      if(url.pathname==='/earnings-adjustments'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        let data=null;
        if(req.method==='POST'){
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>24000)return send(413,'Form too large','text/plain');}data=new URLSearchParams(body);
        }
        return await auth.withAdjustmentReviews(id,url.searchParams.get('business'),async(client,business,role,userId)=>{
          headerBusiness=business;const sourceId=url.searchParams.get('source'),bookingId=url.searchParams.get('booking');
          if(sourceId&&bookingId)return send(400,'Choose one source or booking','text/plain');
          if(bookingId&&role==='staff')return send(403,'Assigned source reviews only','text/plain');
          const record=sourceId?await readAdjustmentSource(client,business.id,sourceId):null;
          if(sourceId&&(!record||role==='staff'&&record.worker_id!==userId))return send(404,'Source unavailable','text/plain');
          const booking=bookingId?await readBooking(client,business.id,bookingId):null;
          if(bookingId&&!booking)return send(404,'Booking unavailable','text/plain');
          const rows=!record&&!booking?(await listAdjustmentSources(client,business.id)).filter(r=>role!=='staff'||r.worker_id===userId):[];
          const team=[];
          for(const row of rows){
            const source=await readAdjustmentSource(client,business.id,row.id);
            if(!source||role==='staff'&&source.worker_id!==userId)throw new Error('Team review source unavailable');
            team.push(...teamEarningsReview([source],business.id));
          }
          const show=options=>html('Earnings adjustments',renderAdjustmentReviews(business,{record,booking,rows,team,role,...options}));
          if(req.method==='GET')return send(200,show({}));
          try{
            if(role==='staff'&&!['raise_dispute','request_review'].includes(data.get('action')))return send(403,'Own review requests only','text/plain');
            if(role!=='owner'&&!['register_source','propose','raise_dispute','request_review'].includes(data.get('action')))return send(403,'Owner approval required','text/plain');
            const saved=await appendAdjustmentReview(client,{businessId:business.id,booking,record,form:data,role,userId});
            return redirect('/earnings-adjustments?business='+encodeURIComponent(business.id)+'&source='+encodeURIComponent(saved));
          }catch(error){return send(error.status??422,show({message:error.message,error:true,values:data}));}
        });
      }
      if(url.pathname==='/cancellations'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        let data=null;
        if(req.method==='POST'){
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>32768)return send(413,'Form too large','text/plain');}data=new URLSearchParams(body);
        }
        return await auth.withEarningsRules(id,url.searchParams.get('business'),req.method==='POST'&&data.get('action')!=='prepare',async(client,business,owner)=>{
          headerBusiness=business;
          const caseId=url.searchParams.get('case'),bookingId=url.searchParams.get('booking');
          if(caseId&&bookingId)return send(400,'Choose one review','text/plain');
          const record=caseId?await readCancellationCase(client,business.id,caseId):null;
          if(caseId&&!record)return send(404,'Review unavailable','text/plain');
          const booking=bookingId?await readBooking(client,business.id,bookingId):null;
          if(bookingId&&!booking)return send(404,'Booking unavailable','text/plain');
          const show=async options=>html('Cancellation reviews',renderCancellationCases(business,{rows:!record&&!booking?await listCancellationCases(client,business.id):[],booking,record,owner,...options}));
          if(req.method==='GET')return send(200,await show({}));
          try{
            if(!booking&&!record)throw new Error('Choose a booking or review');
            const saved=await appendCancellationCase(client,{businessId:business.id,booking,record,form:data});
            return redirect('/cancellations?business='+encodeURIComponent(business.id)+'&case='+encodeURIComponent(saved));
          }catch(error){return send(error.status??422,await show({message:error.message,error:true,values:data}));}
        });
      }
      if(url.pathname==='/supervisor-allowances'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        activePath='/earnings-rules';
        let data=null;
        if(req.method==='POST'){
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(413,'Form too large','text/plain');}data=new URLSearchParams(body);
        }
        return await auth.withEarningsRules(id,url.searchParams.get('business'),req.method==='POST'&&data.get('action')!=='preview',async(client,business,owner)=>{
          headerBusiness=business;
          const saved=await readSupervisorAllowances(client,business.id);
          const accounts=await staffAccounts(client,business.id),profiles=await listStaffRecords(client,business.id,'profile');
          const userId=url.searchParams.get('staff');
          if(userId&&!accounts.some(a=>a.user_id===userId)&&!saved.changes.some(r=>r.user_id===userId))return send(404,'Staff account unavailable','text/plain');
          const show=options=>html('Supervisor allowances',renderSupervisorAllowances(business,{...saved,accounts,profiles},{owner,userId,...options}));
          if(req.method==='GET')return send(200,show({message:url.searchParams.get('saved')==='1'?'Allowance change saved. No payment has been activated.':''}));
          try{
            if(!userId)throw new Error('Choose a staff account.');
            if(data.get('action')==='save'){
              await saveSupervisorAllowance(client,business.id,userId,data);
              return redirect('/supervisor-allowances?business='+encodeURIComponent(business.id)+'&staff='+encodeURIComponent(userId)+'&saved=1');
            }
            if(data.get('action')!=='preview')throw new Error('Choose an allowance action.');
            const month=data.get('preview_month');allowanceMonth(month);
            const bookingCents=(data.get('booking_earnings')??'').trim()===''?null:parseRand(data.get('booking_earnings'));
            const preview=previewMonthlyEarnings({businessId:business.id,userId,month,changes:saved.changes,bookingCents});
            return send(200,show({month,preview}));
          }catch(error){return send(error.status??422,show({values:data.get('action')==='save'&&error.status!==409?Object.fromEntries(data):null,message:error.message,error:true}));}
        });
      }
      if(url.pathname==='/earnings-rules'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        // Preview is read-only, but saves require a freshly resolved owner membership.
        let data=null;
        if(req.method==='POST'){
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)return send(413,'Form too large','text/plain');}data=new URLSearchParams(body);
        }
        return await auth.withEarningsRules(id,url.searchParams.get('business'),req.method==='POST'&&data.get('action')!=='preview',async(client,business,owner)=>{
          headerBusiness=business;
          const services=(await listCatalogue(client,business.id)).filter(s=>s.kind==='service'),rules=await listEarningsRules(client,business.id),serviceId=url.searchParams.get('service'),service=serviceId?services.find(s=>s.id===serviceId):null;
          if(serviceId&&!service)return send(404,'Service unavailable','text/plain');
          const existing=service?rules.find(r=>r.service_id===service.id):null;
          const show=options=>html('Earnings rules',renderEarningsRules(business,services,rules,{owner,service,template:earningsTemplates[business.id]??null,...options}));
          if(req.method==='GET'){
            const method=url.searchParams.get('method');
            if(method&&!['fixed_per_worker','percentage_pool'].includes(method))return send(400,'Invalid earnings method','text/plain');
            const suggested=service?templateRule(earningsTemplates[business.id],service):null;
            const values=method?{model:method,...(existing?.model===method?existing:suggested?.model===method?suggested:{})}:null;
            return send(200,show({values,message:url.searchParams.get('saved')==='1'?'Setup saved. Existing agreements are unchanged.':''}));
          }
          try{
            if(!service)throw new Error('Choose a service.');
            if(data.get('action')==='save'){
              await saveEarningsRule(client,business.id,service.id,data,existing);
              return redirect('/earnings-rules?business='+encodeURIComponent(business.id)+'&service='+encodeURIComponent(service.id)+'&saved=1');
            }
            if(data.get('action')!=='preview'||!existing)throw new Error('Save setup before previewing.');
            const count=data.get('cleaners'),duration=data.get('duration');
            if(!/^[1-9]\d{0,2}$/.test(count??'')||Number(count)>100||!/^\d{1,4}$/.test(duration??''))throw new Error('Check the cleaner count and visit duration.');
            const workerIds=Array.from({length:Number(count)},(_,i)=>'00000000-0000-4000-8000-'+String(i+1).padStart(12,'0'));
            const preview=previewEarnings({businessId:business.id,serviceId:service.id,rule:existing,eligibleCents:existing.model==='percentage_pool'?parseRand(data.get('eligible')):null,workerIds,durationMinutes:Number(duration),agreementKind:'new'});
            return send(200,show({preview}));
          }catch(error){if(error.status===409)return send(409,show({owner:false,message:error.message,error:true}));let values=null;if(data.get('action')==='save')try{values=parseEarningsRule(data);}catch{values={model:data.get('model'),raw:Object.fromEntries(data)};}return send(error.status??422,show({values,message:error.message,error:true}));}
        });
      }
      if(url.pathname==='/eft'&&paymentProxy&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withInvoices(id,url.searchParams.get('business'),async(client,business)=>{
          headerBusiness=business;
          if(req.method==='POST'){
            if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
            if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
            let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>4096)return send(413,'Form too large','text/plain');}
            const f=new URLSearchParams(body),action=f.get('action');
            const expected={record:['action','requestId','bankReference','evidenceReference','amount','receivedOn'],verify:['action','receiptId','confirmed'],allocate:['action','receiptId','invoiceId']}[action];
            if(!expected||[...f.keys()].length!==expected.length||expected.some(k=>f.getAll(k).length!==1)||action==='verify'&&f.get('confirmed')!=='yes')return send(400,'Invalid EFT action','text/plain');
            try{
              const input={businessId:business.id};for(const k of expected)if(!['action','confirmed'].includes(k))input[k==='amount'?'amountCents':k]=k==='amount'?parseRand(f.get(k)):f.get(k);
              await eftOperation(client,action,input);
              return redirect('/eft?business='+encodeURIComponent(business.id));
            }catch{
              // Re-read persisted evidence after rejection or an uncertain response.
              // Never imply a financial operation failed or succeeded from transport alone.
              const receipts=await eftOperation(client,'list',{businessId:business.id,page:0});
              return send(409,html('Manual EFT reconciliation',renderEft(business,receipts,null,0,'EFT action could not be confirmed. Review the saved evidence below, the invoice balance and any existing online attempts before retrying.')));
            }
          }
          const page=Number(url.searchParams.get('page')??0);
          if(!Number.isInteger(page)||page<0||page>9999999)return send(400,'Invalid evidence page','text/plain');
          const status=url.searchParams.has('invoice')?await eftOperation(client,'status',{businessId:business.id,invoiceId:url.searchParams.get('invoice')}):null;
          return send(200,html('Manual EFT reconciliation',renderEft(business,await eftOperation(client,'list',{businessId:business.id,page}),status,page)));
        });
      }
      if(url.pathname==='/invoices'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withInvoices(id,url.searchParams.get('business'),async(client,business,actor,owner)=>{
          headerBusiness=business;
          const invoiceId=url.searchParams.get('invoice'),bookingId=url.searchParams.get('booking'),settings=url.searchParams.get('settings')==='1';
          if([Boolean(invoiceId),Boolean(bookingId),settings].filter(Boolean).length>1)return send(400,'Choose one invoice view','text/plain');
          let invoice=invoiceId?await readInvoice(client,business.id,invoiceId):null;
          const booking=invoice?await readBooking(client,business.id,invoice.booking_id):bookingId?await readBooking(client,business.id,bookingId):null;
          if(invoiceId&&!invoice||bookingId&&!booking||invoice&&!booking)return send(404,'Invoice or booking unavailable','text/plain');
          if(bookingId&&req.method==='GET'){const existing=await bookingInvoice(client,business.id,bookingId);if(existing)return redirect('/invoices?business='+encodeURIComponent(business.id)+'&invoice='+encodeURIComponent(existing.id));}
          const show=async(options={})=>html('Invoices',renderInvoices(business,invoice||booking||settings?[]:await listInvoices(client,business.id),{invoice,booking,connection:await accountingConnection(client,business.id),totals:invoice||booking||settings?null:await invoiceTotals(client,business.id),owner,settings,workerConfigured:!accountingConnectionOnly&&Boolean(accountingProxy||accountingWorker&&accountingAdapter),accountingRuntimeAvailable:Boolean(accountingProxy),paymentStatus:paymentProxy&&invoice?await eftOperation(client,'status',{businessId:business.id,invoiceId:invoice.id}):null,...options}));
          if(req.method==='GET')return send(200,await show({message:url.searchParams.get('saved')==='1'?'Saved. Accounting status is shown below.':''}));
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(413,'Form too large','text/plain');}
          const data=new URLSearchParams(body);
          try{
            const action=data.get('action');
            if(action==='configure'&&settings){if(!owner)return send(403,'Owner access required','text/plain');await saveAccountingConnection(client,business.id,data);return redirect('/invoices?business='+encodeURIComponent(business.id)+'&settings=1&saved=1');}
            let saved=invoiceId;
            if(action==='prepare'&&booking&&!invoice)saved=await prepareInvoice(client,business.id,booking.id);
            else if(action==='sync'&&invoice){if(accountingConnectionOnly)throw new Error('Invoice syncing is not enabled for this connection-only setup.');if(booking.status==='cancelled')throw new Error('Cancelled booking needs accounting review.');
              if(accountingProxy)await enqueueCustodyInvoice(client,business.id,invoice.id,(data.get('external_customer_id')??'').trim());
              else await syncInvoice({worker:accountingWorker,adapter:accountingAdapter,businessId:business.id,invoice,actor,customerId:(data.get('external_customer_id')??'').trim()});}
            else throw new Error('Choose an invoice action.');
            return redirect('/invoices?business='+encodeURIComponent(business.id)+'&invoice='+encodeURIComponent(saved)+'&saved=1');
          }catch(error){if(invoiceId)invoice=await readInvoice(client,business.id,invoiceId);return send(error.status??422,await show({message:error.message,error:true}));}
        });
      }
      if(url.pathname==='/quotes'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withQuotes(id,url.searchParams.get('business'),async(client,business)=>{
          headerBusiness=business;
          const quoteId=url.searchParams.get('quote');let quote=quoteId?await readQuote(client,business.id,quoteId):null;
          if(quoteId&&!quote)return send(404,'Quote unavailable','text/plain');
          let data=null;
          if(req.method==='POST'){
            if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
            if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
            let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>65536)return send(413,'Form too large','text/plain');}
            data=new URLSearchParams(body);
          }
          const customerId=quote?null:data?.get('customer_id')??url.searchParams.get('customer');
          const customer=customerId?await readCustomer(client,business.id,customerId):null;
          if(customerId&&(!customer||!customer.is_active))return send(404,'Customer unavailable','text/plain');
          const catalogue=quote?[]:await listCatalogue(client,business.id);
          const show=async(options={})=>html('Quotes',renderQuotes(business,await listQuotes(client,business.id),{quote,handoff:quote?await quoteHandoff(client,business.id,quote):null,actor:quote?await quoteAcceptanceActor(client,business.id,quote):null,customer,customers:quote?[]:await listCustomers(client,business.id),addresses:customer?await listAddresses(client,business.id,customer.id):[],catalogue,creating:!quote&&(url.searchParams.get('create')==='1'||Boolean(customer)||Boolean(data)),values:{service:data?.get('service_id')??url.searchParams.get('service'),...(data?Object.fromEntries(data):{})},filters:{q:url.searchParams.get('q'),status:url.searchParams.get('status')},...options}));
          if(req.method==='GET')return send(200,await show({message:quote&&url.searchParams.get('saved')==='1'?'Quote saved.':quote?.status==='converted'&&url.searchParams.get('converted')==='1'?'Quote converted. Open the linked booking below.':''}));
          try{
            const action=data.get('action');let saved=quoteId,flag='saved=1';
            if(action==='create'&&!quote&&customer)saved=await createQuote(client,business.id,data,catalogue);
            else if(action==='change'&&quote)await changeQuote(client,business.id,quote.id,data);
            else if(action==='convert'&&quote){await convertQuote(client,business.id,quote.id,data);flag='converted=1';}
            else throw new Error('Choose a quote action.');
            return redirect('/quotes?business='+encodeURIComponent(business.id)+'&quote='+encodeURIComponent(saved)+'&'+flag);
          }catch(error){
            if(quoteId)quote=await readQuote(client,business.id,quoteId);
            return send(error.status??422,await show({message:error.message,error:true}));
          }
        });
      }
      if(url.pathname==='/recurring'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withBookings(id,url.searchParams.get('business'),async(client,business)=>{
          headerBusiness=business;
          const scheduleId=url.searchParams.get('schedule'),sourceId=url.searchParams.get('source');
          const schedule=scheduleId?await readRecurring(client,business.id,scheduleId):null,source=sourceId?await readBooking(client,business.id,sourceId):null;
          if(scheduleId&&!schedule||sourceId&&!source||scheduleId&&sourceId)return send(404,'Recurring schedule or source unavailable','text/plain');
          const show=async(options={})=>html('Recurring bookings',renderRecurring(business,await listRecurring(client,business.id),{schedule,source,visits:schedule?await recurringVisits(client,business.id,schedule.id):[],...options}));
          if(req.method==='GET')return send(200,await show({message:url.searchParams.get('saved')==='1'?'Schedule saved. Created visits are unchanged.':url.searchParams.has('created')?'Created '+url.searchParams.get('created').replace(/[^0-9]/g,'').slice(0,3)+' new draft visits.':''}));
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>8192)return send(413,'Form too large','text/plain');}
          const data=new URLSearchParams(body);
          try{
            const action=data.get('action');let saved=scheduleId,result='saved=1';
            if(action==='create'&&source&&!schedule)saved=await createRecurring(client,business.id,source.id,data);
            else if(action==='change'&&schedule)await changeRecurring(client,business.id,schedule.id,data);
            else if(action==='generate'&&schedule)result='created='+await generateRecurring(client,business.id,schedule.id,data);
            else throw new Error('Choose a schedule action.');
            return redirect('/recurring?business='+encodeURIComponent(business.id)+'&schedule='+encodeURIComponent(saved)+'&'+result);
          }catch(error){return send(error.status??422,await show({values:{...Object.fromEntries(data),weekdays:data.getAll('weekdays')},message:error.message,error:true}));}
        });
      }
      if(url.pathname==='/staff'&&['GET','POST'].includes(req.method)){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withStaff(id,url.searchParams.get('business'),req.method==='POST',async(client,business,canManage)=>{
          headerBusiness=business;
          const kind=url.searchParams.get('view')==='team'?'team':'profile',itemId=url.searchParams.get('item');
          const accounts=await staffAccounts(client,business.id),profiles=await listStaffRecords(client,business.id,'profile'),teams=await listStaffRecords(client,business.id,'team');
          const editing=itemId?(kind==='team'?teams:profiles).find(r=>r.id===itemId):null;
          if(itemId&&!editing)return send(404,'Staff record unavailable','text/plain');
          if(req.method==='GET')return send(200,html('Staff and teams',renderStaffTeams(business,accounts,profiles,teams,canManage,{kind,editing,creating:url.searchParams.get('create')===kind,message:url.searchParams.get('saved')==='1'?'Staff record saved.':''})));
          if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
          if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
          let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>16384)return send(413,'Form too large','text/plain');}
          const data=new URLSearchParams(body);let row;
          try{
            if(data.get('kind')!==kind)throw new Error('Invalid staff record type.');
            row=data.get('action')==='deactivate'&&kind==='team'&&editing?{name:editing.name,members:editing.members,is_active:false}:parseStaffRecord(data,kind);
            if(kind==='profile'&&(!accounts.some(a=>a.user_id===row.user_id)||editing&&editing.user_id!==row.user_id))throw new Error('Select an authorised staff account.');
            if(kind==='team'&&row.members.some(id=>!accounts.some(a=>a.user_id===id))&&(row.is_active||!editing||JSON.stringify(row.members)!==JSON.stringify(editing.members)))throw new Error('Select active staff in this business.');
            const saved=await saveStaffRecord(client,business.id,kind,row,{id:itemId,version:Number(data.get('version'))});
            return redirect('/staff?business='+encodeURIComponent(business.id)+'&view='+kind+(data.get('action')==='deactivate'?'':'&item='+encodeURIComponent(saved))+'&saved=1');
          }catch(error){return send(error.status??422,html('Staff and teams',renderStaffTeams(business,accounts,profiles,teams,canManage,{kind,editing,values:row??{...Object.fromEntries(data),members:data.getAll('members'),is_active:data.get('status')==='active'},message:error.message,error:true})));}
        });
      }
      if(req.method==='POST'){
        if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
        if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>(['/customers','/bookings'].includes(url.pathname)?65536:['/settings','/catalogue'].includes(url.pathname)?32768:4096))return send(413,'Form too large','text/plain');}
        if(url.pathname==='/bookings'){
          if(!await readIdentity(id)){clear();return redirect('/login');}
          return await auth.withBookings(id,url.searchParams.get('business'),async(client,business)=>{
            headerBusiness=business;
            const data=new URLSearchParams(body),bookingId=url.searchParams.get('booking'),ctx=await bookingContext(client,business.id),booking=bookingId?await readBooking(client,business.id,bookingId):null;
            if(bookingId&&!booking)return send(404,'Booking unavailable','text/plain');
            const customerId=data.get('customer_id'),customer=!booking&&customerId?await readCustomer(client,business.id,customerId):null;
            const catalogue=!booking?await listCatalogue(client,business.id):[];
            try{
              if(booking){await updateBooking(client,business.id,booking,['reassign'].includes(data.get('action'))||data.get('action')==='transition'&&data.get('status')==='assigned'?await resolveAssignedTeam(client,business.id,data):data);return redirect('/bookings?business='+encodeURIComponent(business.id)+'&booking='+encodeURIComponent(booking.id)+'&saved=1');}
              if(data.get('action')!=='create'||!customer?.is_active)throw new Error('Select an active customer.');
              const row=parseBookingCreate(data,catalogue),saved=await createBooking(client,business.id,row);
              return redirect('/bookings?business='+encodeURIComponent(business.id)+'&booking='+encodeURIComponent(saved)+'&saved=1');
            }catch(error){return send(error.status??422,html('Bookings',renderBookings(business,await listBookings(client,business.id),ctx,{booking,customers:await listCustomers(client,business.id),customer,addresses:customer?await listAddresses(client,business.id,customer.id):[],catalogue,values:Object.fromEntries(data),message:error.message,error:true,creating:!booking})));}
          });
        }
        if(url.pathname==='/customers'){
          if(!await readIdentity(id)){clear();return redirect('/login');}
          return await auth.withCustomers(id,url.searchParams.get('business'),async(client,business)=>{
            headerBusiness=business;
            const customerId=url.searchParams.get('customer'),addressId=url.searchParams.get('address'),data=new URLSearchParams(body),action=data.get('action');
            if(!['customer','address'].includes(action))return send(400,'Invalid action','text/plain');
            const customer=customerId?await readCustomer(client,business.id,customerId):null;
            if((customerId&&!customer)||(action==='address'&&!customer))return send(404,'Customer unavailable','text/plain');
            if(action==='customer'&&addressId)return send(400,'Invalid address action','text/plain');
            const addresses=customer?await listAddresses(client,business.id,customer.id):[],address=addressId?await readAddress(client,business.id,customerId,addressId):null;
            if(addressId&&!address)return send(404,'Address unavailable','text/plain');
            let row;
            try{row=parseCustomerForm(data,action==='address');const saved=await saveCustomerRecord(client,business.id,row,{id:action==='address'?addressId:customerId,version:Number(data.get('version')),...(action==='address'?{customerId}: {})});return redirect('/customers?business='+encodeURIComponent(business.id)+'&customer='+encodeURIComponent(action==='address'?customerId:saved)+'&saved=1');}
            catch(error){const values={...Object.fromEntries(data),...row,id:action==='address'?addressId:customerId,version:data.get('version')};if(values.is_active===undefined)values.is_active=data.get('status')==='active';return send(error.status??(row?502:422),html('Customers',renderCustomers(business,await listCustomers(client,business.id),action==='address'?customer:values,addresses,action==='address'?values:null,error.message,true)));}
          });
        }
      if(url.pathname==='/catalogue'){
          if(!await readIdentity(id)){clear();return redirect('/login');}
          const businessId=url.searchParams.get('business'),itemId=url.searchParams.get('item'),view=url.searchParams.get('view')==='extra'?'extra':'service',catalogueOptions={q:url.searchParams.get('q'),status:url.searchParams.get('status'),service:url.searchParams.get('service')};
          return await auth.withCatalogue(id,businessId,true,async(client,business)=>{
            headerBusiness=business;
            const data=new URLSearchParams(body),items=await listCatalogue(client,businessId);
            if(itemId&&!items.some(i=>i.id===itemId))return send(404,html('Item unavailable','<h1>Item unavailable</h1><a href="/dashboard">Back to workspace</a>'));
            if(data.get('action')==='deactivate'){
              const existing=items.find(i=>i.id===itemId);
              if(!existing)return send(404,'Item unavailable','text/plain');
              try{await saveCatalogueItem(client,businessId,{is_active:false},{id:itemId,version:Number(data.get('version'))});}
              catch(error){return send(error.status??502,html('Catalogue',renderCatalogue(business,items,true,null,error.message,true,view,catalogueOptions)));}
              return redirect('/catalogue?business='+encodeURIComponent(businessId)+(view==='extra'?'&view=extra':'')+'&saved=1');
            }
            if(data.get('action')==='configure'){
              const previous=items.find(i=>i.id===itemId),values=Object.fromEntries(data),profile=values.cleaning_profile??'';
              if(!['','regular','deep','moving','airbnb','office','carpet'].includes(profile)||!['service','extra'].includes(values.kind))return send(422,'Invalid profile or type','text/plain');
              const same=profile===(values.configuration_profile??'');
              const retained=same?{...values,allowed_extra:data.getAll('allowed_extra')}:Object.fromEntries(Object.entries(values).filter(([key])=>['kind','name','description','price','pricing_model','unit_label','team_size','status','version','cleaning_profile'].includes(key)));
              if(profile)retained.pricing_model='fixed';
              return send(200,html('Catalogue',renderCatalogue(business,items,true,{...previous,...retained,id:itemId,creating:!itemId,configure_profile:true,cleaning_config:same&&profile===previous?.cleaning_profile?previous.cleaning_config:null,form_values:retained},'',false,view,catalogueOptions)));
            }
            if(data.get('action')==='delete'){
              if(!itemId)return send(400,'Item required','text/plain');
              try{await deleteCatalogueItem(client,businessId,itemId,Number(data.get('version')));}
              catch(error){return send(error.status??502,html('Catalogue',renderCatalogue(business,items,true,null,error.message,true,view,catalogueOptions)));}
              return redirect('/catalogue?business='+encodeURIComponent(businessId)+(view==='extra'?'&view=extra':'')+'&deleted=1');
            }
            let item;try{item=parseCatalogueItem(data,items.find(i=>i.id===itemId));}catch(error){return send(422,html('Catalogue',renderCatalogue(business,items,true,{...items.find(i=>i.id===itemId),...Object.fromEntries(data),id:itemId,form_values:{...Object.fromEntries(data),allowed_extra:data.getAll('allowed_extra')}},error.message,true,view,catalogueOptions)));}
            if(itemId&&items.find(i=>i.id===itemId).kind!==item.kind)return send(422,html('Catalogue',renderCatalogue(business,items,true,{...item,id:itemId,version:data.get('version')},'Item type cannot be changed. Create another item instead.',true,view,catalogueOptions)));
            try{await saveCatalogueItem(client,businessId,item,{id:itemId,version:Number(data.get('version'))});}
            catch(error){return send(error.status??502,html('Catalogue',renderCatalogue(business,items,true,{...item,id:itemId,version:data.get('version')},error.message,true,view,catalogueOptions)));}
            return redirect('/catalogue?business='+encodeURIComponent(businessId)+((itemId?view:item.kind)==='extra'?'&view=extra':'')+'&saved=1');
          });
        }
        if(url.pathname==='/settings'){
          const businessId=url.searchParams.get('business');
          if(!await readIdentity(id)){clear();return redirect('/login');}
          return await auth.withOwner(id,businessId,async(client,business)=>{
            headerBusiness=business;
            const data=new URLSearchParams(body);let settings;
            try{settings=parseBusinessSettings(data);}catch(error){
              const values=Object.fromEntries(data);values.working_days=data.getAll('working_days').map(Number);
              return send(422,html('Business settings',renderBusinessSettings(business,values,error.message,true,await readVatSettings(client,businessId))));
            }
            await saveBusinessSettings(client,businessId,settings);return redirect('/settings?business='+encodeURIComponent(businessId)+'&saved=1');
          });
        }
        if(url.pathname==='/vat-settings'){
          if(!await readIdentity(id)){clear();return redirect('/login');}
          return await auth.withOwner(id,url.searchParams.get('business'),async(client,business)=>{
            headerBusiness=business;
            try{await saveVatSettings(client,business.id,new URLSearchParams(body));}
            catch(error){if(error.message==='Settings access denied')throw error;return send(error.status??422,html('Business settings',renderBusinessSettings(business,await readBusinessSettings(client,business.id),error.message,true,await readVatSettings(client,business.id))));}
            return redirect('/settings?business='+encodeURIComponent(business.id)+'&vat_saved=1');
          });
        }
        if(url.pathname==='/logout'){clear();try{await auth.logout(id);}catch{return send(502,loginForm('Local session cleared. Remote sign-out could not be confirmed.'));}return redirect('/login');}
        if(url.pathname==='/login'){
          failures=failures.filter(t=>t>now()-60000);if(failures.length>=5)return send(429,loginForm('Too many attempts. Wait one minute.'));
          const data=new URLSearchParams(body);
          try{const session=await auth.login(data.get('email'),data.get('password'));if(id)await auth.logout(id);res.setHeader('Set-Cookie',`${cookieName}=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800${secure}`);return redirect('/dashboard');}
          catch{failures.push(now());return send(401,loginForm('Unable to sign in. Check your staging account and try again.'));}
        }
      }
      if(req.method!=='GET')return send(405,'Method not allowed','text/plain');
      if(url.pathname==='/calendar'){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withBookings(id,url.searchParams.get('business'),async(client,business)=>{
          headerBusiness=business;
          const ctx=await bookingContext(client,business.id);let options;
          try{options=calendarOptions(url.searchParams,ctx.time_zone,new Date(now()));}
          catch(error){return send(error.status??422,html('Calendar',`<h1>Calendar</h1><p role="alert">${esc(error.message)}</p><a href="/calendar?business=${encodeURIComponent(business.id)}">Open calendar</a>`));}
          const data=await readCalendar(client,business.id,options);let availability=null,message='',error=false;
          try{if(url.searchParams.has('local_start'))availability=await checkAvailability(client,business.id,url.searchParams);}
          catch(e){if(e.status===403)throw e;message=e.message;error=true;}
          return send(error?422:200,html('Calendar',renderCalendar(business,ctx,data,options,{availability,values:Object.fromEntries(url.searchParams),message,error})));
        });
      }
      if(url.pathname==='/bookings'){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withBookings(id,url.searchParams.get('business'),async(client,business)=>{
            headerBusiness=business;
          const ctx=await bookingContext(client,business.id),bookingId=url.searchParams.get('booking'),customerId=url.searchParams.get('customer'),booking=bookingId?await readBooking(client,business.id,bookingId):null,customer=customerId?await readCustomer(client,business.id,customerId):null;
          if(bookingId&&!booking||customerId&&!customer)return send(404,'Booking or customer unavailable','text/plain');
          const linkedPaymentInvoice=paymentProxy&&booking?await bookingInvoice(client,business.id,booking.id):null;
          const paymentStatus=linkedPaymentInvoice?await eftOperation(client,'status',{businessId:business.id,invoiceId:linkedPaymentInvoice.id}):null;
          return send(200,html('Bookings',renderBookings(business,await listBookings(client,business.id),ctx,{paymentStatus,booking,customer,customers:await listCustomers(client,business.id),addresses:customer?await listAddresses(client,business.id,customer.id):[],catalogue:await listCatalogue(client,business.id),values:{service_id:url.searchParams.get('service_id')??''},creating:url.searchParams.get('create')==='1',filters:{q:url.searchParams.get('q'),status:url.searchParams.get('status')},message:url.searchParams.get('saved')==='1'?'Booking saved.':''})));
        });
      }
        if(url.pathname==='/customers'){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withCustomers(id,url.searchParams.get('business'),async(client,business)=>{
            headerBusiness=business;
          const customerId=url.searchParams.get('customer'),addressId=url.searchParams.get('address'),customer=customerId?await readCustomer(client,business.id,customerId):null;
          if(customerId&&!customer)return send(404,'Customer unavailable','text/plain');
          const addresses=customer?await listAddresses(client,business.id,customer.id):[],address=addressId?await readAddress(client,business.id,customerId,addressId):null;
          if(addressId&&!address)return send(404,'Address unavailable','text/plain');
          return send(200,html('Customers',renderCustomers(business,await listCustomers(client,business.id),customer,addresses,address,url.searchParams.get('saved')==='1'?'Record saved.':'',false,{creating:url.searchParams.get('create')==='1',q:url.searchParams.get('q'),status:url.searchParams.get('status')})));
        });
      }
      if(url.pathname==='/catalogue'){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withCatalogue(id,url.searchParams.get('business'),false,async(client,business,canManage)=>{
          headerBusiness=business;
          const items=await listCatalogue(client,business.id),itemId=url.searchParams.get('item'),create=url.searchParams.get('create'),editing=itemId?items.find(i=>i.id===itemId):canManage&&['service','extra'].includes(create)?{kind:create,creating:true}:null;
          if(itemId&&!editing)return send(404,html('Item unavailable','<h1>Item unavailable</h1><a href="/dashboard">Back to workspace</a>'));
          if(url.searchParams.get('deactivate')==='1'){
            if(!canManage)throw new Error('Catalogue access denied');
            if(!itemId||!editing)return send(400,'Item required','text/plain');
            return send(200,html('Deactivate catalogue item',renderCatalogueDeactivate(business,editing,url.searchParams.get('view'))));
          }
          if(url.searchParams.get('delete')==='1'){
            if(!canManage)throw new Error('Catalogue access denied');
            if(!editing)return send(400,'Item required','text/plain');
            return send(200,html('Delete catalogue item',renderCatalogueDelete(business,editing,url.searchParams.get('view'))));
          }
          return send(200,html('Catalogue',renderCatalogue(business,items,canManage,editing,url.searchParams.get('deleted')==='1'?'Item deleted.':url.searchParams.get('saved')==='1'?'Catalogue saved.':'',false,url.searchParams.get('view'),{q:url.searchParams.get('q'),status:url.searchParams.get('status'),service:url.searchParams.get('service')})));
        });
      }
      if(url.pathname==='/settings'){
        if(!await readIdentity(id)){clear();return redirect('/login');}
        return await auth.withOwner(id,url.searchParams.get('business'),async(client,business)=>{headerBusiness=business;return send(200,html('Business settings',renderBusinessSettings(business,await readBusinessSettings(client,business.id),url.searchParams.get('vat_saved')==='1'?'VAT setting saved.':url.searchParams.get('saved')==='1'?'Settings saved.':'',false,await readVatSettings(client,business.id))));});
      }
      if(url.pathname!=='/dashboard')return send(404,'Not found','text/plain');
      const identity=await readIdentity(id);if(!identity){clear();return redirect('/login');}
      const selected=url.searchParams.get('business')??'all';
      if(selected!=='all'&&!identity.businessIds.includes(selected))return send(403,'You do not have access to this business.','text/plain');
      return send(200,renderWorkspace(identity,selected,{restoreTest}));
    }catch(error){if(['Cleaner access denied','Adjustment access denied','Earnings access denied','Invoice access denied','Quote access denied','Staff access denied','Settings access denied','Catalogue access denied','Customer access denied','Booking access denied'].includes(error.message))return send(403,html('Access denied','<h1>Access denied</h1><p>You do not have permission to access this business configuration.</p><a href="/dashboard">Back to workspace</a>'));return send(503,loginForm('Staging service unavailable. Please try again later.'));}
  });return server;
}



