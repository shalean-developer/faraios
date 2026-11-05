// T31 proposed post-migration backup inventory ONLY.
// This module is deliberately NOT connected to the live V3 backup/restore clients.
// It cannot authorise a hosted backup, alter an owner-only profile or expand source permissions.
import {PRIVATE_BACKUP_TABLES} from './backup-private-scope.mjs';
import {validateScope} from './backup-scope.mjs';

export const T31_NEW_PUBLIC_TABLES=Object.freeze(['public.t31_business_branding']);
export const T31_NEW_PRIVATE_TABLES=Object.freeze([
 'private_t31.brand_audit',
 'private_t31.invitation_audit',
 'private_t31.invitations',
 'private_t31.t31_provision_requests'
]);
export const T31_NEW_ROLES=Object.freeze(['t31_bootstrap','t31_invite_worker']);
export const T31_BASELINE_BUSINESS_IDS=Object.freeze([
 '0cc3f518-d64e-40c2-8817-bc14d1ef1420',
 '612be091-b1d7-4911-9c3b-143446a9fe27'
]);
const id=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const sorted=a=>[...a].sort();
const eq=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);

// Produce an unactivatable *proposal*. New post-T31 profile cannot be loaded by
// the existing V3 capture code until an independently reviewed implementation ships.
export function proposePostT31Scope(current,source){
 const previous=validateScope(current,source);
 if(previous.version!==3||!eq(previous.privateTables,PRIVATE_BACKUP_TABLES))
  throw Error('T31_CURRENT_V3_REVIEW_REQUIRED');
 const tables=sorted([...previous.tables,...T31_NEW_PUBLIC_TABLES]);
 const privateTables=sorted([...previous.privateTables,...T31_NEW_PRIVATE_TABLES]);
 if(new Set(tables).size!==tables.length||new Set(privateTables).size!==privateTables.length)
  throw Error('T31_TABLE_COLLISION');
 return Object.freeze({
  version:4,source,id:'t31-postmigration-review-only',activation:'DISABLED',
  tables:Object.freeze(tables),privateTables:Object.freeze(privateTables),
  roles:T31_NEW_ROLES,existingBusinessIds:T31_BASELINE_BUSINESS_IDS,
  application:null,managed:null,catalog:null
 });
}
// Strong rejection: requires reviewed post-schema structural fingerprints and
// explicit owner-supplied *exact* business IDs. No arbitrary new-tenant wildcard.
export function validatePostT31Inventory(proposal,manifest,{businessIds,fingerprints}={}){
 if(proposal?.version!==4||proposal.activation!=='DISABLED'||!manifest||
 !Array.isArray(manifest.tables)||!Array.isArray(manifest.business_ids)||
 !Array.isArray(businessIds)||!fingerprints||
 !['application','managed','catalog'].every(k=>sha(fingerprints[k])))
  throw Error('T31_BACKUP_REVIEW_MISSING');
 if(!eq(sorted(businessIds),businessIds)||new Set(businessIds).size!==businessIds.length||
 businessIds.some(v=>!id.test(v))||T31_BASELINE_BUSINESS_IDS.some(v=>!businessIds.includes(v))||
 !eq(manifest.business_ids,businessIds))throw Error('T31_BUSINESS_IDS_CHANGED');
 const expected=sorted([...proposal.tables,...proposal.privateTables]);
 const actual=sorted(manifest.tables.filter(t=>['public','audit','private_t19_custody','private_t19_standard','private_t20','private_t21','private_t22','private_t25','private_t26','private_t31'].includes(t.schema))
 .map(t=>t.schema+'.'+t.table));
 if(!eq(expected,actual)||new Set(actual).size!==actual.length||
 manifest.unexpected_schemas?.length||manifest.database_major!==17)
  throw Error('T31_BACKUP_TABLES_CHANGED');
 if(manifest.tables.filter(t=>expected.includes(t.schema+'.'+t.table))
 .some(t=>t.rls!==true||t.owner!=='postgres'||!Number.isSafeInteger(t.rows)||t.rows<0||!sha(t.sha256)))
  throw Error('T31_BACKUP_RLS_OWNER_MISMATCH');
 if(manifest.catalog_sha256!==fingerprints.catalog||
 manifest.restore_catalog?.application!==fingerprints.application||
 manifest.restore_catalog?.managed!==fingerprints.managed)
  throw Error('T31_BACKUP_FINGERPRINT_CHANGED');
 return Object.freeze({review:'POST_T31_INVENTORY_MATCHED',activation:'DISABLED',tables:expected.length,businesses:businessIds.length});
}
