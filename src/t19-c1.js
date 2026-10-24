// Inactive C1 contract. No routes, environment reads, network or hosted defaults.
// All adapters are trusted server dependencies, never request-body objects.
const fields = ['business_id', 'environment', 'provider', 'connection_id', 'generation', 'organization_id', 'credential_version'];
export function c1Error(code) { return Object.assign(new Error(`C1 ${code}`), {code}); }
export function credentialBinding(value) {
  const uuid = v => typeof v === 'string' && /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v);
  if (!value || !uuid(value.business_id) || !uuid(value.connection_id)
    || !['synthetic', 'staging', 'production'].includes(value.environment)
    || !['synthetic', 'zoho'].includes(value.provider)
    || typeof value.organization_id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(value.organization_id)
    || !Number.isSafeInteger(value.generation) || value.generation < 1
    || !Number.isSafeInteger(value.credential_version) || value.credential_version < 1) throw c1Error('binding_rejected');
  return Object.freeze(Object.fromEntries(fields.map(k => [k, value[k]])));
}
export const bindingKey = value => JSON.stringify(fields.map(k => credentialBinding(value)[k]));

/** Custody: read(binding, reference), seal(binding, material).
 * Coordinator: current(binding), claim(binding), dispatch(binding, lease, effect),
 * complete(binding, lease, sealed), fail(binding, lease, state).
 * dispatch/complete/fail MUST atomically fence generation, credential version,
 * connection status, lease identity and lease expiry in authoritative storage.
 * dispatch invokes effect synchronously at its fenced dispatch boundary (no
 * intervening asynchronous prerequisite), after recording dispatch intent.
 * A dispatched lease is never automatically reclaimed: recovery must reconcile
 * possible refresh-token rotation. seal is preparation, complete is publication.
 * sessions is the existing createAuthSessions object; withOwner revalidates
 * server memberships. This owner-only harness is NOT a background-worker API.
 */
export function createC1TokenService({sessions, coordinator, custody, refresh, now = Date.now, skewMs = 1000}) {
  if (typeof sessions?.withOwner !== 'function' || typeof refresh !== 'function'
    || !Number.isSafeInteger(skewMs) || skewMs < 0) throw c1Error('configuration_rejected');
  for (const name of ['current', 'claim', 'dispatch', 'complete', 'fail'])
    if (typeof coordinator?.[name] !== 'function') throw c1Error('configuration_rejected');
  for (const name of ['read', 'seal']) if (typeof custody?.[name] !== 'function') throw c1Error('configuration_rejected');
  const cache = new Map(), flights = new Map();
  const fresh = value => value && Number.isSafeInteger(value.expires_at) && value.expires_at > now() + skewMs;
  async function authorised(session, binding) {
    // No caller roles, platform flags or identity objects enter this boundary.
    // Membership denial belongs to this caller, not the shared connection cache.
    await sessions.withOwner(session, binding.business_id, async () => {});
    try {
      return await coordinator.current(binding);
    } catch (error) { cache.delete(bindingKey(binding)); throw error; }
  }
  async function perform(session, binding) {
    const lease = await coordinator.claim(binding);
    let dispatched = false;
    try {
      const current = await authorised(session, binding);
      const material = await custody.read(binding, current.reference);
      await authorised(session, binding);
      let started;
      // Adapter must mark intent BEFORE the refresh side effect. No retry here.
      const result = await coordinator.dispatch(binding, lease, () => {
        started = now();
        dispatched = true;
        return refresh(binding, material);
      });
      if (result?.kind === 'invalid_grant') {
        await coordinator.fail(binding, lease, 'reauthorisation_required');
        throw c1Error('reauthorisation_required');
      }
      if (result?.kind !== 'success' || typeof result.access_token !== 'string'
        || !result.access_token || !Number.isSafeInteger(result.expires_in_ms) || result.expires_in_ms <= 0
        || result.expires_in_ms > 86400000 || (result.refresh_token !== undefined
          && (typeof result.refresh_token !== 'string' || !result.refresh_token))) throw c1Error('refresh_result_rejected');
      // Conservatively count lifetime from dispatch start, not response arrival.
      const token = {access_token: result.access_token, expires_at: started + result.expires_in_ms};
      if (!fresh(token)) throw c1Error('expired_result');
      await authorised(session, binding);
      const next = credentialBinding({...binding, credential_version: binding.credential_version + 1});
      const sealed = await custody.seal(next, {...material, refresh_token: result.refresh_token ?? material.refresh_token});
      await authorised(session, binding);
      if (!fresh(token)) throw c1Error('expired_result');
      await coordinator.complete(binding, lease, sealed);
      // Recheck after the atomic commit before publishing a process-local cache.
      await authorised(session, next);
      if (!fresh(token)) throw c1Error('expired_result');
      cache.set(bindingKey(next), token);
      return next;
    } catch (error) {
      cache.delete(bindingKey(binding));
      // An adapter must keep terminal/unknown states monotonic and ignore stale
      // failure writers. Never leak transport errors, credentials or response bodies.
      try { await coordinator.fail(binding, lease, dispatched ? 'recovery_required' : 'idle'); } catch {}
      const allowed = ['reauthorisation_required', 'expired_result', 'stale', 'lease_expired'];
      throw c1Error(allowed.includes(error.code) ? error.code : 'refresh_unavailable');
    }
  }
  return Object.freeze({
    async access(session, input) {
      const binding = credentialBinding(input), key = bindingKey(binding);
      await authorised(session, binding);
      const cached = cache.get(key);
      if (fresh(cached)) return {...cached};
      cache.delete(key);
      if (!flights.has(key)) {
        const flight = perform(session, binding).finally(() => flights.delete(key));
        flights.set(key, flight);
      }
      const next = await flights.get(key);
      // Each waiting caller must independently retain owner membership.
      await authorised(session, next);
      const token = cache.get(bindingKey(next));
      if (!fresh(token)) throw c1Error('expired_result');
      return {...token};
    },
    clear() { cache.clear(); }
  });
}
