import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createPaymentSetupHandler} from '../src/t20-payment-setup.js';
const business='11111111-1111-4111-8111-111111111111';
async function run({method='POST',body='accountId=123&confirm=yes',owner=true,signedIn=true,headers={}}={}){
 const calls=[],req=Readable.from([Buffer.from(body)]);req.method=method;req.url='/payments/'+business+'/settings';req.headers={host:'staging.faraios.com',origin:'https://staging.faraios.com',cookie:'sid=synthetic','content-type':'application/x-www-form-urlencoded',...headers};
 const res={writeHead(status,headers){this.status=status;this.headers=headers;},end(body){this.body=body;}};
 const auth={read:async()=>signedIn?{userId:business}:null,withOwner:async(sid,bid,fn)=>{assert.equal(bid,business);if(!owner)throw Error();return fn({rpc:async(name,args)=>{calls.push({name,...args});return {data:{},error:null};}});}};
 await createPaymentSetupHandler()({req,res,auth,cookieName:'sid'});return {res,calls};
}
test('owner setup uses real-session owner RPC and never takes credentials from browser',async()=>{
 const r=await run();assert.equal(r.res.status,303);assert.deepEqual(r.calls,[{name:'t20_payment_owner',action:'configure',input:{businessId:business,accountId:'123',enabled:true}}]);
 const get=await run({method:'GET',body:''});assert.equal(get.res.status,200);assert.equal(get.calls.length,0);assert.match(get.res.body,/does not activate checkout/);assert.ok(!get.res.body.includes('secretKey'));
});
test('manager/foreign owner, unsigned sessions, cross-origin, duplicate fields and secret overrides rejected',async()=>{
 for(const options of [{owner:false},{signedIn:false},{headers:{origin:'https://evil.example.test'}},{headers:{cookie:'sid=a;sid=b'}},{body:'accountId=123&confirm=yes&secretKey=synthetic'},{body:'accountId=123&accountId=456&confirm=yes'},{body:'accountId=0&confirm=yes'},{body:'accountId=123'},{body:'x'.repeat(1025)}]){
  const r=await run(options);assert.notEqual(r.res.status,303);assert.equal(r.calls.length,0);
 }
});
