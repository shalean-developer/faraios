// T27 read-only report adapter. The database RPC independently verifies the live Auth session and membership.
export async function readOperationalReport(client,businessId,from,through){
 if(!/^[0-9a-f-]{36}$/i.test(businessId??'')||!/^\d{4}-\d{2}-\d{2}$/.test(from??'')||!/^\d{4}-\d{2}-\d{2}$/.test(through??''))throw new Error('Invalid report scope');
 const {data,error}=await client.rpc('t27_operational_report',{p_business:businessId,p_from:from,p_through:through});
 if(error){
  // Error code only: never log message, detail, hint, identity, arguments or credentials.
  const code=typeof error.code==='string'&&/^[A-Z0-9]{5}$/.test(error.code)?error.code:'UNKNOWN';
  console.error('T27_REPORT_RPC_CODE='+code);
  throw Object.assign(new Error('Report unavailable. Check access and current source state.'),{status:code==='42501'?403:422});
 }
 if(!data||data.businessId!==businessId||data.from!==from||data.through!==through)throw new Error('Report scope mismatch');
 return data;
}
