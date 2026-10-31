// INACTIVE unless the separate protected staging worker file explicitly enables it.
// Never imported by the web application. No command-line credentials or invoice payloads.
import {loadStandardTaxConfiguration,loadStandardWorkerConfiguration,loadStandardItemConfiguration,loadStandardHttpsConfiguration,createStandardWorkerRuntime} from '../src/t19-standard-runtime.js';
try{
 if(process.argv.length!==3||process.argv[2]!=='--run-once')throw Error();
 const w=await loadStandardWorkerConfiguration();
 if(!w||Object.keys(w).sort().join()!=='businessIds,enabled,environment,version'||w.version!==1||w.environment!=='staging'||w.enabled!==true||!Array.isArray(w.businessIds)||w.businessIds.length<1||w.businessIds.length>20||w.businessIds.some(b=>typeof b!=='string'||!/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(b))||new Set(w.businessIds).size!==w.businessIds.length)throw Error();
 const worker=await createStandardWorkerRuntime(await loadStandardHttpsConfiguration(),{itemMappings:await loadStandardItemConfiguration(),taxMappings:await loadStandardTaxConfiguration()});
 let needsAttention=false;
 for(const businessId of w.businessIds){const result=await worker.runOnce(businessId);console.log(JSON.stringify({businessId,...result}));if(['unavailable','review_required'].includes(result.status))needsAttention=true;}
 if(needsAttention)console.error('T19_INVOICE_WORKER_REVIEW_REQUIRED');
 process.exit(needsAttention?1:0);
}catch{console.log('T19_INVOICE_WORKER_DISABLED_OR_UNAVAILABLE');process.exit(1);}
