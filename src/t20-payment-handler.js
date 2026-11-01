// Candidate routes only. Not mounted by this source increment.
const uuid=v=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v??'');
export function createPaymentHandler({controller}){
 const origin='https://staging.faraios.com';
 return async({req,res,auth,cookieName})=>{
  const send=(code,body)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(body));};
  try{
   if(req.headers.host!=='staging.faraios.com')return send(404,{error:'unavailable'});
   const u=new URL(req.url,origin),hook=u.pathname.match(/^\/payments\/([0-9a-f-]{36})\/webhook$/i),route=u.pathname.match(/^\/payments\/([0-9a-f-]{36})\/intents(?:\/([0-9a-f-]{36})(?:\/(initialize|reconcile))?)?$/i);
   if(u.search||!hook&&!route)return send(404,{error:'unavailable'});
   const businessId=(hook??route)[1];if(!uuid(businessId))return send(404,{error:'unavailable'});
   const read=async limit=>{const chunks=[];let n=0;for await(const c of req){const b=Buffer.from(c);n+=b.length;if(n>limit)throw Error();chunks.push(b);}return Buffer.concat(chunks);};
   if(hook){
    if(req.method!=='POST'||req.headers['content-type']!=='application/json')return send(405,{error:'unavailable'});
    await controller.webhook({businessId,rawBody:await read(262144),signature:req.headers['x-paystack-signature']});
    return send(200,{received:true}); // Only after verified atomic publication.
   }
   const cookies=(req.headers.cookie??'').split(';').map(s=>s.trim()).filter(s=>s.startsWith(cookieName+'='));
   const sid=cookies.length===1?cookies[0].slice(cookieName.length+1):'';
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(sid)||!await auth.read(sid))return send(401,{error:'sign_in_required'});
   const intentId=route[2],operation=route[3];if(intentId&&!uuid(intentId))throw Error();
   const rpc=(action,input)=>auth.withAccountingSession(sid,async client=>{const {data,error}=await client.rpc('t20_payment_owner',{action,input});if(error||!data)throw Error();return data;});
   if(req.method==='GET'&&intentId&&!operation)return send(200,await rpc('status',{businessId,intentId}));
   if(req.method!=='POST')return send(405,{error:'unavailable'});
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/x-www-form-urlencoded')throw Error();
   const form=new URLSearchParams((await read(4096)).toString('utf8'));
   const exact=keys=>[...form.keys()].length===keys.length&&keys.every(k=>form.getAll(k).length===1);
   if(!intentId){
    if(!exact(['invoiceId','requestId'])||!uuid(form.get('invoiceId'))||!uuid(form.get('requestId')))throw Error();
    return send(200,await rpc('create',{businessId,invoiceId:form.get('invoiceId'),requestId:form.get('requestId')}));
   }
   // DB status is the role/business/record authorization gate before backend work.
   const v=await rpc('status',{businessId,intentId});
   if(operation==='initialize'){
    if(!exact(['email','confirm'])||form.get('confirm')!=='yes'||!/^[-A-Za-z0-9._+]+@example\.test$/.test(form.get('email')??''))throw Error();
    return send(200,await controller.initialize({businessId,reference:v.reference,email:form.get('email'),approved:true}));
   }
   if(operation==='reconcile'&&exact([]))return send(200,await controller.reconcile({businessId,reference:v.reference}));
   throw Error();
  }catch{return send(409,{error:'payment_operation_unavailable'});}
 };
}
