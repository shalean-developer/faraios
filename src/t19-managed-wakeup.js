import {request} from 'node:https';
import {setTimeout as delay} from 'node:timers/promises';
const origin='https://www.custody-staging.faraios.com/';
const denied=()=>new Error('managed_custody_unavailable');
export function validateManagedTransport(transport,endpoint){
 if(transport===undefined)return;
 if(transport!=='managed-custody-staging')throw denied();
 const u=new URL(endpoint);
 if(u.protocol!=='https:'||u.hostname!=='127.0.0.1'||!u.port||Number(u.port)<1024
  ||u.username||u.password||u.pathname!=='/'||u.search||u.hash)throw denied();
}
export function createManagedWakeup({requestImpl=request,budgetMs=10000,pause=delay}={}){
 if(!Number.isInteger(budgetMs)||budgetMs<1||budgetMs>10000)throw denied();
 let pending;
 return ()=>{
  if(pending)return pending;
  const task=(async()=>{
  const deadline=Date.now()+budgetMs;
  try{
   for(let attempt=0;attempt<20&&Date.now()<deadline;attempt++){
    const result=await new Promise((resolve,reject)=>{
     let settled=false,timer;
     const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);error?reject(denied()):resolve(value);};
     // Public cold-start request contains NO mTLS material, user session,
     // bearer token, business ID, cookie, request body or caller-provided URL.
     const req=requestImpl(new URL(origin),{method:'GET',agent:false,rejectUnauthorized:true,minVersion:'TLSv1.2',
      headers:{'Cache-Control':'no-store'}},res=>{
      let body='',size=0;
      res.on('data',chunk=>{size+=chunk.length;if(size>32){req.destroy();finish(true);}else body+=chunk;});
      res.on('error',()=>finish(true));res.on('aborted',()=>finish(true));
      res.on('end',()=>finish(false,{status:res.statusCode,body}));
     });
     timer=setTimeout(()=>{req.destroy();finish(true);},Math.min(3000,Math.max(1,deadline-Date.now())));
     req.on('error',()=>finish(true));req.end();
    });
    if(result.status===403&&result.body==='Unavailable')return;
    if(result.status!==503||result.body!=='Unavailable')throw denied();
    // Only inert GET startup checks repeat. Accounting/provider operations do
    // not enter this retry loop, including after an uncertain provider write.
    await pause(Math.min(500,Math.max(0,deadline-Date.now())));
   }
   throw denied();
  }catch{throw denied();}
  })();
  pending=task;
  task.finally(()=>{if(pending===task)pending=undefined;}).catch(()=>{});
  return task;
 };
}
export const wakeManagedCustody=createManagedWakeup();
