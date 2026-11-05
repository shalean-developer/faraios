// T30 backup maintenance-readiness evidence only. No network, filesystem,
// credentials, process control or database operations. This cannot authorise
// a real write-freeze or invoke the backup helper.
const fail=code=>{throw Object.assign(new Error(code),{code});};
const controls=Object.freeze([
 't19_plesk_scheduler','staging_node_web','test_payment_webhooks',
 'direct_supabase_rest_rpc','supabase_auth','backend_and_manual_sql',
 'external_and_unidentified_writers'
]);
const exact=(value,keys)=>value&&typeof value==='object'&&!Array.isArray(value)&&
 JSON.stringify(Object.keys(value).sort())===JSON.stringify([...keys].sort());

export function assessV3QuietWindowEvidence({scope,evidence}={}){
 if(scope!=='faraios-staging-v3'||!exact(evidence,[
  'baselineCaptured','independentOperator','controls','inflightDrained',
  'pendingFinancialEventsPreserved','sourceCatalogStable','profileFingerprintStable',
  'observedNoWrites','reversalPrepared','externalEffectsReconciled'
 ]))fail('T30_QUIET_WINDOW_EVIDENCE_INVALID');
 if(!exact(evidence.controls,controls))fail('T30_QUIET_WINDOW_WRITERS_UNACCOUNTED');
 for(const key of controls){
  const entry=evidence.controls[key];
  if(!exact(entry,['identified','reversiblePauseReviewed','pauseActive','independentlyVerified'])||
     Object.values(entry).some(value=>typeof value!=='boolean'))
   fail('T30_QUIET_WINDOW_CONTROL_INVALID');
 }
 for(const key of [
  'baselineCaptured','independentOperator','inflightDrained','pendingFinancialEventsPreserved',
  'sourceCatalogStable','profileFingerprintStable','observedNoWrites',
  'reversalPrepared','externalEffectsReconciled'
 ])if(typeof evidence[key]!=='boolean')fail('T30_QUIET_WINDOW_EVIDENCE_INVALID');
 const gaps=[];
 for(const key of controls){
  const v=evidence.controls[key];
  if(!v.identified)gaps.push(key+':UNIDENTIFIED');
  if(!v.reversiblePauseReviewed)gaps.push(key+':REVERSAL_UNVERIFIED');
  if(!v.pauseActive||!v.independentlyVerified)gaps.push(key+':NOT_QUIET');
 }
 for(const key of [
  'baselineCaptured','independentOperator','inflightDrained','pendingFinancialEventsPreserved',
  'sourceCatalogStable','profileFingerprintStable','observedNoWrites',
  'reversalPrepared','externalEffectsReconciled'
 ])if(!evidence[key])gaps.push(key);
 // Evidence supplied to a pure function is NEVER independent proof of an
 // operational freeze. No status here can authorize a live backup.
 return Object.freeze({assessment:gaps.length?'HOLD':'UNVERIFIED_CLAIMS_COMPLETE',
  gaps:Object.freeze(gaps),observedByThisTool:false,
  actualFreezeVerified:false,backupAuthorised:false,
  backup:'NOT_RUN',servicesChanged:false});
}
