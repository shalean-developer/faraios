// Node HTTP adapter for the portable return receiver. No listeners or key reads.
import {Readable} from 'node:stream';
import {createCallbackReturn} from './t19-callback-relay.js';
import {consumeCallback} from './t19-callback-envelope.js';
export async function accountingCallbackReturn({req,res,origin,privateKey,sid,oauth}){
 const receive=createCallbackReturn({origin,privateKey,oauth,consume:consumeCallback,readSession:async()=>sid});
 const headers={};
 for(const name of ['origin','content-type'])if(typeof req.headers[name]==='string')headers[name]=req.headers[name];
 const request=new Request(new URL(req.url,origin),{method:req.method,headers,
  ...(req.method==='POST'?{body:Readable.toWeb(req),duplex:'half'}:{})});
 const response=await receive(request);
 res.writeHead(response.status,Object.fromEntries(response.headers));
 res.end(Buffer.from(await response.arrayBuffer()));
}
