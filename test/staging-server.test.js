import test from 'node:test';
import assert from 'node:assert/strict';
import {createStagingServer} from '../src/staging-server.js';
const uid='00000000-0000-4000-8000-000000000001',bid='10000000-0000-4000-8000-000000000001';
async function run(fn){
  const factory=()=>({auth:{signInWithPassword:async({password})=>password==='test-password'?{data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}}:{error:{message:'bad'}},getUser:async()=>({data:{user:{id:uid}}}),signOut:async()=>({})},from:table=>({select(){return this;},eq(key){if(table==='businesses')return Promise.resolve({data:[{id:bid,name:'Synthetic Co'}]});return key==='status'?Promise.resolve({data:[{user_id:uid,business_id:bid,role:'manager',status:'active'}]}):this;}})});
  const server=createStagingServer({createClient:factory});await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}`;
  try{await fn(base);}finally{await new Promise(r=>server.close(r));}
}
test('staging login posts to provider contract and scopes authenticated dashboard',async()=>run(async base=>{
  const page=await fetch(base+'/login');assert.match(await page.text(),/type="password"/);assert.equal(page.headers.get('referrer-policy'),'same-origin');
  const login=await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=test-password',redirect:'manual'});
  assert.equal(login.status,303);const Cookie=login.headers.get('set-cookie').split(';')[0];assert.match(login.headers.get('set-cookie'),/HttpOnly; SameSite=Strict/);
  const dashboard=await fetch(base+'/dashboard',{headers:{Cookie}});assert.match(await dashboard.text(),/Synthetic Co/);
  assert.equal((await fetch(base+'/dashboard?business=other',{headers:{Cookie}})).status,403);
  await fetch(base+'/logout',{method:'POST',headers:{Cookie,Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'',redirect:'manual'});
  assert.equal((await fetch(base+'/dashboard',{headers:{Cookie},redirect:'manual'})).status,303);
}));
test('staging login rejects foreign origins and throttles repeated failures',async()=>run(async base=>{
  assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:'https://example.com','Content-Type':'application/x-www-form-urlencoded'},body:'email=x&password=x'})).status,403);
  for(let i=0;i<5;i++)assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=wrong'})).status,401);
  assert.equal((await fetch(base+'/login',{method:'POST',headers:{Origin:base,'Content-Type':'application/x-www-form-urlencoded'},body:'email=test%40example.invalid&password=wrong'})).status,429);
}));
