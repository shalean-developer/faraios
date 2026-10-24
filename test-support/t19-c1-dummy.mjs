// Dummy-only custody/coordinator. Not imported by any hosted entrypoint.
import {createCipheriv, createDecipheriv, randomBytes, randomUUID} from 'node:crypto';
import {bindingKey, credentialBinding, c1Error} from '../src/t19-c1.js';

function dummy(binding) {
  const b = credentialBinding(binding);
  if (b.provider !== 'synthetic' || !b.organization_id.startsWith('synthetic-')) throw c1Error('dummy_only');
  return b;
}
const token = () => 'dummy-' + randomUUID();
const validMaterial = m => m && typeof m.refresh_token === 'string' && /^dummy-[0-9a-f-]{36}$/.test(m.refresh_token);

export function createDummyCustody() {
  const key = randomBytes(32);
  const api = {
    async seal(binding, material) {
      dummy(binding);
      if (!validMaterial(material)) throw c1Error('dummy_only');
      const nonce = randomBytes(12), cipher = createCipheriv('aes-256-gcm', key, nonce);
      cipher.setAAD(Buffer.from(bindingKey(binding)));
      const body = Buffer.concat([cipher.update(JSON.stringify({refresh_token: material.refresh_token})), cipher.final()]);
      return {nonce: nonce.toString('hex'), body: body.toString('hex'), tag: cipher.getAuthTag().toString('hex')};
    },
    async read(binding, reference) {
      dummy(binding);
      try {
        const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(reference.nonce, 'hex'));
        decipher.setAAD(Buffer.from(bindingKey(binding)));
        decipher.setAuthTag(Buffer.from(reference.tag, 'hex'));
        const value = JSON.parse(Buffer.concat([decipher.update(Buffer.from(reference.body, 'hex')), decipher.final()]).toString());
        if (!validMaterial(value)) throw new Error();
        return value;
      } catch { throw c1Error('custody_rejected'); }
    },
    provision(binding) { return api.seal(binding, {refresh_token: token()}); },
    // Simulates reopening with retained key custody; no disk durability or KMS claim.
    reopenForTest() { return {...api}; }
  };
  return Object.freeze(api);
}

/** Executable fake of atomic coordination. Synchronous Map transitions are the
 * only linearisation boundary here. Snapshot/reopen tests model restart state;
 * they do not establish crash durability, distributed locking or hosted RLS.
 */
export function createDummyCoordinator({now = Date.now, leaseMs = 30000, snapshot} = {}) {
  if (!Number.isSafeInteger(leaseMs) || leaseMs < 1) throw c1Error('configuration_rejected');
  const rows = new Map(snapshot ? structuredClone(snapshot.rows) : []);
  const events = snapshot ? structuredClone(snapshot.events) : [];
  const rowKey = b => JSON.stringify([b.business_id, b.environment, b.connection_id]);
  const event = (b, state) => events.push({binding: {...b}, state});
  function current(b) {
    dummy(b);
    const r = rows.get(rowKey(b));
    if (!r || bindingKey(r.binding) !== bindingKey(b) || r.status !== 'active') throw c1Error('stale');
    if (['recovery_required', 'reauthorisation_required'].includes(r.phase)) throw c1Error(r.phase);
    return r;
  }
  function fenced(b, lease) {
    const r = current(b);
    if (!r.lease || r.lease.id !== lease.id) throw c1Error('stale');
    if (r.lease.expires_at <= now()) throw c1Error('lease_expired');
    return r;
  }
  return Object.freeze({
    installForTest(binding, reference) {
      const b = dummy(binding);
      if (rows.has(rowKey(b))) throw c1Error('already_exists');
      rows.set(rowKey(b), {binding: b, reference: structuredClone(reference), status: 'active', phase: 'idle', lease: null});
      event(b, 'installed');
    },
    async current(b) { return structuredClone(current(b)); },
    async claim(b) {
      const r = current(b);
      if (r.phase === 'dispatched') {
        if (r.lease.expires_at <= now()) { r.phase = 'recovery_required'; event(b, r.phase); }
        throw c1Error(r.phase === 'dispatched' ? 'refresh_busy' : r.phase);
      }
      if (r.lease && r.lease.expires_at > now()) throw c1Error('refresh_busy');
      r.lease = {id: randomUUID(), expires_at: now() + leaseMs};
      r.phase = 'claimed'; event(b, r.phase);
      return {...r.lease};
    },
    async dispatch(b, lease, effect = () => {}) {
      const r = fenced(b, lease);
      if (r.phase !== 'claimed') throw c1Error('stale');
      r.phase = 'dispatched'; event(b, r.phase);
      return effect();
    },
    async complete(b, lease, reference) {
      const r = fenced(b, lease);
      if (r.phase !== 'dispatched') throw c1Error('stale');
      r.binding = credentialBinding({...b, credential_version: b.credential_version + 1});
      r.reference = structuredClone(reference); r.phase = 'idle'; r.lease = null;
      event(r.binding, 'refreshed');
    },
    async fail(b, lease, state) {
      if (!['idle', 'recovery_required', 'reauthorisation_required'].includes(state)) throw c1Error('invalid_state');
      // Failure recording may follow lease expiry, but never overwrite another
      // owner/generation/version or a terminal invalid-grant/recovery hold.
      const r = current(b);
      if (r.lease?.id !== lease.id) throw c1Error('stale');
      if (state === 'reauthorisation_required' && r.lease.expires_at <= now()) throw c1Error('lease_expired');
      r.phase = r.phase === 'dispatched' && state === 'idle' ? 'recovery_required' : state;
      r.lease = null; event(b, r.phase);
    },
    changeForTest(b, {reauthorise = false, reference} = {}) {
      const r = rows.get(rowKey(b));
      if (!r || bindingKey(r.binding) !== bindingKey(b)) throw c1Error('stale');
      event(r.binding, 'retired');
      r.binding = credentialBinding({...b, generation: b.generation + 1, credential_version: 1});
      r.status = reauthorise ? 'active' : 'disabled'; r.phase = 'idle'; r.lease = null;
      r.reference = reauthorise ? structuredClone(reference) : null;
      event(r.binding, r.status); return {...r.binding};
    },
    substituteForTest(b, reference) { rows.get(rowKey(b)).reference = structuredClone(reference); },
    snapshotForTest() { return structuredClone({rows: [...rows], events}); },
    get events() { return structuredClone(events); }
  });
}

export function dummyRefresh() {
  return {kind: 'success', access_token: token(), refresh_token: token(), expires_in_ms: 60000};
}
