const vm=require('node:vm'),assert=require('node:assert/strict'),fs=require('node:fs');
const script=fs.readFileSync(require('node:path').join(__dirname,'../account/error-focus.js'),'utf8');
let focused=false,tabindex;
const alert={setAttribute(k,v){assert.equal(k,'tabindex');tabindex=v;},focus(){focused=true;}};
vm.runInNewContext(script,{document:{querySelector(s){assert.equal(s,'main .alert[role="alert"]');return alert;}}});
assert(focused);assert.equal(tabindex,'-1');
vm.runInNewContext(script,{document:{querySelector(){return null;}}});
console.log('PASS: workspace server error receives focus; successful pages do not change focus. DOM unit evidence only.');
