import test from 'node:test';
import assert from 'node:assert/strict';
import {createC1TokenService} from '../src/t19-c1.js';
import {createDummyCustody, createDummyCoordinator, dummyRefresh} from '../test-support/t19-c1-dummy.mjs';

// Promoted independent review probes. The minimal trusted membership adapter
// isolates caller-specific denial; t19-c1.test.js exercises createAuthSessions.
const binding = {business_id: '00000000-0000-4000-8000-000000000010', environment: 'staging',
  provider: 'synthetic', connection_id: '00000000-0000-4000-8000-000000000100',
  generation: 1, organization_id: 'synthetic-review', credential_version: 1};
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
async function fixture() {
  let calls = 0;
  const authorised = new Set(['a', 'b']);
  const sessions = {async withOwner(session, business, action) {
    assert.equal(business, binding.business_id);
    if (!authorised.has(session)) throw new Error('Membership denied');
    return action();
  }};
  const custody = createDummyCustody(), coordinator = createDummyCoordinator({now: () => 1000});
  coordinator.installForTest(binding, await custody.provision(binding));
  return {authorised, get calls() { return calls; },
    deps: {sessions, custody, coordinator, now: () => 1000,
      refresh: async () => { calls++; return dummyRefresh(); }}};
}

test('revoked coalesced waiter cannot evict the authorised initiator token', async () => {
  const f = await fixture(), entered = deferred(), release = deferred();
  const service = createC1TokenService({...f.deps, refresh: async () => {
    entered.resolve(); await release.promise; return f.deps.refresh();
  }});
  const first = service.access('a', binding);
  await entered.promise;
  const second = service.access('b', binding);
  const denied = assert.rejects(second, {message: 'Membership denied'});
  await new Promise(resolve => setImmediate(resolve));
  f.authorised.delete('b'); release.resolve();
  const results = await Promise.allSettled([first, denied]);
  assert.equal(results[0].status, 'fulfilled', results[0].reason?.message);
  assert.equal(results[1].status, 'fulfilled', results[1].reason?.message);
  assert.match(results[0].value.access_token, /^dummy-/);
  assert.equal(f.calls, 1);
  assert.deepEqual(await service.access('a', {...binding, credential_version: 2}), results[0].value);
});

test('unknown session cannot evict another owner current token or force a refresh', async () => {
  const f = await fixture(), service = createC1TokenService(f.deps);
  const first = await service.access('a', binding), next = {...binding, credential_version: 2};
  await assert.rejects(service.access('unknown-session', next), {message: 'Membership denied'});
  const second = await service.access('a', next);
  assert.equal(f.calls, 1);
  assert.deepEqual(second, first);
});
