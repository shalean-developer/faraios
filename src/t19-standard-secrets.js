// Server-only, explicit configuration: importing this file reads no environment.
import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
import {zohoDomains} from './zoho-books.js';
const deny=()=>new Error('accounting_configuration_rejected');
export function standardConfig(env){
 const environment=env.FARAIOS_ENVIRONMENT;
 if(!['staging','production'].includes(environment))throw deny();
 const origin=new URL(env.FARAIOS_ORIGIN);
 if(origin.protocol!=='https:'||origin.username||origin.password||origin.pathname!=='/'||origin.search||origin.hash)throw deny();
 const key=env.ZOHO_TOKEN_ENCRYPTION_KEY;
 if(!/^[0-9a-f]{64}$/i.test(key??'')||!/^[a-zA-Z0-9_-]{1,40}$/.test(env.ZOHO_TOKEN_KEY_ID??'')||!env.ZOHO_CLIENT_ID||!env.ZOHO_CLIENT_SECRET)throw deny();
 const apiDomain=env.ZOHO_API_DOMAIN;
 if(!Object.hasOwn(zohoDomains,apiDomain))throw deny();
 return Object.freeze({environment,origin:origin.origin,redirectUri:origin.origin+'/accounting/zoho/callback',apiDomain,accountsDomain:zohoDomains[apiDomain],clientId:env.ZOHO_CLIENT_ID,clientSecret:env.ZOHO_CLIENT_SECRET,keyId:env.ZOHO_TOKEN_KEY_ID,key:Buffer.from(key,'hex')});
}
export function tokenBinding(c){
 if(!['staging','production'].includes(c.environment)||!c.businessId||!c.connectionId||!Number.isSafeInteger(c.generation)||c.generation<1||!/^\d{1,30}$/.test(c.organizationId)||!Object.hasOwn(zohoDomains,c.apiDomain)||!c.clientId)throw deny();
 return JSON.stringify([1,c.environment,c.businessId,c.connectionId,c.generation,c.organizationId,c.apiDomain,c.clientId]);
}
export function createTokenCipher({key,keyId}){
 if(!Buffer.isBuffer(key)||key.length!==32||!keyId)throw deny();
 return Object.freeze({
  seal(binding,material){
   const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);
   cipher.setAAD(Buffer.from(tokenBinding(binding)));
   const body=Buffer.concat([cipher.update(JSON.stringify(material),'utf8'),cipher.final()]);
   return {version:1,keyId,iv:iv.toString('base64'),body:body.toString('base64'),tag:cipher.getAuthTag().toString('base64')};
  },
  open(binding,envelope){
   try{
    if(envelope?.version!==1||envelope.keyId!==keyId)throw deny();
    const d=createDecipheriv('aes-256-gcm',key,Buffer.from(envelope.iv,'base64'));
    d.setAAD(Buffer.from(tokenBinding(binding)));d.setAuthTag(Buffer.from(envelope.tag,'base64'));
    return JSON.parse(Buffer.concat([d.update(Buffer.from(envelope.body,'base64')),d.final()]).toString('utf8'));
   }catch{throw new Error('accounting_credentials_unavailable');}
  }
 });
}
