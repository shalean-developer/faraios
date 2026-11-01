import {PGlite} from '@electric-sql/pglite';import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {fixture,customer,other,owner} from './t26-fixture.js';
import {createStagingServer} from '../src/staging-server.js';
export async function httpFixture(){
 const db=new PGlite({extensions:{btree_gist}}),f=await fixture(db);
 // This adapter is confined to the disposable DB. Production uses verified Auth
 // through its existing publishable-key client and the actual DB session guard.
 let tail=Promise.resolve();const queue=fn=>{const p=tail.then(fn,fn);tail=p.catch(()=>{});return p;};
 const createClient=()=>{let uid=null;return {auth:{signInWithPassword:async({email})=>{uid=email.startsWith('owner')?owner:email.startsWith('other')?other:customer;return {data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}};},getUser:async()=>({data:{user:uid?{id:uid}:null}})},from(table){const filters={};let start=0,end=499;const q={select(){return q;},eq(k,v){filters[k]=v;return q;},order(){return q;},range(a,b){start=a;end=b;return q;},then(resolve,reject){queue(()=>f.as(uid,async()=>({data:(await db.query(table==='business_catalogue'?"select * from public.business_catalogue where business_id=$1 order by name,id limit $2 offset $3":table==='business_memberships'?"select business_id,user_id,role,status from public.business_memberships where user_id=auth.uid() and status='active'":"select id,name from public.businesses where status='active'",table==='business_catalogue'?[filters.business_id,end-start+1,start]:[])).rows}))).then(resolve,reject);}};return q;},rpc:async(name,args)=>queue(async()=>{try{return {data:await f.call(args.action,args.payload,args.business,uid)};}catch(error){return {error:{code:error.code,message:error.message}};}})};};
 const server=createStagingServer({createClient});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {db,f,server,createClient,base:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(r=>server.close(r));await db.close();}};
}
