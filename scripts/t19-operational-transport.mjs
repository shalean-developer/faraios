// Bounded synthetic SQL transport. EPIPE retains a nonzero child outcome; never success.
import {spawn} from 'node:child_process';
export function operationalProcess(binary,{spawnProcess=spawn}={}){
 return (args,{stdin='',timeoutMs=10000,maxBytes=8388608}={})=>new Promise((resolve,reject)=>{
  let child,timer,killTimer,unknown=false,done=false,inputClosed=false,count=0;
  const out=[],err=[];
  const finish=(error,code=null,signal=null)=>{
   if(done)return;done=true;clearTimeout(timer);clearTimeout(killTimer);
   const value={stdout:Buffer.concat(out),stderr:Buffer.concat(err),code,signal,inputClosed};
   if(error){error.unknown=unknown;error.evidence=value;reject(error);}else resolve(value);
  };
  const stop=()=>{if(unknown||done)return;unknown=true;try{child.kill('SIGKILL');}catch{}killTimer=setTimeout(()=>finish(Error('OPERATIONAL_TRANSPORT_KILL_UNKNOWN')),1000);};
  try{child=spawnProcess(binary,['--context','default',...args],{shell:false,env:{PATH:'/usr/bin:/bin',HOME:'/nonexistent',LANG:'C'},stdio:['pipe','pipe','pipe']});}catch{return finish(Error('OPERATIONAL_TRANSPORT_SPAWN_FAILED'));}
  timer=setTimeout(stop,timeoutMs);
  for(const [stream,list] of [[child.stdout,out],[child.stderr,err]])stream.on('data',bytes=>{if(done||unknown)return;count+=bytes.length;if(count>maxBytes)stop();else list.push(bytes);});
  child.stdin.on('error',error=>{if(error.code==='EPIPE'){inputClosed=true;}else stop();});
  child.on('error',()=>finish(Error('OPERATIONAL_TRANSPORT_SPAWN_FAILED')));
  child.on('close',(code,signal)=>{
   if(signal||inputClosed&&code===0||!Number.isInteger(code))unknown=true;
   finish(unknown?Error('OPERATIONAL_TRANSPORT_OUTCOME_UNKNOWN'):null,code,signal);
  });
  child.stdin.end(stdin);
 });
}
