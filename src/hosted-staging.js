// Hosted staging has no production switch and no provider adapters.
export const stagingOrigin='https://staging.faraios.com';
export const stagingDatabase='https://xdmfyrsauvqznkloroxg.supabase.co';
export const stagingProject='xdmfyrsauvqznkloroxg';
const stagingPublishableKey='sb_publishable_DKtFa_piIBi4MppsyoyuUg_KuoqzlOU';
const tables=new Map([
  ...['business_memberships','businesses','business_accounting_connections','business_invoices','business_quotes','quote_invoice_handoffs','recurring_schedules','supervisor_allowance_changes','business_vat_settings'].map(t=>[t,['GET','HEAD']]),
  ...['business_settings','business_catalogue','business_customers','customer_addresses','business_earnings_rules','one_off_bookings','staff_profiles','staff_teams'].map(t=>[t,['GET','HEAD','POST','PATCH',...(t==='business_catalogue'?['DELETE']:[])]]),
]);
const rpcs=new Set(['booking_context','calendar_window','staff_availability','staff_context','quote_acceptance_actor','create_quote','change_quote','convert_quote','create_recurring','change_recurring','generate_recurring','invoice_totals','prepare_invoice','configure_business_vat','configure_supervisor_allowance','supervisor_allowance_context']);

export function assertHostedEnvironment(env=process.env){
  // Refuse credentials rather than silently loading a production/provider connection.
  const forbidden=/(SECRET|TOKEN|API_KEY|PASSWORD|CREDENTIAL|SUPABASE|DATABASE_URL|SERVICE_ROLE|PAYSTACK|STRIPE|PAYPAL|PAYFAST|YOCO|PEACH|ADYEN|BRAINTREE|SMTP|EMAIL|SMS|NOTIFICATION|SENDGRID|MAILGUN|RESEND|POSTMARK|BREVO|INFOBIP|CLICKATELL|TWILIO|WHATSAPP|VONAGE|ONESIGNAL|FIREBASE|FCM_|AWS_|ZOHO|ACCOUNTING|FARAIOS_)/i;
  if(Object.entries(env).some(([name,value])=>value&&forbidden.test(name)))throw new Error('Hosted staging refuses provider or database environment credentials');
}

export function assertStagingConfig(config){
  if(config?.environment!=='staging'||config.projectRef!==stagingProject||config.url!==stagingDatabase||config.publishableKey!==stagingPublishableKey)throw new Error('Invalid hosted staging configuration');
}

/** Only this SDK dispatch is constrained; this is not an OS network sandbox. */
export function createStagingFetch(dispatch=globalThis.fetch){
  return async(input,init={})=>{
    let request,url;
    try{request=new Request(input,init);url=new URL(request.url);}catch{throw new Error('Hosted staging outbound request blocked');}
    const method=request.method;
    let allowed=false;
    if(url.origin===stagingDatabase&&!url.username&&!url.password&&!url.hash){
      if(url.pathname==='/auth/v1/token')allowed=method==='POST'&&url.search==='?grant_type=password';
      if(url.pathname==='/auth/v1/user')allowed=method==='GET'&&!url.search;
      if(url.pathname==='/auth/v1/logout')allowed=method==='POST'&&url.search==='?scope=local';
      const table=url.pathname.match(/^\/rest\/v1\/([a-z_]+)$/)?.[1];
      if(table)allowed=tables.get(table)?.includes(method)??false;
      const rpc=url.pathname.match(/^\/rest\/v1\/rpc\/([a-z_]+)$/)?.[1];
      if(rpc)allowed=rpcs.has(rpc)&&method==='POST'&&!url.search;
      // No profile/schema override through headers, including service-role schemas.
      if(['accept-profile','content-profile'].some(h=>request.headers.has(h)&&request.headers.get(h)!=='public'))allowed=false;
    }
    if(!allowed)throw new Error('Hosted staging outbound request blocked');
    return dispatch(new Request(request,{redirect:'error'}));
  };
}

export function hostedRequestAllowed(req,transport='passenger',privateListenerReady=false){
  // LiteSpeed uses the reviewed managed Plesk TLS edge, like Shalean. Its
  // pinned private listener must be verified before requests are admitted.
  // This is not per-request TLS attestation: deployment acceptance must prove
  // plain HTTP cannot reach that app. No client proxy/marker header is trusted.
  const transportAllowed=transport==='passenger'?req.headers['!~passenger-proto']==='https':transport==='litespeed'&&privateListenerReady===true;
  return req.headers.host==='staging.faraios.com'&&transportAllowed&&typeof req.url==='string'&&req.url.startsWith('/')&&!req.url.startsWith('//');
}
