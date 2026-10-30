// Composition for the approved isolated custody process. Merely importing or
// constructing this server does not listen, schedule work or read credentials.
import {createServer} from 'node:https';
import {createCustodyMachineAuthenticator} from './t19-custody-machine.js';
import {createCustodyInvoiceRunner} from './t19-custody-invoices.js';
import {createZohoCustodyProvider} from './t19-zoho-custody-provider.js';
import {createOwnerOAuth} from './t19-owner-oauth.js';
import {createAccountingHandler} from './t19-accounting-api.js';
import {createVerifiedAccountingSessions} from './t19-accounting-sessions.js';
import {createAccountingWorker} from './t19-accounting-worker.js';
export function createRestrictedAccountingService({database,query,createUserClient,fetchImpl,origin,tls,sessionCookie,callbackPrivateKey}){
 if(!tls?.ca||!tls.cert||!tls.key||typeof createUserClient!=='function')throw Error('configuration_rejected');
 const authenticateMachine=createCustodyMachineAuthenticator({findMachineByFingerprint:database.findMachineByFingerprint});
 const runner=createCustodyInvoiceRunner({database,authenticateMachine,refreshProvider:createZohoCustodyProvider({fetchImpl}),fetchImpl});
 const worker=createAccountingWorker({database,runner,authenticateMachine});
 return createServer({ca:tls.ca,cert:tls.cert,key:tls.key,requestCert:true,rejectUnauthorized:true,minVersion:'TLSv1.2'},async(req,res)=>{
  try{
   await authenticateMachine(req.socket);
   if(['/custody/invoice','/custody/run'].includes(req.url)&&req.method==='POST'){
    if(req.headers['content-type']!=='application/json')throw Error();
    let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>256)throw Error();}
    const input=JSON.parse(body);
    if(req.url==='/custody/run'&&(!input||Array.isArray(input)||Object.keys(input).length!==0))throw Error();
    const result=req.url==='/custody/run'?await worker.runOnce(req.socket):await runner.run(req.socket,input);
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(result));return;
   }
   // The web upstream must authenticate with mTLS AND forward an opaque session
   // which sessions independently verifies. No forwarded user/role header is used.
   const token=req.headers.authorization?.match(/^Bearer ([^\s]+)$/)?.[1];
   const sessions=createVerifiedAccountingSessions({createUserClient,accessToken:token,sessionId:req.headers['x-faraios-session']});
   const verifiedSessions={...sessions,read:async sid=>{await authenticateMachine(req.socket);return sessions.read(sid);}};
   const oauth=createOwnerOAuth({sessions:verifiedSessions,query,fetchImpl});
   await createAccountingHandler({sessions:verifiedSessions,oauth,origin,sessionCookie,callbackPrivateKey})(req,res);
  }catch{if(!res.headersSent){res.writeHead(403,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end('{"error":"accounting_denied"}');}else res.end();}
 });
}
