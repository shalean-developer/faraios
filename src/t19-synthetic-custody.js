// T19-CUSTODY-01C: synthetic-only isolated custody/coordinator harness.
// No provider imports, external IO, Vault calls, env access or hosted entrypoint.
import {randomBytes, randomUUID, createCipheriv, createDecipheriv} from 'node:crypto';
const fail=(code='custody_denied')=>Object.assign(new Error(code),{code});
const bindingFields=['business_id','environment','provider','connection_id','generation','organization_id','credential_version'];
export function checkedBinding(v){
  if(!v||typeof v!=='object'|| !/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v.business_id??'')||!/^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v.connection_id??'')||v.environment!=='synthetic'||v.provider!=='synthetic'||!/^synthetic-[a-z0-9-]{1,40}$/.test(v.organization_id??'')||![v.generation,v.credential_version].every(x=>Number.isSafeInteger(x)&&x>0))throw fail();
  return Object.freeze(Object.fromEntries(bindingFields.map(k=>[k,v[k]])));
}
const key=x=>JSON.stringify(Object.values(checkedBinding(x)));
const encode=x=>Buffer.from(JSON.stringify(x));
const validMaterial=(m,b)=>m&&Object.getPrototypeOf(m)===Object.prototype&&Object.keys(m).sort().join(',')==='kind,organization_id,refresh_token'&&m.kind==='synthetic'&&m.organization_id===b.organization_id&&typeof m.refresh_token==='string'&&(/^(?:fake-[a-zA-Z0-9-]{1,32}|DUMMY_SYNTHETIC)$/.test(m.refresh_token));
export function createSyntheticCustody(){
  const masterKey=randomBytes(32), records=new Map(), bindingRefs=new Map();
  const store=(b,material)=>{const k=key(b);if(bindingRefs.has(k)||!validMaterial(material,b))throw fail();const reference=randomUUID();records.set(reference,{bindingKey:k,envelope:encrypt(b,material)});bindingRefs.set(k,reference);return reference;};
  const encrypt=(context,material)=>{const nonce=randomBytes(12);const cipher=createCipheriv('aes-256-gcm',masterKey,nonce);cipher.setAAD(encode(context));const ciphertext=Buffer.concat([cipher.update(encode(material)),cipher.final()]);return {nonce,ciphertext,tag:cipher.getAuthTag()};};
  const decrypt=(context,envelope)=>{try{const cipher=createDecipheriv('aes-256-gcm',masterKey,envelope.nonce);cipher.setAAD(encode(context));cipher.setAuthTag(envelope.tag);return JSON.parse(Buffer.concat([cipher.update(envelope.ciphertext),cipher.final()]).toString());}catch{throw fail();}};
  return Object.freeze({
    // A reference is opaque to users and must match the exact immutable binding.
    provision(binding, material){return store(checkedBinding(binding),material);},
    async read(binding,reference){const b=checkedBinding(binding),k=key(b),r=records.get(reference);if(!r||r.bindingKey!==k||bindingRefs.get(k)!==reference)throw fail();const result=decrypt(b,r.envelope);if(!validMaterial(result,b))throw fail();return result;},
    async seal(binding,material){return store(checkedBinding(binding),material);},
    // Test-only tampering hook, never part of a hosted credential adapter.
    tamperForTest(binding){const reference=bindingRefs.get(key(binding)),r=records.get(reference);if(!r)throw fail();records.set(reference,{...r,envelope:{...r.envelope,tag:Buffer.alloc(r.envelope.tag.length)}});},
    count(){return records.size;}
  });
}
export function createSyntheticCoordinator({custody,binding,reference}){
  let current=checkedBinding(binding),ref=reference,status='active',lease=null,sequence=0,terminalLeaseId=null;
  const same=b=>key(b)===key(current);
  const requireActive=b=>{if(!same(b)||status!=='active')throw fail('stale');};
  return Object.freeze({
    async current(b){requireActive(b);return {reference:ref};},
    async claim(b){requireActive(b);if(lease)throw fail('lease_held');lease={id:++sequence,dispatched:false};return {...lease};},
    async dispatch(b,l,effect){requireActive(b);if(!lease||lease.id!==l.id||lease.dispatched)throw fail('lease_denied');lease.dispatched=true;try{return await effect();}catch(e){status='recovery_required';throw e;}},
    async complete(b,l,sealed){requireActive(b);if(!lease||lease.id!==l.id||!lease.dispatched||typeof sealed!=='string')throw fail();const next=checkedBinding({...current,credential_version:current.credential_version+1});if(sealed===ref)throw fail();await custody.read(next,sealed);current=next;ref=sealed;lease=null;return current;},
    async fail(b,l,state){if(!same(b))throw fail('stale');if(!lease){if(status==='reauthorisation_required'&&state==='recovery_required'&&l?.id===terminalLeaseId)return;throw fail('stale');}if(lease.id!==l.id)throw fail('stale');if(state==='reauthorisation_required'){if(!lease.dispatched)throw fail();status='reauthorisation_required';terminalLeaseId=lease.id;lease=null;return;}if(lease.dispatched){status='recovery_required';lease=null;return;}if(state!=='idle')throw fail();status='active';lease=null;},
    disconnect(){status='disabled';lease=null;},
    status(){return {status,binding:current,hasLease:Boolean(lease)};}
  });
}
