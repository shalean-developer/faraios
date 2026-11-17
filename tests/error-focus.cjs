const vm=require('node:vm'),assert=require('node:assert/strict'),fs=require('node:fs');
const script=fs.readFileSync(require('node:path').join(__dirname,'../account/error-focus.js'),'utf8');
function page({present=true,complete=false}={}) {
 const body={},chosen={};let calls=0,tabindex,load;const timers=[];
 const document={body,activeElement:body,readyState:complete?'complete':'loading',querySelector(s){assert.equal(s,'main .alert[role="alert"]');return present?alert:null;}};
 const alert={setAttribute(k,v){assert.equal(k,'tabindex');tabindex=v;},focus(){calls++;document.activeElement=alert;}};
 vm.runInNewContext(script,{document,window:{addEventListener(event,fn,opts){assert.equal(event,'load');assert.equal(opts.once,true);load=fn;}},setTimeout(fn,delay){assert.equal(delay,0);timers.push(fn);}});
 return {document,body,chosen,alert,get calls(){return calls;},get tabindex(){return tabindex;},load(){if(load)load();},flush(){while(timers.length)timers.shift()();}};
}
let p=page();assert.equal(p.calls,1);assert.equal(p.tabindex,'-1');p.document.activeElement=p.body;p.load();p.flush();assert.equal(p.document.activeElement,p.alert);
p=page();p.document.activeElement=p.chosen;p.load();p.flush();assert.equal(p.document.activeElement,p.chosen);assert.equal(p.calls,1);
p=page({complete:true});p.document.activeElement=p.body;p.flush();assert.equal(p.calls,2);
p=page({present:false});p.load();p.flush();assert.equal(p.calls,0);
console.log('PASS: initial error focus, post-load BODY recovery, user-control focus preserved, complete-document recovery, no-alert no-op. DOM unit evidence only.');
