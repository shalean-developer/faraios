import test from 'node:test';
import assert from 'node:assert/strict';
import {parseBranding,readBranding,saveBranding,renderBranding} from '../src/t31-branding.js';
import {parseStaffInvitation,createStaffInvitation,acceptStaffInvitation,listBusinessMembers,suspendBusinessMember} from '../src/t31-staff-invitations.js';
const bid='10000000-0000-4000-8000-000000000031';
const token='20000000-0000-4000-8000-000000000031';
test('T31 branding requires safe colour and HTTPS asset, escapes untrusted display',()=>{
 const good=parseBranding(new URLSearchParams({accent_color:'#146c94',logo_url:'https://cdn.example.invalid/logo.png'}));
 assert.deepEqual(good,{accent_color:'#146C94',logo_url:'https://cdn.example.invalid/logo.png'});
 for(const logo of ['http://evil.invalid/a.png','javascript:alert(1)','https://user:password@example.com/img.png','https://example.com/../file','https://example.com/a" onerror="alert(1)']){
  assert.throws(()=>parseBranding(new URLSearchParams({accent_color:'#146C94',logo_url:logo})));
 }
 assert.throws(()=>parseBranding(new URLSearchParams({accent_color:'red',logo_url:''})));
 assert.doesNotMatch(renderBranding({id:bid,name:'<script>bad</script>'},good),/<script>/);
});
test('T31 branding database adapter scopes all reads and writes to business',async()=>{
 const calls=[];
 const q={select(){return this;},eq(k,v){calls.push(['eq',k,v]);return this;},maybeSingle:async()=>({data:{business_id:bid,accent_color:'#146C94'}})};
 const client={from:t=>{assert.equal(t,'t31_business_branding');return { ...q,upsert(row,opts){calls.push(['upsert',row,opts]);return {select:async()=>({data:[{business_id:bid}]})};}}}};
 await readBranding(client,bid);await saveBranding(client,bid,{accent_color:'#146C94',logo_url:''});
 assert.deepEqual(calls[0],['eq','business_id',bid]);
 assert.equal(calls[1][1].business_id,bid);
});
test('T31 invitation never accepts owner role or forged tenant/token',async()=>{
 assert.deepEqual(parseStaffInvitation(new URLSearchParams({email:'STAFF@EXAMPLE.INVALID',role:'staff'})),{email:'staff@example.invalid',role:'staff'});
 for(const role of ['owner','platform_admin',''])assert.throws(()=>parseStaffInvitation(new URLSearchParams({email:'staff@example.invalid',role})));
 await assert.rejects(createStaffInvitation({rpc:async()=>{throw Error('should not call');}},'foreign',{email:'staff@example.invalid',role:'staff'}),/Invalid business/);
 await assert.rejects(acceptStaffInvitation({rpc:async()=>{throw Error('should not call');}},'forged'),/Check invitation code/);
});
test('T31 invite/accept sends only audited RPC arguments; errors redact details',async()=>{
 const calls=[];
 const client={rpc:async(fn,params)=>{calls.push([fn,params]);return fn==='t31_invite_staff'?{data:token}:{data:bid};}};
 assert.equal(await createStaffInvitation(client,bid,{email:'staff@example.invalid',role:'manager'}),token);
 assert.equal(await acceptStaffInvitation(client,token),bid);
 assert.deepEqual(calls,[['t31_invite_staff',{p_business:bid,p_email:'staff@example.invalid',p_role:'manager'}],['t31_accept_invite',{p_token:token}]]);
 const bad={rpc:async()=>({error:{message:'secret auth schema detail'}})};
 await assert.rejects(createStaffInvitation(bad,bid,{email:'staff@example.invalid',role:'staff'}),e=>!e.message.includes('secret'));
 await assert.rejects(acceptStaffInvitation(bad,token),e=>!e.message.includes('secret'));
});

test('T31 membership management rejects malformed IDs and verifies typed owner-scoped results',async()=>{
 const user='00000000-0000-4000-8000-000000000031';
 const calls=[];
 const client={rpc:async(name,params)=>{calls.push([name,params]);return name==='t31_staff_members'
   ?{data:[{user_id:user,role:'staff',status:'active'}]}:{data:true};}};
 assert.deepEqual(await listBusinessMembers(client,bid),[{user_id:user,role:'staff',status:'active'}]);
 await suspendBusinessMember(client,bid,user);
 assert.deepEqual(calls,[['t31_staff_members',{p_business:bid}],['t31_suspend_member',{p_business:bid,p_user:user}]]);
 await assert.rejects(suspendBusinessMember(client,bid,'forged'),/Invalid membership/);
 await assert.rejects(listBusinessMembers({rpc:async()=>({data:[{user_id:user,role:'platform_admin',status:'active'}]})},bid),/Team access unavailable/);
 await assert.rejects(suspendBusinessMember({rpc:async()=>({error:{message:'private details'}})},bid,user),e=>!e.message.includes('private'));
});
