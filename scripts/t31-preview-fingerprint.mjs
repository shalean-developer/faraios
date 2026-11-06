import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {hostedSourceFingerprint} from './hosted-source-fingerprint.mjs';
export async function previewSourceFingerprint(){
 const hash=createHash('sha256').update(await hostedSourceFingerprint());
 for(const path of ['_t31_preview.cjs','hosted-t31-preview.mjs','scripts/t31-preview-fingerprint.mjs'])
  hash.update(path+'\0').update(await readFile(new URL('../'+path,import.meta.url))).update('\0');
 return hash.digest('hex');
}
