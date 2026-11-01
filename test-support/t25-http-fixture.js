import {PGlite} from '@electric-sql/pglite';import {btree_gist} from '@electric-sql/pglite/contrib/btree_gist';
import {fixture,customer,other} from './t25-fixture.js';
import {createStagingServer} from '../src/staging-server.js';
export async function httpFixture(){
 const db=new PGlite({extensions:{btree_gist}}),f=await fixture(db);
 // This adapter is confined to the disposable DB. Production uses verified Auth
 // through its existing publishable-key client and the actual DB session guard.
 let tail=Promise.resolve();const queue=fn=>{const p=tail.then(fn,fn);tail=p.catch(()=>{});return p;};
 const createClient=()=>{let uid=null;return {auth:{signInWithPassword:async({email})=>{uid=email.startsWith('other')?other:customer;return {data:{session:{expires_at:Math.floor(Date.now()/1000)+3600}}};},getUser:async()=>({data:{user:uid?{id:uid}:null}})},from(table){const q={select(){return q;},eq(){return q;},then(resolve){resolve({data:[]});}};return q;},rpc:async(name,args)=>queue(async()=>{try{return {data:await f.call(args.action,args.payload,uid,args.route)};}catch(error){return {error:{code:error.code,message:error.message}};}})};};
 const server=createStagingServer({createClient});await new Promise(r=>server.listen(0,'127.0.0.1',r));
 return {db,f,server,createClient,base:'http://127.0.0.1:'+server.address().port,close:async()=>{await new Promise(r=>server.close(r));await db.close();}};
}
