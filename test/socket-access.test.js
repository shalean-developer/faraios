import test from 'node:test';
import assert from 'node:assert/strict';
import access from '../src/socket-access.cjs';

test('permission diagnostic parses numeric access ACLs including effective masks',()=>{
  const text='user::rwx\nuser:1234:rwx\t#effective:r-x\ngroup::r-x\ngroup:5678:rw-\t#effective:r--\nmask::r-x\nother::---\n';
  assert.equal(access.parseAccessAcl(text).length,6);
  assert.deepEqual(access.parseAccessAcl('user::rw-\ngroup::r--\nother::r--\n'),['user::rw-','group::r--','other::r--']);
});
test('unrecognized/incomplete ACL diagnostics fail without echoing input',()=>{
  for(const input of ['','user::rwx\nother::---','user::rwx\nuser::rwx\ngroup::---\nother::---','default:user::rwx','sentinel-private-path-or-value'])assert.throws(()=>access.parseAccessAcl(input),e=>/ACL/.test(e.message)&&(!input||!e.message.includes(input)));
});
test('invalid socket paths do not invoke filesystem inspection or expose input',()=>{
  for(const input of ['relative','/sentinel\nprivate',null]){
    const result=access.inspectSocketAccess(input);
    assert.equal(result.complete,false);assert.deepEqual(result.chain,[]);assert.ok(!JSON.stringify(result).includes('sentinel'));
  }
});


test('malformed ACL structures and inconsistent effective permissions are rejected',()=>{
  const base='user::rwx\ngroup::r-x\nother::---\n';
  for(const input of [base.replace('rwx','www'),base+'mask:123:rwx\n',base+'mask::rwx\nmask::r-x\n',base+'user:1234:rwx\n',base+'user:1234:rwx\nuser:1234:r-x\nmask::rwx\n',base+'mask::r--\nuser:1234:rwx #effective:rwx\n'])assert.throws(()=>access.parseAccessAcl(input),/Unrecognized access ACL/);
});
