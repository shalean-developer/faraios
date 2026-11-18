// Isolated DOM lifecycle: progress is announced only while submitting and resets on return.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const handlers={},attrs={},form={addEventListener:(k,v)=>handlers[k]=v,setAttribute:(k,v)=>attrs[k]=v,removeAttribute:k=>delete attrs[k]},notice={hidden:true};
vm.runInNewContext(fs.readFileSync('account/platform-directory.js','utf8'),{document:{getElementById:id=>id==='directory-filters'?form:notice},window:{addEventListener:(k,v)=>handlers[k]=v}});
handlers.submit();assert.equal(notice.hidden,false);assert.equal(attrs['aria-busy'],'true');
handlers.pageshow();assert.equal(notice.hidden,true);assert.equal(attrs['aria-busy'],undefined);
console.log(JSON.stringify({status:'PASS',assertions:4,network_calls:0}));
