// Owner-only TEST account metadata setup; never reads provider credentials.
const uuid=v=>/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v??'');
export function createPaymentSetupHandler(){
 return async({req,res,auth,cookieName})=>{
  const send=(code,body,type='text/html; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);};
  try{
   const u=new URL(req.url,'https://staging.faraios.com'),match=u.pathname.match(/^\/payments\/([0-9a-f-]{36})\/settings$/i);
   if(req.headers.host!=='staging.faraios.com'||!match||!uuid(match[1])||u.search&&u.search!=='?saved=1')return send(404,'Unavailable');
   const businessId=match[1],cookies=(req.headers.cookie??'').split(';').map(v=>v.trim()).filter(v=>v.startsWith(cookieName+'='));
   const sid=cookies.length===1?cookies[0].slice(cookieName.length+1):'';
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(sid)||!await auth.read(sid))return send(401,'Sign in to FaraiOS staging, then return to this page.');
   return await auth.withOwner(sid,businessId,async client=>{
    if(req.method==='GET')return send(200,'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>TEST payment account · FaraiOS staging</title><link rel="stylesheet" href="/style.css"><main><h1>TEST payment account</h1><p>FaraiOS staging only. Saving this mapping does not activate checkout or create a payment.</p>'+(u.search?'<p>Account mapping saved. TEST runtime enrollment and checkout acceptance remain.</p>':'')+'<form method="post" action="/payments/'+businessId+'/settings"><label>Paystack business ID <input name="accountId" required pattern="[1-9][0-9]{0,29}" maxlength="30"></label><label><input type="checkbox" name="confirm" value="yes" required> I confirm this is the intended business’s TEST Paystack account.</label><button type="submit">Save TEST account mapping</button></form><p><a href="/invoices?business='+businessId+'">Return to invoices</a></p></main></html>');
    if(req.method!=='POST')return send(405,'Unavailable');
    if(req.headers.origin!=='https://staging.faraios.com'||req.headers['content-type']!=='application/x-www-form-urlencoded'||u.search)throw Error();
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024)throw Error();}
    const form=new URLSearchParams(body);
    if([...form.keys()].length!==2||form.getAll('accountId').length!==1||form.getAll('confirm').length!==1||form.get('confirm')!=='yes'||!/^[1-9][0-9]{0,29}$/.test(form.get('accountId')??''))throw Error();
    const {error}=await client.rpc('t20_payment_owner',{action:'configure',input:{businessId,accountId:form.get('accountId'),enabled:true}});if(error)throw Error();
    res.writeHead(303,{Location:u.pathname+'?saved=1','Cache-Control':'no-store'});res.end();
   });
  }catch{return send(403,'Owner account setup unavailable.');}
 };
}
