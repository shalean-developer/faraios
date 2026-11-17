// Exercise the shipped script's rejection precedence without network or credentials.
const {readFileSync}=require('node:fs');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const source=readFileSync(require('node:path').join(__dirname,'../account/account.js'),'utf8');
function run({error=false,type='email',hash='a'.repeat(64),fragment=false}={}){
 const state={removed:false,focused:false,cleaned:false};
 const alert={setAttribute(k,v){this[k]=v;},focus(){state.focused=true;}};
 const nodes={'confirm-button':{disabled:true,form:{remove(){state.removed=true;}}},token_hash:{value:fragment?'':hash},type:{value:fragment?'':type},'confirmation-intro':{textContent:'Continue'},'link-status':{textContent:'Checking'}};
 const document={querySelectorAll(){return [];},querySelector(){return error?alert:null;},getElementById(id){return nodes[id]||null;}};
 vm.runInNewContext(source,{document,URLSearchParams,location:{hash:fragment?'#token_hash='+hash+'&type='+type:'',pathname:'/account/index.php',search:'?page=confirm'},history:{replaceState(){state.cleaned=true;}}});
 return {...state,nodes,alert};
}
for(const type of ['email','recovery','email_change']){
 const bad=run({error:true,type});assert(bad.removed);assert(bad.focused);assert(bad.cleaned);assert.equal(bad.alert.tabindex,'-1');assert(!bad.nodes['link-status'].textContent.includes('ready'));assert(bad.nodes['confirm-button'].disabled);
 const fresh=run({type,fragment:true});assert(!fresh.removed);assert(!fresh.focused);assert(fresh.cleaned);assert.equal(fresh.nodes['confirm-button'].disabled,false);assert.equal(fresh.nodes.token_hash.value,'a'.repeat(64));
}
const missing=run({hash:''});assert(missing.nodes['confirm-button'].disabled);assert(missing.nodes['link-status'].textContent.includes('incomplete'));
const nativeChange=run({hash:'',type:'email_change'});assert(nativeChange.removed);assert(nativeChange.nodes['link-status'].textContent.includes('both inboxes'));
console.log('PASS: 8 link states; rejected links never become ready; error focus; deliberate confirmation and fragment cleanup preserved. DOM unit evidence, not browser/phone acceptance.');
