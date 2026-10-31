// Backend handler fits the existing accountingProxy injection point but makes no
// upstream custody request. Mount only after deployment/secret/log review.
import {createStandardConnection} from './t19-standard-connection.js';
import {renderStandardConnectionPage} from './t19-standard-page.js';
export function createStandardHandler({config,store,cipher,provider,onboardingMode='callback'}){
 if(!['callback','private'].includes(onboardingMode))throw Error('accounting_configuration_rejected');
 const origin=config.origin,base=new URL(origin),callbackCookie='__Secure-faraios_standard_callback';
 if(base.protocol!=='https:'||base.origin!==origin||base.username||base.password)throw Error('accounting_configuration_rejected');
 const flags='; HttpOnly; Secure; SameSite=Lax; Path=/accounting/zoho/callback';
 return async({req,res,auth,cookieName})=>{
  const send=(code,body,type='application/json')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; style-src 'self'; script-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);};
  try{
   if(req.headers.host!==base.host)throw Error();
   const u=new URL(req.url,origin),callback=u.pathname==='/accounting/zoho/callback';
   if(callback&&onboardingMode==='private')return send(404,{error:'unavailable'});
   const name=callback?callbackCookie:cookieName;
   const values=(req.headers.cookie??'').split(';').map(x=>x.trim()).filter(x=>x.startsWith(name+'='));
   const sid=values.length===1?values[0].slice(name.length+1):'';
   const identity=/^[A-Za-z0-9_-]{1,128}$/.test(sid)?await auth.read(sid):null;
   if(!identity)return send(401,{error:'sign_in_required'});
   const api=createStandardConnection({config,store,cipher,provider,sessions:auth});
   if(callback){
    res.setHeader('Set-Cookie',callbackCookie+'=; Max-Age=0'+flags);
    if(req.method!=='GET'||u.searchParams.getAll('state').length!==1||u.searchParams.getAll('code').length!==1||[...u.searchParams.keys()].some(k=>!['state','code','location','accounts-server'].includes(k)))throw Error();
    const result=await api.callback(sid,{state:u.searchParams.get('state'),code:u.searchParams.get('code')});
    res.writeHead(303,{Location:'/accounting/'+result.businessId+'/connection','Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return;
   }
   const match=u.pathname.match(/^\/accounting\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})\/(status|connection|connect|disconnect)$/i);
   if(!match||u.search)return send(404,{error:'unavailable'});
   const [,businessId,action]=match;
   if(action==='connect'&&onboardingMode==='private')return send(409,{error:'private_owner_setup_required'});
   if(req.method==='GET'&&['status','connection'].includes(action)){
    const status=await api.status(sid,{businessId});
    if(action==='status')return send(200,status);
    return send(200,renderStandardConnectionPage({identity,businessId,status,onboardingMode}),'text/html');
   }
   if(req.method!=='POST'||!['connect','disconnect'].includes(action))return send(405,{error:'unavailable'});
   if(req.headers.origin!==origin||req.headers['content-type']!=='application/x-www-form-urlencoded')throw Error();
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>1024)throw Error();}
   const form=new URLSearchParams(body);
   if(action==='connect'){
    if([...form.keys()].length!==1||form.getAll('organizationId').length!==1)throw Error();
    const result=await api.begin(sid,{businessId,organizationId:form.get('organizationId')});
    res.writeHead(303,{Location:result.authorizationUrl,'Set-Cookie':callbackCookie+'='+sid+'; Max-Age=300'+flags,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();return;
   }
   if([...form.keys()].length)throw Error();
   await api.disconnect(sid,{businessId});res.writeHead(303,{Location:'/accounting/'+businessId+'/connection','Cache-Control':'no-store'});res.end();
  }catch{return send(403,{error:'accounting_action_rejected'});}
 };
}
