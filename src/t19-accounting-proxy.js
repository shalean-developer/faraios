import {validateManagedTransport,wakeManagedCustody} from './t19-managed-wakeup.js';
import {request} from 'node:https';
import {isIP} from 'node:net';
// Approved web -> isolated custody transport. Never forwards browser authority
// headers; the user's verified Auth access token travels only over pinned mTLS.
export function createAccountingProxy({endpoint,tls,transport},{wake=wakeManagedCustody}={}){
 validateManagedTransport(transport,endpoint);
 const target=new URL(endpoint);
 if(target.protocol!=='https:'||target.username||target.password||target.pathname!=='/'||target.search||target.hash||!tls?.ca||!tls.cert||!tls.key)throw Error('configuration_rejected');
 return async({req,res,auth,origin,cookieName})=>{
  try{
   if(!req.url.startsWith('/accounting/')||!['GET','POST'].includes(req.method))throw Error();
   const callback=req.url.startsWith('/accounting/zoho/callback?');
   const encryptedReturn=req.url==='/accounting/zoho/return';
   const name=callback||encryptedReturn?(origin.startsWith('https:')?'__Secure-faraios_accounting_callback':'faraios_accounting_callback'):cookieName;
   const sid=(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith(name+'='))?.slice(name.length+1);
   if(!/^[A-Za-z0-9_-]{1,128}$/.test(sid??''))throw Error();
   const token=await auth.withAccountingSession(sid,async client=>{
    const {data,error}=await client.auth.getSession();
    if(error||!data?.session?.access_token)throw Error();return data.session.access_token;
   });
   let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>(encryptedReturn?17000:2048))throw Error();}
   const headers={Host:new URL(origin).host,Cookie:name+'='+sid,Authorization:'Bearer '+token,'X-Faraios-Session':sid};
   if(req.headers.origin)headers.Origin=req.headers.origin;
   if(req.headers['content-type'])headers['Content-Type']=req.headers['content-type'];
   if(transport)await wake();
   const result=await new Promise((resolve,reject)=>{
    let timer;
    const upstream=request(new URL(req.url,target),{method:req.method,headers,servername:isIP(target.hostname)?'':target.hostname,ca:tls.ca,cert:tls.cert,key:tls.key,rejectUnauthorized:true},response=>{
     let size=0;const chunks=[];
     response.on('data',chunk=>{size+=chunk.length;if(size>2_000_000){upstream.destroy();reject(Error());}else chunks.push(chunk);});
     response.on('error',reject);response.on('end',()=>{clearTimeout(timer);resolve({status:response.statusCode,headers:response.headers,body:Buffer.concat(chunks)});});
    });
    timer=setTimeout(()=>upstream.destroy(Error()),15000);upstream.on('error',error=>{clearTimeout(timer);reject(error);});upstream.end(body);
   });
   const responseHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
   for(const header of ['content-type','location','set-cookie','content-security-policy','x-content-type-options'])if(result.headers[header])responseHeaders[header]=result.headers[header];
   res.writeHead(result.status,responseHeaders);res.end(result.body);
  }catch{if(!res.headersSent){res.writeHead(403,{'Content-Type':'text/plain','Cache-Control':'no-store'});res.end('Accounting request unavailable. Sign in again or review the connection.');}else res.end();}
 };
}
