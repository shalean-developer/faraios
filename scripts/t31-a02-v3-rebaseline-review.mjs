// T31-A02: Offline-only, source-reviewed V3 rebaseline proposal.
// Produces no files, performs no reads, does not run a backup, and cannot activate a profile.
import {validateScope} from './backup-scope.mjs';
import {SOURCE} from './backup-staging.mjs';

export const ORIGINAL_T30_FINGERPRINTS=Object.freeze({
 catalog:'6ab220df693da9748332e5eaa874231ed6fc6c21df293d91873219cf84d0ba14',
 application:'2fc21b9e8cbee3e0b97b978ad774d7cd1aac9dae475947ff2ac3a5575b768797',
 managed:'b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23'
});
// Repeatedly sampled from the pinned, unmodified SQL projections.
// These hashes alone are NOT independent sign-off of a historical schema change.
export const CURRENT_REVIEWED_FINGERPRINTS=Object.freeze({
 catalog:'c3a84e04e1c1708adbeb57d51318ce3c5abf794f917f552b5c6a6b062a2b0198',
 application:'70d9924639df9dddb4b126609e297079b999d850e9d2461c5fa4c236df3fec09',
 managed:'b190886ca97fdc83673380fef8b846a9f372ace520fa49df1c8cd6dfd6366f23'
});
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sorted=a=>[...a].sort();
const validId=s=>typeof s==='string'&&/^[a-z][a-z0-9-]{0,63}$/.test(s);

/** A proposed replacement object, not a change to ~/.faraios-backup-profile/current.json.
 * Independent reviewer must still confirm functions/grants, preserved data and backup rollback
 * before an operator writes an owner-only candidate to disk under a separate approval.
 */
export function proposeT31A02V3Rebaseline(original,{fingerprints,reviewedSourceSha}={}){
 const old=validateScope(original,SOURCE);
 if(old.version!==3||!validId(old.id)||old.tables.length!==30||old.privateTables.length!==35||
 !['catalog','application','managed'].every(k=>old[k]===ORIGINAL_T30_FINGERPRINTS[k]))
  throw Error('T31_A02_ORIGINAL_PROFILE_MISMATCH');
 if(!fingerprints||!eq(fingerprints,CURRENT_REVIEWED_FINGERPRINTS)||
 original.source!==SOURCE||
 typeof reviewedSourceSha!=='string'||!/^[a-f0-9]{40}$/.test(reviewedSourceSha))
  throw Error('T31_A02_CURRENT_EVIDENCE_REQUIRED');
 if(!eq(sorted(old.tables),old.tables)||!eq(sorted(old.privateTables),old.privateTables))
  throw Error('T31_A02_SCOPE_UNSORTED');
 const id='t31-a02-v3-rebaseline-review-20261105';
 if(id===old.id)throw Error('T31_A02_REBASE_ID_COLLISION');
 const candidate=validateScope({
  version:3,source:SOURCE,id,
  tables:[...old.tables],privateTables:[...old.privateTables],
  catalog:fingerprints.catalog,application:fingerprints.application,managed:fingerprints.managed
 },SOURCE);
 return Object.freeze({
  candidate,
  activation:'DISABLED',
  classification:'UNEXPLAINED_HISTORICAL_DRIFT',
  approval:'NOT_GRANTED',
  reviewedSourceSha,
  originalPreserved:true,
  instructions:'Do not activate or copy over current.json without independent security certification and explicit owner approval.'
 });
}
