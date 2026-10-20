import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from './src/staging-server.js';

export const restoreConfig=JSON.parse(await readFile(new URL('./config/restore-test.json',import.meta.url),'utf8'));
const restoreOrigin='https://zrlojsvkqipuwkkyfrkn.supabase.co';
const readRPCs=new Set(['staff_context','booking_context','calendar_window','staff_availability','invoice_totals','quote_acceptance_actor']);
export function restoreFetch(fetchImpl=fetch){
 return async(input,init={})=>{
  const url=new URL(typeof input==='string'||input instanceof URL?input:input.url);
  const method=(init.method??(input instanceof Request?input.method:'GET')).toUpperCase();
  const auth=url.pathname==='/auth/v1/user'&&method==='GET'||url.pathname==='/auth/v1/token'&&method==='POST'&&url.search==='?grant_type=password'||url.pathname==='/auth/v1/logout'&&method==='POST'&&url.search==='?scope=local';
  const rpc=/^\/rest\/v1\/rpc\/([a-z_]+)$/.exec(url.pathname);
  const read=rpc?readRPCs.has(rpc[1])&&['GET','HEAD','POST'].includes(method):/^\/rest\/v1\/[a-z_]+$/.test(url.pathname)&&['GET','HEAD'].includes(method);
  if(url.origin!==restoreOrigin||url.username||url.password||!auth&&!read)throw new Error('RESTORE_REQUEST_BLOCKED');
  // Never follow a redirect to another project or integration provider.
  return fetchImpl(input,{...init,redirect:'error'});
 };
}
export function createRestoreServer({fetchImpl=fetch}={}){
 const c=restoreConfig;
 if(c.environment!=='restore-test'||c.projectRef!=='zrlojsvkqipuwkkyfrkn'||c.url!==restoreOrigin||!/^sb_publishable_[A-Za-z0-9_-]+$/.test(c.publishableKey))throw new Error('Invalid restore test configuration');
 const factory=()=>createClient(c.url,c.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false},global:{fetch:restoreFetch(fetchImpl)}});
 return createStagingServer({createClient:factory,restoreTest:true});
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 if(process.argv.length!==2)throw new Error('Restore launcher takes no overrides');
 createRestoreServer().listen(3103,'127.0.0.1',()=>console.log('FaraiOS RESTORE TEST: http://127.0.0.1:3103/login (read-only; integrations disabled)'));
}
