import {randomUUID} from 'node:crypto';
import {canAccess} from './access.js';
import {resolveIdentity} from './identity.js';

/** Short-lived local staging sessions; credentials/tokens never reach browser storage.
 * No refresh yet: re-authenticate after token expiry or 30 minutes, whichever is first.
 */
export function createAuthSessions({createClient,now=()=>Date.now()}) {
  const sessions=new Map();
  const prune=()=>{for(const [id,s] of sessions)if(s.expires<=now())sessions.delete(id);};
  return {
    async login(email,password){
      prune();if(sessions.size>=100)throw new Error('Sign-in unavailable');
      if(typeof email!=='string'||!email.includes('@')||email.length>254||typeof password!=='string'||password.length<1||password.length>1024)throw new Error('Unable to sign in');
      const client=createClient();
      const {data,error}=await client.auth.signInWithPassword({email,password});
      if(error||!data?.session||!Number.isFinite(data.session.expires_at))throw new Error('Unable to sign in');
      // Verify against Auth server and database; do not authorise from session user metadata.
      const identity=await resolveIdentity(client);
      const expires=Math.min(now()+1800000,data.session.expires_at*1000);
      if(expires<=now())throw new Error('Unable to sign in');
      const id=randomUUID();sessions.set(id,{client,expires});return {id,identity};
    },
    async read(id){
      prune();const session=sessions.get(id);if(!session)return null;
      try{
        const identity=await resolveIdentity(session.client);
        const {data,error}=await session.client.from('businesses').select('id,name').eq('status','active');
        if(error||!Array.isArray(data))throw new Error('Business lookup unavailable');
        const businesses=data.filter(b=>identity.businessIds.includes(b.id)&&typeof b.name==='string');
        const ids=new Set(businesses.map(b=>b.id));
        return {...identity,businesses,businessIds:identity.businessIds.filter(id=>ids.has(id)),memberships:identity.memberships.filter(m=>ids.has(m.businessId))};
      }catch{sessions.delete(id);return null;}
    },
    async withCustomerSession(id,action){
      prune();const session=sessions.get(id);if(!session)return null;
      const {data,error}=await session.client.auth.getUser();
      if(error||!data?.user?.id){sessions.delete(id);return null;}
      return action(session.client,data.user.id);
    },
    async withCleanerPortal(id,businessId,action){
      const identity=await this.read(id);
      if(!identity?.memberships.some(m=>m.businessId===businessId&&m.role==='staff'))throw new Error('Cleaner access denied');
      const session=sessions.get(id);if(!session)throw new Error('Cleaner access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId),identity.userId);
    },
    async withAdjustmentReviews(id,businessId,action){
      const identity=await this.read(id),membership=identity?.memberships.find(m=>m.businessId===businessId);
      if(!identity?.businessIds.includes(businessId)||!membership||!['owner','manager','staff'].includes(membership.role))throw new Error('Adjustment access denied');
      const session=sessions.get(id);if(!session)throw new Error('Adjustment access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId),membership.role,identity.userId);
    },
    async withEarningsRules(id,businessId,write,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:write?'business.manage':'finance.read',memberships:identity.memberships}))throw new Error('Earnings access denied');
      const session=sessions.get(id);if(!session)throw new Error('Earnings access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId),identity.memberships.some(m=>m.businessId===businessId&&m.role==='owner'));
    },
    async withCatalogue(id,businessId,write,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:write?'catalogue.manage':'catalogue.read',memberships:identity.memberships}))throw new Error('Catalogue access denied');
      const session=sessions.get(id);if(!session)throw new Error('Catalogue access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId),identity.memberships.some(m=>m.businessId===businessId&&m.role==='owner'));
    },
    async withStaff(id,businessId,write,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:write?'staff.manage':'staff.read',memberships:identity.memberships}))throw new Error('Staff access denied');
      const session=sessions.get(id);if(!session)throw new Error('Staff access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId),identity.memberships.some(m=>m.businessId===businessId&&m.role==='owner'));
    },
    async withInvoices(id,businessId,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:'invoices.manage',memberships:identity.memberships}))throw new Error('Invoice access denied');
      const session=sessions.get(id);if(!session)throw new Error('Invoice access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId),identity.userId,identity.memberships.some(m=>m.businessId===businessId&&m.role==='owner'));
    },
    async withAccountingSession(id,action){
      // Server-only mTLS forwarding. read() verifies Auth and current membership;
      // getSession is used by the proxy solely to transport the access token.
      if(!await this.read(id))throw new Error('Accounting access denied');
      const session=sessions.get(id);if(!session)throw new Error('Accounting access denied');
      return action(session.client);
    },
    async withQuotes(id,businessId,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:'quotes.manage',memberships:identity.memberships}))throw new Error('Quote access denied');
      const session=sessions.get(id);if(!session)throw new Error('Quote access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId));
    },
    async withBookings(id,businessId,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:'bookings.manage',memberships:identity.memberships}))throw new Error('Booking access denied');
      const session=sessions.get(id);if(!session)throw new Error('Booking access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId));
    },
    async withCustomers(id,businessId,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!canAccess({userId:identity.userId,businessId,permission:'customers.manage',memberships:identity.memberships}))throw new Error('Customer access denied');
      const session=sessions.get(id);if(!session)throw new Error('Customer access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId));
    },
    async withOwner(id,businessId,action){
      const identity=await this.read(id);
      if(!identity?.businessIds.includes(businessId)||!identity.memberships.some(m=>m.businessId===businessId&&m.role==='owner'))throw new Error('Settings access denied');
      const session=sessions.get(id);if(!session)throw new Error('Settings access denied');
      return action(session.client,identity.businesses.find(b=>b.id===businessId));
    },
    async logout(id){
      const session=sessions.get(id);sessions.delete(id);
      if(session){const result=await session.client.auth.signOut({scope:'local'});if(result?.error)throw new Error('Remote sign-out failed; local session cleared');}
    }
  };
}

