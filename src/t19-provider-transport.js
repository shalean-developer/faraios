// Bounded transport shared only by the restricted runtime. No default network.
export function createCustodyTransport(fetchImpl){
 if(typeof fetchImpl!=='function')throw new Error('configuration_rejected');
 return async(url,options={})=>{
  const controller=new AbortController();let reader,timer;
  const denied=()=>new Error('provider_unavailable');
  const work=(async()=>{
   const response=await fetchImpl(url,{...options,redirect:'error',cache:'no-store',signal:controller.signal});
   if(response.redirected||!response.body?.getReader)throw denied();
   reader=response.body.getReader();let size=0;const parts=[];
   while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>2_000_000)throw denied();parts.push(value);}
   const text=new TextDecoder('utf-8',{fatal:true}).decode(Buffer.concat(parts));
   return new Response(text,{status:response.status,headers:{'Content-Type':'application/json'}});
  })();
  try{return await Promise.race([work,new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(denied());},12000);})]);}
  catch{throw denied();}finally{clearTimeout(timer);controller.abort();if(reader){try{Promise.resolve(reader.cancel()).catch(()=>{});}catch{}try{reader.releaseLock();}catch{}}}
 };
}
