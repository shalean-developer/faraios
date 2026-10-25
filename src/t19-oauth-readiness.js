// T19-OAUTH-01: non-operational connection readiness projection.
// Does not import a provider adapter, expose secrets, or initiate OAuth.
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const org=/^[0-9]{1,30}$/;
const apiDomains=new Set(['https://www.zohoapis.com','https://www.zohoapis.eu','https://www.zohoapis.in','https://www.zohoapis.com.au','https://www.zohoapis.jp','https://www.zohoapis.ca','https://www.zohoapis.com.cn','https://www.zohoapis.sa']);
export const OAUTH_READINESS_VERSION='T19-OAUTH-01-SYNTHETIC';
export function prepareZohoConnectionStatus({businessId,environment='staging',ownerVerified=false,connection}){
  if(!uuid.test(String(businessId))||environment!=='staging') return {status:'unavailable',canAuthorize:false,reason:'environment_denied'};
  // ownerVerified comes only from the trusted auth.withInvoices route; not a client field.
  if(ownerVerified!==true) return {status:'owner_required',canAuthorize:false,reason:'owner_required'};
  if(!connection) return {status:'not_configured',canAuthorize:false,reason:'verification_required'};
  if(connection.business_id!==businessId||connection.environment!=='staging'||!org.test(String(connection.organization_id))||!apiDomains.has(connection.api_domain))return {status:'unavailable',canAuthorize:false,reason:'binding_denied'};
  return {status:connection.enabled?'hold_requires_hosted_verification':'configured_disabled',canAuthorize:false,reason:'custody_and_provider_verification_required',businessId,organizationId:connection.organization_id,apiDomain:connection.api_domain};
}
export function renderZohoReadiness(status){
 const h=String(status.status).replace(/[^a-z_]/g,'');
 const labels={
  not_configured:['Not connected','This business does not have a saved Zoho Books configuration.'],
  configured_disabled:['Disconnected','A configuration is saved, but Zoho authorisation and automatic synchronisation are not active.'],
  hold_requires_hosted_verification:['Verification required','A staging configuration is recorded, but secure credentials and Zoho permissions have not been verified.'],
  owner_required:['Owner verification required','Only an authorised business owner can manage this connection.'],
  unavailable:['Connection unavailable','The stored connection cannot be safely verified for this business.']
 };
 const [label,description]=labels[h]??labels.unavailable;
 return `<section class="connection-guidance" aria-label="Zoho connection readiness" data-readiness="${h}"><div class="connection-readiness-head"><div><h3>Zoho Books</h3><p>Connect this business to its own Zoho Books organisation.</p></div><strong class="connection-status" role="status">${label}</strong></div><p class="muted">${description}</p><button type="button" disabled aria-disabled="true" aria-describedby="zoho-readiness-hold">Connect Zoho Books (coming after verification)</button><p id="zoho-readiness-hold" class="muted">This action is unavailable. No authorisation or automatic sync will start. No OAuth, credential storage or invoice synchronisation will start.</p><p class="muted">Once approved, this page will show the verified organisation, sync status and owner-controlled disconnect.</p></section>`;
}
