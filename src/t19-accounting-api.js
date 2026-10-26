// Mount only in an approved authenticated runtime. No listener/startup side effects.
import {escapeHtml} from './workspace-layout.js';
const uuid=s=>typeof s==='string'&&/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(s);
const routes={enqueue:['connection','invoice','customer'],disconnect:['connection','generation'],revoke:['connection','generation'],reconcile:['operation'],connect:['connection']};
export function createAccountingHandler({sessions,oauth,origin,sessionCookie}){
 const base=new URL(origin);if(base.origin!==origin||base.username||base.password||!/^[-_A-Za-z0-9]+$/.test(sessionCookie??'')
  ||base.protocol!=='https:'&&!(base.protocol==='http:'&&base.hostname==='127.0.0.1'))throw new Error('configuration_rejected');
 const callbackCookie=base.protocol==='https:'?'__Secure-faraios_accounting_callback':'faraios_accounting_callback';
 const cookieFlags='; HttpOnly; SameSite=Lax; Path=/accounting/zoho/callback'+(base.protocol==='https:'?'; Secure':'');
 return async(req,res)=>{
  const send=(status,body,type='application/json')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; form-action 'self'; frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(body):body);};
  try{
   if(req.headers.host!==base.host)return send(403,{error:'accounting_denied'});
   const url=new URL(req.url,origin),isCallback=url.pathname==='/accounting/zoho/callback'&&req.method==='GET';
   const cookie=isCallback?callbackCookie:sessionCookie;
   const sid=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookie+'='))?.slice(cookie.length+1);
   if(isCallback)res.setHeader('Set-Cookie',callbackCookie+'=; Max-Age=0'+cookieFlags);
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(sid??''))return send(401,{error:'sign_in_required'});
   if(!sid||!await sessions.read(sid))return send(401,{error:'sign_in_required'});
   if(isCallback){
    if([...url.searchParams.keys()].some(k=>!['state','code','location','accounts-server'].includes(k))||url.searchParams.getAll('state').length!==1||url.searchParams.getAll('code').length!==1)return send(400,{error:'connection_verification_failed'});
    await oauth.callback(sid,{state:url.searchParams.get('state'),code:url.searchParams.get('code')});
    return send(200,'<p>Zoho connection verified. Return to your business accounting page.</p>','text/html');
   }
   const match=url.pathname.match(/^\/accounting\/([0-9a-f-]+)\/(status|connection|connect|disconnect|revoke|enqueue|reconcile)$/i);
   if(!match||url.search||!uuid(match[1]))return send(404,{error:'unavailable'});
   const [,business,action]=match;
   if(req.method==='GET'&&action==='status'){
    return await sessions.withInvoices(sid,business,async(client)=>{const {data,error}=await client.rpc('t19_accounting_status',{business});if(error)throw error;return send(200,data);});
   }
   if(req.method==='GET'&&action==='connection')return await sessions.withInvoices(sid,business,async(client,selected,_actor,owner)=>{
    const {data,error}=await client.rpc('t19_accounting_status',{business});if(error)throw error;
    return send(200,'<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Accounting connection</title><main><h1>Accounting connection</h1>'+renderAccountingConnection(selected??{id:business},data,{owner})+'</main></html>','text/html');
   });
   if(req.method!=='POST'||!routes[action])return send(405,{error:'unavailable'});
   if(req.headers.origin!==origin||!['application/json','application/x-www-form-urlencoded'].includes(req.headers['content-type']))return send(403,{error:'accounting_denied'});
   let body='';for await(const part of req){body+=part;if(Buffer.byteLength(body)>2048)return send(413,{error:'request_too_large'});}
   const data=req.headers['content-type']==='application/json'?JSON.parse(body):Object.fromEntries(new URLSearchParams(body));
   if(!data||Array.isArray(data)||Object.keys(data).length!==routes[action].length||Object.keys(data).some(k=>!routes[action].includes(k)))return send(400,{error:'invalid_request'});
   for(const k of ['connection','invoice','operation'])if(k in data&&!uuid(data[k]))return send(400,{error:'invalid_request'});
   const success=value=>{if(req.headers['content-type']==='application/x-www-form-urlencoded'){res.writeHead(303,{Location:'/accounting/'+business+'/connection','Cache-Control':'no-store'});res.end();}else send(200,value);};
   if(action==='connect')return await sessions.withOwner(sid,business,async()=>{const v=await oauth.begin(sid,{businessId:business,connectionId:data.connection});
    // Existing Strict app cookie is unchanged. Only the short-lived callback
    // cookie can accompany the provider's top-level cross-site return.
    res.writeHead(303,{Location:v.authorizationUrl,'Set-Cookie':callbackCookie+'='+sid+'; Max-Age=300'+cookieFlags,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});res.end();});
   if(action==='revoke')return await sessions.withOwner(sid,business,async()=>{const generation=Number(data.generation);if(!Number.isSafeInteger(generation)||generation<1)throw Error();return success(await oauth.revoke(sid,{businessId:business,connectionId:data.connection,generation}));});
   const run=action==='disconnect'?sessions.withOwner.bind(sessions):sessions.withInvoices.bind(sessions);
   return await run(sid,business,async(client)=>{
    let name,params;
    if(action==='enqueue'){if(!/^[0-9]{1,30}$/.test(data.customer))throw Error();name='t19_enqueue_invoice';params={business,...data};}
    if(action==='disconnect'){const generation=Number(data.generation);if(!Number.isSafeInteger(generation)||generation<1)throw Error();name='t19_disconnect';params={business,connection:data.connection,expected_generation:generation};}
    if(action==='reconcile'){name='t19_reconcile';params={business,operation:data.operation};}
    const {data:result,error}=await client.rpc(name,params);if(error)throw error;return success({result});
   });
  }catch{return send(403,{error:'accounting_action_rejected'});}
 };
}
export function renderAccountingConnection(business,status,{owner=false}={}){
 if(status?.business_id!==business.id)return '<p>Accounting connection unavailable.</p>';
 const base='/accounting/'+escapeHtml(business.id),form=(action,c,label,generation,disabled=false)=>`<form method="post" action="${base}/${action}"><input type="hidden" name="connection" value="${escapeHtml(c.connection_id)}">${generation===undefined?'':`<input type="hidden" name="generation" value="${escapeHtml(generation)}">`}<button${disabled?' disabled':''}>${label}</button></form>`;
 const connections=status.connections.map(c=>{
  const revocation=c.revocation,held=c.status==='recovery_required'||revocation&&revocation.phase!=='revoked';
  let controls='';
  if(owner){
   controls=c.status==='connected'?form('disconnect',c,'Disconnect Zoho Books',c.generation):form('connect',c,'Connect Zoho Books',undefined,held);
   if(c.status==='disconnected'&&revocation?.phase==='pending')controls+=form('revoke',c,'Revoke previous Zoho access',revocation.generation);
  }
  return `<section><h2>Zoho Books</h2><p>Organisation ${escapeHtml(c.organization_id)} · ${escapeHtml(c.status.replaceAll('_',' '))}</p>${revocation&&revocation.phase!=='revoked'?'<p>Previous provider access still needs revocation or review. Local disconnection has stopped new work.</p>':''}${controls}</section>`;
 }).join('');
 const jobs=status.jobs.map(j=>`<li>Invoice ${escapeHtml(j.invoice_id??'connection refresh')}: ${escapeHtml(j.state.replaceAll('_',' '))}${j.error_code?' — '+escapeHtml(j.error_code.replaceAll('_',' ')):''}${j.invoice_id&&j.state==='recovery_required'?`<form method="post" action="${base}/reconcile"><input type="hidden" name="operation" value="${escapeHtml(j.id)}"><button>Review existing invoice outcome</button></form>`:''}</li>`).join('');
 return connections+'<h2>Synchronization</h2><ul>'+jobs+'</ul><a href="/invoices?business='+encodeURIComponent(business.id)+'">Return to invoices and totals</a>';
}
