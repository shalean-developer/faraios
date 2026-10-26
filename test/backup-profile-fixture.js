import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SOURCE,privateDirectory} from '../scripts/backup-staging.mjs';
export const CURRENT_SCOPE=Object.freeze({version:1,source:SOURCE,id:'synthetic-v1',catalog:'1'.repeat(64),application:'2'.repeat(64),managed:'3'.repeat(64),tables:Object.freeze(['audit.fixture_events',...Array.from({length:20},(_,i)=>'public.fixture_'+String(i).padStart(2,'0'))])});
export async function installProfile(home){
 const root=join(home,'.faraios-backup-profile');await privateDirectory(root);
 await writeFile(join(root,'current.json'),JSON.stringify(CURRENT_SCOPE),{flag:'wx',mode:0o600});
}
