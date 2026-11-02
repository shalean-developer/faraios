// T27 read-only report adapter. The database RPC independently verifies the live Auth session and membership.
const generic='Report unavailable. Check access and current source state.';
function diagnostic(category,code,metadata){
 // Fixed literals and validated SQLSTATE only. Never log untrusted error properties or request scope.
 console.error('T27_REPORT_FAILURE='+category+(code?' SQLSTATE='+code:'')+(metadata?' HTTP_STATUS='+metadata.status+' CODE_FORMAT='+metadata.format:''));
}
export async function readOperationalReport(client,businessId,from,through){
 if(!/^[0-9a-f-]{36}$/i.test(businessId??'')||!/^\d{4}-\d{2}-\d{2}$/.test(from??'')||!/^\d{4}-\d{2}-\d{2}$/.test(through??''))throw new Error('Invalid report scope');
 let response;
 try{
  response=await client.rpc('t27_operational_report',{p_business:businessId,p_from:from,p_through:through});
 }catch{
  diagnostic('TRANSPORT_EXCEPTION');
  throw Object.assign(new Error(generic),{status:422});
 }
 if(!response||typeof response!=='object'){
  diagnostic('MISSING_RPC_RESPONSE');
  throw Object.assign(new Error(generic),{status:422});
 }
 const {data,error}=response;
 if(error){
  const code=typeof error.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:null;
  // Supabase/PostgREST errors may use non-SQLSTATE codes. Only fixed format labels leave the process.
  const raw=typeof error.code==='string'?error.code:'';
  const format=/^[A-Z0-9]{5}$/.test(raw)?'SQLSTATE':/^PGRST[0-9]{3}$/.test(raw)?'POSTGREST':typeof error.code==='number'?'NUMERIC':raw===''?'ABSENT':raw.length>0?'OTHER':'NONSTRING';
  const numeric=Number.isInteger(response.status)&&response.status>=100&&response.status<=599?response.status:'NA';
  diagnostic(code?'DATABASE_SQLSTATE':'RPC_ERROR_NO_SQLSTATE',code,{status:numeric,format});
  throw Object.assign(new Error(generic),{status:code==='42501'?403:422});
 }
 if(!data||data.businessId!==businessId||data.from!==from||data.through!==through){
  diagnostic('INVALID_RPC_RESPONSE');
  throw Object.assign(new Error(generic),{status:422});
 }
 return data;
}
