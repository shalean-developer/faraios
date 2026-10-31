import test from 'node:test';
import assert from 'node:assert/strict';
import {renderStandardConnectionPage} from '../src/t19-standard-page.js';
const businessId='11111111-1111-4111-8111-111111111111';
const identity={userId:'owner',businesses:[{id:businessId,name:'Synthetic <business>'}],memberships:[{userId:'owner',businessId,role:'owner',status:'active'}]};
test('connection workspace escapes provider metadata and never implies sync activation',()=>{
 const html=renderStandardConnectionPage({identity,businessId,onboardingMode:'private',status:{status:'connected',organization:{name:'<script>bad</script>',id:'123'}}});
 assert.match(html,/&lt;script&gt;bad&lt;\/script&gt;/);assert.doesNotMatch(html,/<script>bad/);
 assert.match(html,/Synthetic &lt;business&gt;/);assert.match(html,/Approved staging drafts only/);
 assert.match(html,/aria-current="page"/);assert.match(html,/action="\/accounting\/[^\"]+\/disconnect"/);
 assert.match(html,/<details><summary>Disconnect Zoho Books/);assert.doesNotMatch(html,/name="(?:token|clientSecret)"/);
 assert.throws(()=>renderStandardConnectionPage({identity,businessId:'foreign',status:{status:'connected'}}));
});
test('pending revocation is visibly disabled and offers retry rather than connected status',()=>{
 const html=renderStandardConnectionPage({identity,businessId,onboardingMode:'private',status:{status:'revocation_pending'}});
 assert.match(html,/Access is disabled in FaraiOS/);assert.match(html,/Retry token revocation/);
 assert.doesNotMatch(html,/>Connected</);
});
