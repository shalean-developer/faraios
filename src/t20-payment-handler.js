// TEST-only payment routes, mounted only by explicit private runtime configuration.
import {randomUUID} from 'node:crypto';
const uuid=v=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v??'');
export function createPaymentHandler({controller}){
 const origin='https://staging.faraios.com';
 return async({req,res,auth,cookieName})=>{
  const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  const html=body=>{res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TEST checkout · FaraiOS staging</title><main><h1>TEST checkout</h1><p>FaraiOS staging only. Use approved fictitious invoices and test cards.</p>'+body+'</main></html>');};
  try{
   if(req.headers.host!=='staging.faraios.com')return send(404,{error:'unavailable'});
   const u=new URL(req.url,origin),hook=u.pathname.match(/^\/payments\/([0-9a-f-]{36})\/webhook$/i),route=u.pathname.match(/^\/payments\/([0-9a-f-]{36})\/intents(?:\/([0-9a-f-]{36})(?:\/(initialize|reconcile))?)?$/i);
   const returning=u.pathname==='/payments/return';
   if(!returning&&(u.search||!hook&&!route))return send(404,{error:'unavailable'});
   const businessId=(hook??route)?.[1];if(!returning&&!uuid(businessId))return send(404,{error:'unavailable'});
   const read=async limit=>{const chunks=[];let n=0;for await(const c of req){const b=Buffer.from(c);n+=b.length;if(n>limit)throw Error();chunks.push(b);}return Buffer.concat(chunks);};
   if(hook){
    if(req.method!=='POST'||req.headers['content-type']!=='application/json')return send(405,{error:'unavailable'});
    await controller.webhook({businessId,rawBody:await read(262144),signature:req.headers['x-paystack-signature']});
    return send(200,{received:true}); // Only after verified atomic publication.
   }
   const cookies=(req.headers.cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));
   const sid=cookies.length===1?cookies[0].slice(cookieName.length+1):'';
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(sid)||!await auth.read(sid))return send(401,{error:'sign_in_required'});
   const intentId=route?.[2],operation=route?.[3];if(intentId&&!uuid(intentId))throw Error();
   const rpc=(action,input)=>auth.withAccountingSession(sid,async client=>{const {data,error}=await client.rpc('t20_payment_owner',{action,input});if(error||!data)throw Error();return data;});
   if(returning){
    let reference;
    if(req.method==='GET'){
     const keys=[...u.searchParams.keys()];
     if(keys.length<1||keys.length>2||keys.some(k=>!['reference','trxref'].includes(k))||u.searchParams.getAll('reference').length!==1||u.searchParams.getAll('trxref').length>1)throw Error();
     reference=u.searchParams.get('reference');
     if(u.searchParams.has('trxref')&&u.searchParams.get('trxref')!==reference)throw Error();
    }else if(req.method==='POST'){
     if(u.search||req.headers.origin!==origin||req.headers['content-type']!=='application/x-www-form-urlencoded')throw Error();
     const form=new URLSearchParams((await read(4096)).toString('utf8'));
     if([...form.keys()].length!==1||form.getAll('reference').length!==1)throw Error();reference=form.get('reference');
    }else return send(405,{error:'unavailable'});
    if(!/^FOS-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(reference??''))throw Error();
    const v=await controller.resolveReference(reference);
    const status=await rpc('status',{businessId:v.businessId,intentId:v.intentId});
    if(status.reference!==reference)throw Error();
    const result=req.method==='POST'?await controller.reconcile({businessId:v.businessId,reference}):status;
    const state=['paid','failed','pending','review_required'].includes(result.status)?result.status:'pending';
    const body='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TEST payment verification</title><main><h1>TEST payment verification</h1><p>FaraiOS staging only.</p><p>Saved payment status: '+state+'</p><p>The checkout redirect alone does not prove payment. Verify the provider result below.</p><form method="post" action="/payments/return"><input type="hidden" name="reference" value="'+reference+'"><button>Verify TEST payment</button></form><p><a href="/invoices?business='+v.businessId+'">Return to invoices</a></p></main></html>';
    res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);return;
   }
   if(req.method==='GET'&&!intentId&&!operation){
    return await auth.withOwner(sid,businessId,async()=>html('<form method="post" action="'+u.pathname+'"><label>Saved invoice ID <input name="invoiceId" required pattern="[0-9a-fA-F-]{36}" maxlength="36"></label><label>TEST request ID <input name="requestId" value="'+randomUUID()+'" required pattern="[0-9a-fA-F-]{36}" maxlength="36"></label><button>Prepare TEST checkout</button></form>'));
   }
   if(req.method==='GET'&&intentId&&!operation)return send(200,await rpc('status',{businessId,intentId}));
   if(req.method!=='POST')return send(405,{error:'unavailable'});
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/x-www-form-urlencoded')throw Error();
   const form=new URLSearchParams((await read(4096)).toString('utf8'));
   const exact=keys=>[...form.keys()].length===keys.length&&keys.every(k=>form.getAll(k).length===1);
   if(!intentId){
    if(!exact(['invoiceId','requestId'])||!uuid(form.get('invoiceId'))||!uuid(form.get('requestId')))throw Error();
    const v=await rpc('create',{businessId,invoiceId:form.get('invoiceId'),requestId:form.get('requestId')});
    if((req.headers.accept??'').includes('text/html')){
     if(!uuid(v.id)||!/^FOS-[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v.reference??'')||!Number.isSafeInteger(v.amountCents)||v.amountCents<=0||v.currency!=='ZAR')throw Error();
     return html('<p>Saved reference: '+v.reference+'</p><p>Saved amount: R '+(v.amountCents/100).toFixed(2)+'</p><form method="post" action="/payments/'+businessId+'/intents/'+v.id+'/initialize"><label>Fictitious TEST email <input name="email" type="email" value="synthetic@example.com" required></label><label><input type="checkbox" name="confirm" value="yes" required> I approve this TEST-only checkout.</label><button>Open approved TEST checkout</button></form>');
    }
    return send(200,v);
   }
   // DB status is the role/business/record authorization gate before backend work.
   const v=await rpc('status',{businessId,intentId});
   if(operation==='initialize'){
    if(!exact(['email','confirm'])||form.get('confirm')!=='yes'||!/^[-A-Za-z0-9._+]+@example\.com$/.test(form.get('email')??''))throw Error();
    return send(200,await controller.initialize({businessId,reference:v.reference,email:form.get('email'),approved:true}));
   }
   if(operation==='reconcile'&&exact([]))return send(200,await controller.reconcile({businessId,reference:v.reference}));
   throw Error();
  }catch{return send(409,{error:'payment_operation_unavailable'});}
 };
}
