// IPC input contains only synthetic metadata and a disposable fixture path.
import {runFakeRefresh} from './t19-c2-native.mjs';
process.once('message',async config=>{
 try{
  const result=await runFakeRefresh({...config,checkpoint:async(phase,lease)=>{
   if(config.pause===phase){process.send({phase,attempt:lease.attempt,fence:lease.fence});await new Promise(resolve=>process.once('message',resolve));}
  }});
  process.send({ok:true,result});
 }catch(e){process.send({ok:false,code:e.code??'failure'});}
 process.disconnect();
});
