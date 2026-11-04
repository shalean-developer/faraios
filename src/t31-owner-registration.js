// T31 owner registration. No privileged user creation and no automatic tenant membership.
// Activation requires verified Auth email-confirmation safeguards and separate owner approval.
const INVALID=/[\u0000-\u001f\u007f]/;
export function parseOwnerRegistration(input={}) {
 const email=input.email,password=input.password;
 if(typeof email!=='string'||email!==email.trim()||email.length>254||email.length<3||INVALID.test(email)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error('Check email address');
 if(typeof password!=='string'||password.length<12||password.length>1024||INVALID.test(password))throw new Error('Choose a password of at least 12 characters');
 return {email,password};
}
/** The caller must explicitly enable this only after Auth email safeguarding is verified.
 * A session returned by signup means email confirmation may have been disabled: fail closed.
 * Never report whether a particular email already has an account.
 */
export async function registerOwner(createClient,input,{enabled=false}={}) {
 if(!enabled)throw new Error('Registration is not yet available');
 const {email,password}=parseOwnerRegistration(input);
 const client=createClient();
 if(typeof client?.auth?.signUp!=='function')throw new Error('Registration temporarily unavailable');
 let result;
 try{result=await client.auth.signUp({email,password});}
 catch{throw new Error('Registration temporarily unavailable');}
 if(result?.data?.session){
   // An unexpectedly active session must not be used to provision a business.
   try{await client.auth.signOut({scope:'local'});}catch{}
   throw new Error('Registration requires email confirmation before sign-in');
 }
 // Provider errors are deliberately generic to avoid account enumeration.
 if(result?.error)throw new Error('Registration temporarily unavailable');
 return {message:'If registration is available for this address, check your email for a confirmation link. Then sign in to create your business.'};
}
