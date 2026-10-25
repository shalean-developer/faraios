// T19 SEC-02 inactive synthetic-only custody service.
// No network, process environment access, routes, real grants or persistence.
import {credentialBinding, bindingKey} from './t19-c1.js';
const denied = () => Object.assign(new Error('custody_denied'), {code:'custody_denied'});
const unknown = () => Object.assign(new Error('reconciliation_required'), {code:'reconciliation_required'});
const equal = (a,b) => bindingKey(a) === bindingKey(b);
export function createSyntheticRestrictedCustody({sealIdentity, publishIdentity, verifierIdentity}) {
  if (![sealIdentity,publishIdentity,verifierIdentity].every(x => typeof x === 'string' && x.length >= 12)
    || new Set([sealIdentity,publishIdentity,verifierIdentity]).size !== 3) throw denied();
  const prepared = new Map(), active = new Map(), operations = new Map(), audit = [];
  const authenticate = (supplied, expected) => { if (supplied !== expected) throw denied(); };
  const key = b => bindingKey(credentialBinding(b));
  function begin({identity,binding,operation,lease}) {
    authenticate(identity,publishIdentity);
    const b=credentialBinding(binding), k=key(b);
    if (!operation || !lease || operations.has(operation)) throw denied();
    if ([...operations.values()].some(x=>x.k===k && ['dispatched','uncertain'].includes(x.state))) throw unknown();
    operations.set(operation,{k,lease,state:'dispatched'});
    audit.push({event:'dispatch_intent',operation,k});
  }
  function verifyResult({identity,binding,operation,lease,result}) {
    authenticate(identity,verifierIdentity);
    const k=key(binding), op=operations.get(operation);
    if(!op || op.k!==k || op.lease!==lease || op.state!=='dispatched') throw denied();
    if (!result || !['success','invalid_grant','uncertain'].includes(result.kind)) throw denied();
    if(result.kind==='success' && (!result.receipt || result.receipt.operation!==operation || result.receipt.binding!==k || result.receipt.lease!==lease)) throw denied();
    op.state=result.kind==='success'?'verified':result.kind==='invalid_grant'?'reauthorisation_required':'uncertain';
    audit.push({event:'provider_result',operation,outcome:result.kind});
  }
  function prepare({identity,binding,operation,lease,reference}) {
    authenticate(identity,sealIdentity);
    const b=credentialBinding(binding), k=key(b), op=operations.get(operation);
    if(!op || op.state!=='verified' || op.k!==k || op.lease!==lease || typeof reference!=='string' || !reference) throw denied();
    if ([...prepared.values()].some(x=>x.reference===reference)) throw denied();
    prepared.set(operation,{k,lease,reference,consumed:false});
    audit.push({event:'synthetic_seal',operation,k});
  }
  function publish({identity,binding,operation,lease,reference}) {
    authenticate(identity,publishIdentity);
    const k=key(binding), op=operations.get(operation), p=prepared.get(operation);
    if(!op || op.state!=='verified' || !p || p.consumed || p.k!==k || op.k!==k ||
      p.lease!==lease || op.lease!==lease || p.reference!==reference) throw denied();
    if(active.has(k)) throw denied();
    // In-memory atomic transition for synthetic orchestration only; NOT durable or production-safe.
    active.set(k,reference); p.consumed=true; op.state='published';
    audit.push({event:'published',operation,k});
  }
  function interrupt({identity,operation}) {
    authenticate(identity,publishIdentity);
    const op=operations.get(operation);
    if(!op) throw denied();
    if(op.state==='dispatched') {op.state='uncertain'; audit.push({event:'uncertain_hold',operation});}
  }
  return Object.freeze({
    begin,verifyResult,prepare,publish,interrupt,
    status: ({identity,operation}) => {authenticate(identity,publishIdentity);return operations.get(operation)?.state ?? null;},
    reference: ({identity,binding}) => {authenticate(identity,publishIdentity);return active.get(key(binding)) ?? null;},
    audit: ({identity}) => {authenticate(identity,publishIdentity);return audit.map(x=>({...x}));}
  });
}
