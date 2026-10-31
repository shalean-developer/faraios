// Only the disposable native test runner launches this child. No application config.
import {Client} from 'pg';
import {createStandardHttpsStore} from '../src/t19-standard-https-store.js';
import {createStandardInvoiceJobs,createStandardInvoiceWorker} from '../src/t19-standard-worker.js';
import {createStandardConnection} from '../src/t19-standard-connection.js';
import {standardConfig,createTokenCipher} from '../src/t19-standard-secrets.js';
import {createStandardItemMappings} from '../src/t19-standard-items.js';
const target=new URL(process.env.T19_CUSTODY_NATIVE_URL);
if(target.hostname!=='127.0.0.1'||target.pathname!=='/postgres'||target.username!=='postgres'||target.password||target.search||!process.send)throw Error('disposable_only');
const id=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0'),business=id(10);
const db=new Client({connectionString:target.href,ssl:false});await db.connect();
await db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:id(9000),session_id:id(9001),role:'authenticated'})]);
const rpc=async(name,args)=>{
 if(!['t19_standard_store','t19_standard_jobs'].includes(name))throw Error('unexpected_rpc');
 await db.query('set role authenticated');try{return {data:(await db.query(`select public.${name}($1,$2::jsonb) value`,[args.action,JSON.stringify(args.input)])).rows[0].value,error:null};}finally{await db.query('reset role');}
};
const config=standardConfig({FARAIOS_ENVIRONMENT:'staging',FARAIOS_ORIGIN:'https://staging.example.test',ZOHO_API_DOMAIN:'https://www.zohoapis.com',ZOHO_CLIENT_ID:'synthetic-client',ZOHO_CLIENT_SECRET:'synthetic-secret',ZOHO_TOKEN_ENCRYPTION_KEY:'ab'.repeat(32),ZOHO_TOKEN_KEY_ID:'test'});
const store=createStandardHttpsStore({rpc}),jobs=createStandardInvoiceJobs({rpc,scope:store.leaseScope});
const connection=createStandardConnection({config,store,cipher:createTokenCipher(config),provider:{},sessions:{read:async()=>null}});
let sequence=0;
const fetchImpl=async(url,options)=>{
 const seq=++sequence;
 const response=new Promise(resolve=>{const handler=message=>{if(message.seq===seq){process.off('message',handler);resolve(Response.json(message.body));}};process.on('message',handler);});
 process.send({seq,url,options});return response;
};
const mappings={version:1,environment:'staging',connections:[{businessId:business,connectionId:id(9100),generation:1,organizationId:'111',apiDomain:config.apiDomain,items:[{catalogueId:id(112),itemId:'555'}]}]};
const result=await createStandardInvoiceWorker({connection,jobs,fetchImpl,resolveItems:createStandardItemMappings(mappings)}).runOnce(business);
process.send({unexpectedResult:result});await db.end();process.disconnect();
