import test from 'node:test';
import assert from 'node:assert/strict';
import {provisionStandardStaging} from '../src/t19-standard-private-setup.js';
import {createTokenCipher,standardConfig} from '../src/t19-standard-secrets.js';
const businessId='11111111-1111-4111-8111-111111111111';
function fixture(){
 const config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.example.test',ZOHO_CLIENT_ID:'synthetic',ZOHO_CLIENT_SECRET:'synthetic',ZOHO_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),ZOHO_TOKEN_KEY_ID:'test',ZOHO_API_DOMAIN:'https://www.zohoapis.com'});
 let row=null,closed=0,refreshes=0,role='owner';const state=new Map();
 const store={async begin(s){state.set(s.digest,s);},async consume(){},async resolve(){},async connection(){return row;},async lock(_e,_b,fn){return fn(async()=>{});},async save(c){row=structuredClone(c);},async publish(_c,organization){Object.assign(row,{status:'connected',organization});},async refresh(_c,envelope){row.envelope=envelope;},async disable(){row.status='revocation_pending';}};
 const provider={async refresh(){refreshes++;return {access_token:'synthetic-access',expires_in:3600};},async organization(_a,id){return {id,name:'Synthetic TEST',currency:'ZAR'};}};
 const components={config,store,provider,cipher:createTokenCipher(config)};
 const input={version:1,environment:'staging',businessId,organizationId:'123',ownerEmail:'owner@example.test',ownerPassword:'synthetic-owner-input',refreshToken:'synthetic-private-input'};
 const authenticateOwner=async({sessionId})=>({sessions:{async read(sid){return sid===sessionId?{userId:'verified-owner',businessIds:[businessId],memberships:[{businessId,role}]}:null;}},async close(){closed++;}});
 return {components,input,authenticateOwner,closed:()=>closed,refreshes:()=>refreshes,row:()=>row,setRole:v=>role=v};
}
test('private setup proves a second refresh from encrypted storage and closes owner session',async()=>{
 const f=fixture(),result=await provisionStandardStaging(f);
 assert.equal(result.automaticRefreshVerified,true);assert.equal(result.organization.id,'123');assert.equal(f.refreshes(),2);assert.equal(f.closed(),1);
 assert.equal(f.row().status,'connected');assert.ok(!JSON.stringify(result).includes(f.input.refreshToken));assert.ok(!JSON.stringify(f.row()).includes(f.input.refreshToken));
});
test('private setup rejects environment/field confusion before authentication',async()=>{
 for(const delta of [{environment:'production'},{extra:'ignored'},{ownerPassword:''}]){
  const f=fixture();let calls=0;
  await assert.rejects(()=>provisionStandardStaging({...f,input:{...f.input,...delta},authenticateOwner:async()=>{calls++;assert.fail();}}));assert.equal(calls,0);assert.equal(f.row(),null);
 }
});
test('non-owner cannot provision; provider errors are redacted and session closes',async()=>{
 const f=fixture();f.setRole('manager');await assert.rejects(()=>provisionStandardStaging(f),e=>e.message==='accounting_private_setup_rejected');assert.equal(f.row(),null);assert.equal(f.closed(),1);
 const g=fixture();g.components.provider.refresh=async()=>{throw Error(g.input.refreshToken);};
 await assert.rejects(()=>provisionStandardStaging(g),e=>e.message==='accounting_private_setup_rejected');assert.equal(g.closed(),1);assert.equal(g.row().status,'revocation_pending');
});
test('failed post-publication refresh fences only the newly provisioned generation',async()=>{
 const f=fixture();let calls=0;
 f.components.provider.refresh=async()=>{if(++calls===2)throw Error(f.input.refreshToken);return {access_token:'synthetic',expires_in:3600};};
 await assert.rejects(()=>provisionStandardStaging(f),e=>e.message==='accounting_private_setup_rejected');
 assert.equal(f.row().status,'revocation_pending');assert.equal(f.closed(),1);
});
test('private code input is exclusive and exchange remains internal',async()=>{
 const f=fixture(),{refreshToken,...base}=f.input;let exchanges=0;
 f.input={...base,grantCode:'synthetic-code'};
 f.components.provider.exchangePrivateCode=async()=>{exchanges++;return {refresh_token:'synthetic-issued'};};
 const result=await provisionStandardStaging(f);assert.equal(exchanges,1);assert.equal(result.automaticRefreshVerified,true);assert.ok(!JSON.stringify(result).includes('synthetic-code'));
 const g=fixture();await assert.rejects(()=>provisionStandardStaging({...g,input:{...g.input,grantCode:'synthetic-code'}}));assert.equal(g.row(),null);
});
