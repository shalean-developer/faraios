import test from 'node:test';
import assert from 'node:assert/strict';
import {createAuthSessions} from '../src/auth-session.js';
import {bindingKey, createC1TokenService} from '../src/t19-c1.js';
import {createDummyCustody, createDummyCoordinator, dummyRefresh} from '../test-support/t19-c1-dummy.mjs';

const id = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const A = id(10), B = id(20), user = id(1);
const binding = (overrides = {}) => ({business_id: A, environment: 'staging', provider: 'synthetic', connection_id: id(100), generation: 1, organization_id: 'synthetic-a', credential_version: 1, ...overrides});
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return {promise, resolve}; };
async function fixture({refresh, leaseMs = 30000} = {}) {
  let clock = 1000, calls = 0;
  let memberships = [{user_id: user, business_id: A, role: 'owner', status: 'active'}];
  const client = {
    auth: {signInWithPassword: async () => ({data: {session: {expires_at: 999999}}}), getUser: async () => ({data: {user: {id: user}}})},
    from: table => ({select() { return this; }, eq(key) {
      if (table === 'businesses') return Promise.resolve({data: [{id: A, name: 'Dummy A'}, {id: B, name: 'Dummy B'}]});
      return key === 'status' ? Promise.resolve({data: memberships}) : this;
    }})
  };
  const now = () => clock;
  const sessions = createAuthSessions({createClient: () => client, now});
  const session = (await sessions.login('fixture@example.invalid', 'dummy-password')).id;
  const custody = createDummyCustody(), coordinator = createDummyCoordinator({now, leaseMs}), b = binding();
  coordinator.installForTest(b, await custody.provision(b));
  const deps = {sessions, custody, coordinator, now, refresh: async (...args) => { calls++; return refresh ? refresh(...args) : dummyRefresh(); }};
  return {b, custody, coordinator, sessions, session, deps, service: createC1TokenService(deps),
    advance: ms => { clock += ms; }, get calls() { return calls; },
    members: value => { memberships = value; },
    currentBinding: () => coordinator.snapshotForTest().rows[0][1].binding};
}

test('uses existing server session membership; no caller/platform role authority', async () => {
  const f = await fixture();
  for (const role of ['manager', 'staff', 'customer', 'platform_admin']) {
    f.members([{user_id: user, business_id: A, role, status: 'active'}]);
    await assert.rejects(f.service.access(f.session, {...f.b, role: 'owner', platformAdmin: true}));
  }
  f.members([{user_id: user, business_id: B, role: 'owner', status: 'active'}]);
  await assert.rejects(f.service.access(f.session, f.b));
  await assert.rejects(f.service.access('fabricated', f.b));
  assert.equal(f.calls, 0);
});

test('permitted owner refreshes once; cache expires conservatively and is version scoped', async () => {
  const f = await fixture();
  const first = await f.service.access(f.session, f.b), next = f.currentBinding();
  assert.equal(next.credential_version, 2);
  assert.deepEqual(await f.service.access(f.session, next), first);
  await assert.rejects(f.service.access(f.session, f.b), {code: 'stale'});
  f.advance(59000);
  assert.notEqual((await f.service.access(f.session, next)).access_token, first.access_token);
  assert.equal(f.calls, 2);
});

test('cache hits revalidate owner membership and current connection', async () => {
  const f = await fixture();
  await f.service.access(f.session, f.b);
  f.members([]);
  await assert.rejects(f.service.access(f.session, f.currentBinding()));
  assert.equal(f.calls, 1);
});

for (const [field, value] of Object.entries({business_id: B, environment: 'production', connection_id: id(200), generation: 2, organization_id: 'synthetic-other', credential_version: 2, provider: 'zoho'})) {
  test(`ciphertext substitution rejected for ${field}`, async () => {
    const f = await fixture(), encrypted = await f.custody.provision(f.b);
    await assert.rejects(f.custody.read({...f.b, [field]: value}, encrypted));
  });
}

test('substituted credential reference fails before refresh and errors disclose no ciphertext', async () => {
  const f = await fixture();
  const foreign = await f.custody.provision(binding({business_id: B}));
  f.coordinator.substituteForTest(f.b, foreign);
  await assert.rejects(f.service.access(f.session, f.b), {message: 'C1 refresh_unavailable'});
  assert.equal(f.calls, 0);
  assert.equal(f.coordinator.snapshotForTest().rows[0][1].phase, 'idle');
});

test('simultaneous local requests share one refresh; another service cannot dispatch concurrently', async () => {
  const entered = deferred(), release = deferred();
  const f = await fixture({refresh: async () => { entered.resolve(); await release.promise; return dummyRefresh(); }});
  const requests = Array.from({length: 12}, () => f.service.access(f.session, f.b));
  await entered.promise;
  const other = createC1TokenService(f.deps);
  await assert.rejects(other.access(f.session, f.b), {code: 'refresh_busy'});
  release.resolve();
  const values = await Promise.all(requests);
  assert.equal(new Set(values.map(v => v.access_token)).size, 1);
  assert.equal(f.calls, 1);
});

test('business and environment caches never share tokens', async () => {
  const f = await fixture();
  f.members([A, B].map(b => ({user_id: user, business_id: b, role: 'owner', status: 'active'})));
  const b = binding({business_id: B}), prod = binding({environment: 'production'});
  for (const target of [b, prod]) f.coordinator.installForTest(target, await f.custody.provision(target));
  const values = await Promise.all([f.b, b, prod].map(target => f.service.access(f.session, target)));
  assert.equal(new Set(values.map(v => v.access_token)).size, 3);
  assert.equal(f.calls, 3);
});

test('invalid grant is visible and terminal; no retries or alias fallback', async () => {
  const f = await fixture({refresh: async () => ({kind: 'invalid_grant'})});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'reauthorisation_required'});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'reauthorisation_required'});
  assert.equal(f.calls, 1);
  assert.equal(f.coordinator.events.at(-1).state, 'reauthorisation_required');
});

test('uncertain rotated-token outcome survives coordinator snapshot restart without replay', async () => {
  const f = await fixture({refresh: async () => { throw new Error('PRIVATE provider response'); }});
  await assert.rejects(f.service.access(f.session, f.b), {message: 'C1 refresh_unavailable'});
  const coordinator = createDummyCoordinator({now: f.deps.now, snapshot: f.coordinator.snapshotForTest()});
  const restarted = createC1TokenService({...f.deps, coordinator, custody: f.custody.reopenForTest()});
  await assert.rejects(restarted.access(f.session, f.b), {code: 'recovery_required'});
  assert.equal(f.calls, 1);
});

test('restart after dispatch cannot reclaim expired lease; late old result cannot commit', async () => {
  const f = await fixture({leaseMs: 100});
  const lease = await f.coordinator.claim(f.b);
  await f.coordinator.dispatch(f.b, lease);
  f.advance(101);
  const coordinator = createDummyCoordinator({now: f.deps.now, snapshot: f.coordinator.snapshotForTest()});
  await assert.rejects(coordinator.claim(f.b), {code: 'recovery_required'});
  await assert.rejects(coordinator.complete(f.b, lease, {}), {code: 'recovery_required'});
  assert.equal(f.calls, 0);
});

test('restart before dispatch may reclaim expired lease; old claimant is fenced', async () => {
  const f = await fixture({leaseMs: 100});
  const old = await f.coordinator.claim(f.b);
  f.advance(101);
  const coordinator = createDummyCoordinator({now: f.deps.now, snapshot: f.coordinator.snapshotForTest()});
  const lease = await coordinator.claim(f.b);
  assert.notEqual(old.id, lease.id);
  await assert.rejects(coordinator.dispatch(f.b, old), {code: 'stale'});
  await coordinator.dispatch(f.b, lease);
});

test('successful restart retains ciphertext binding and refresh material, not process cache', async () => {
  const f = await fixture();
  await f.service.access(f.session, f.b);
  const snapshot = f.coordinator.snapshotForTest(), b = f.currentBinding();
  assert.equal(JSON.stringify(snapshot).includes('dummy-'), false);
  const coordinator = createDummyCoordinator({now: f.deps.now, snapshot});
  const restarted = createC1TokenService({...f.deps, coordinator, custody: f.custody.reopenForTest()});
  await restarted.access(f.session, b);
  assert.equal(f.calls, 2);
});

for (const reauthorise of [false, true]) {
  test(`late refresh is rejected after ${reauthorise ? 'reauthorisation' : 'disconnect'}`, async () => {
    const entered = deferred(), release = deferred();
    const f = await fixture({refresh: async () => { entered.resolve(); await release.promise; return dummyRefresh(); }});
    const pending = f.service.access(f.session, f.b);
    await entered.promise;
    const next = binding({generation: 2});
    const reference = await f.custody.provision(next);
    f.coordinator.changeForTest(f.b, {reauthorise, reference});
    release.resolve();
    await assert.rejects(pending, {code: 'stale'});
    assert.equal(f.coordinator.events.some(e => e.state === 'refreshed'), false);
    assert.equal(f.currentBinding().generation, 2);
    if (reauthorise) await f.service.access(f.session, next);
  });
}

test('disconnect during custody read stops dispatch', async () => {
  const f = await fixture();
  const custody = {...f.custody, async read(...args) {
    const result = await f.custody.read(...args); f.coordinator.changeForTest(f.b); return result;
  }};
  await assert.rejects(createC1TokenService({...f.deps, custody}).access(f.session, f.b), {code: 'stale'});
  assert.equal(f.calls, 0);
});

test('disconnect during sealing prevents publication', async () => {
  const f = await fixture();
  const custody = {...f.custody, async seal(...args) {
    const result = await f.custody.seal(...args); f.coordinator.changeForTest(f.b); return result;
  }};
  await assert.rejects(createC1TokenService({...f.deps, custody}).access(f.session, f.b), {code: 'stale'});
  assert.equal(f.coordinator.events.some(e => e.state === 'refreshed'), false);
});

test('token lifetime includes refresh latency and expired result enters recovery hold', async () => {
  let f;
  f = await fixture({refresh: async () => { f.advance(59000); return dummyRefresh(); }, leaseMs: 120000});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'expired_result'});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'recovery_required'});
});

test('lease expiry while awaiting custody prevents refresh', async () => {
  const f = await fixture({leaseMs: 10});
  const custody = {...f.custody, async read(...args) { const m = await f.custody.read(...args); f.advance(10); return m; }};
  await assert.rejects(createC1TokenService({...f.deps, custody}).access(f.session, f.b), {code: 'lease_expired'});
  assert.equal(f.calls, 0);
});

test('lease expiry during refresh cannot accept result', async () => {
  let f;
  f = await fixture({leaseMs: 10, refresh: async () => { f.advance(10); return dummyRefresh(); }});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'lease_expired'});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'recovery_required'});
});

test('binding canonicalisation rejects malformed dimensions', () => {
  for (const changes of [{generation: 0}, {credential_version: NaN}, {environment: 'any'}, {business_id: 'other'}, {organization_id: ''}])
    assert.throws(() => bindingKey(binding(changes)), {code: 'binding_rejected'});
});

test('ciphertext tampering and loss of custody key fail closed', async () => {
  const f = await fixture(), reference = await f.custody.provision(f.b);
  await assert.rejects(f.custody.read(f.b, {...reference, tag: '00'.repeat(16)}), {code: 'custody_rejected'});
  await assert.rejects(createDummyCustody().read(f.b, reference), {code: 'custody_rejected'});
});

test('late invalid grant cannot disable a new connection generation', async () => {
  const entered = deferred(), release = deferred();
  const f = await fixture({refresh: async () => { entered.resolve(); await release.promise; return {kind: 'invalid_grant'}; }});
  const pending = f.service.access(f.session, f.b);
  await entered.promise;
  const b = binding({generation: 2});
  f.coordinator.changeForTest(f.b, {reauthorise: true, reference: await f.custody.provision(b)});
  release.resolve();
  await assert.rejects(pending, {code: 'stale'});
  assert.equal((await f.coordinator.current(b)).phase, 'idle');
});

test('disconnect after commit but before cache publication rejects token', async () => {
  const f = await fixture();
  const coordinator = {...f.coordinator, async complete(...args) {
    await f.coordinator.complete(...args); f.coordinator.changeForTest(f.currentBinding());
  }};
  await assert.rejects(createC1TokenService({...f.deps, coordinator}).access(f.session, f.b), {code: 'stale'});
});

test('malformed lifetime and refresh material are held for recovery, never cached', async () => {
  for (const overrides of [{expires_in_ms: 0}, {expires_in_ms: NaN}, {expires_in_ms: -1}, {access_token: ''}, {refresh_token: ''}]) {
    const f = await fixture({refresh: async () => ({...dummyRefresh(), ...overrides})});
    await assert.rejects(f.service.access(f.session, f.b), {code: 'refresh_unavailable'});
    await assert.rejects(f.service.access(f.session, f.b), {code: 'recovery_required'});
    assert.equal(f.calls, 1);
  }
});

test('expired dispatch callback and stale credential version cannot produce effects', async () => {
  const f = await fixture({leaseMs: 10});
  const lease = await f.coordinator.claim(f.b);
  f.advance(10);
  let effects = 0;
  await assert.rejects(f.coordinator.dispatch(f.b, lease, () => { effects++; }), {code: 'lease_expired'});
  assert.equal(effects, 0);
  await f.service.access(f.session, f.b);
  await assert.rejects(f.coordinator.complete(f.b, lease, {}), {code: 'stale'});
});

test('invalid grant arriving after lease expiry is uncertain rather than accepted', async () => {
  let f;
  f = await fixture({leaseMs: 10, refresh: async () => { f.advance(10); return {kind: 'invalid_grant'}; }});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'lease_expired'});
  await assert.rejects(f.service.access(f.session, f.b), {code: 'recovery_required'});
});
