import {readFile} from 'node:fs/promises';
import {createClient} from '@supabase/supabase-js';
import {createStagingServer} from './src/staging-server.js';
const config=JSON.parse(await readFile(new URL('./config/staging.json',import.meta.url),'utf8'));
if(config.environment!=='staging'||config.projectRef!=='xdmfyrsauvqznkloroxg'||config.url!=='https://xdmfyrsauvqznkloroxg.supabase.co'||!config.publishableKey.startsWith('sb_publishable_'))throw new Error('Invalid staging configuration');
const factory=()=>createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}});
createStagingServer({createClient:factory}).listen(3101,'127.0.0.1',()=>console.log('FaraiOS staging login: http://127.0.0.1:3101/login'));
