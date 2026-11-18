import postgres from "npm:postgres@3.4.7";

const project = "jqnecahhaxxdsrybwuoo";
const recipients = new Set(["synthetic-cleaning", "bokkie-book05", "pure-book05"]);
const verifier = "eec10fc9941addc70c1ae4df438371e72d5ffa1ecb59dc1a9cb3412ce95bdd21";
const reviewVerifier = "256d8d60ad2cad385b0cf1d0e3e096eea129b8b0af7ebdeb9517eff0c3d72185";
const maxBody = 16384;
const statements = new Map<string, [string, number]>([
  ["offer", ["select jsonb_build_object('id',service->>'id','areas',areas) as result from instant_private.config($1)",1]],
  ["slots", ["select instant_private.slots($1,$2,$3,$4::text::jsonb,$5::date) as result",5]],
  ["reserve", ["select instant_private.reserve($1::uuid,$2,$3,$4,$5::text::jsonb,$6::timestamptz,$7::int,$8::int,$9::text::jsonb,$10) as result",10]],
  ["receipt", ["select instant_private.receipt($1::uuid) as result",1]],
  ["review", ["select instant_private.review_payments($1,$2::int) as result",2]],
  ["claimRefund", ["select instant_private.claim_refund($1::uuid,$2::bigint) as result",2]],
  ["settleVerified", ["select instant_private.settle_verified($1::uuid,$2::int,$3::bigint) as result",3]],
  ["method", ["select instant_private.select_method($1::uuid,$2,$3) as result",3]],
]);
const reply = (status:number, obj:unknown) => Response.json(obj,{status,headers:{"Cache-Control":"no-store"}});
async function body(req:Request) {
  const reader = req.body?.getReader();
  if (!reader) throw Error();
  let n = 0;
  const buffer = new Uint8Array(maxBody);
  while (true) {
    const {value,done} = await reader.read();
    if (done) break;
    if (n + value.length > maxBody) { await reader.cancel(); throw Error(); }
    buffer.set(value,n); n += value.length;
  }
  return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(buffer.subarray(0,n)));
}

Deno.serve(async (req:Request) => {
  if (req.method !== "POST") return reply(405,{error:"POST required"});
  const token = req.headers.get("Authorization")?.match(/^Bearer ([A-Za-z0-9_-]{64})$/)?.[1];
  if (!token) return reply(401,{error:"Unauthorized"});
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256",new TextEncoder().encode(token)));
  function matches(expectedHex: string) {
    const expected = Uint8Array.from(expectedHex.match(/../g)!, h => parseInt(h,16));
    let difference = 0;
    for (let i=0; i<expected.length; i++) difference |= digest[i]^expected[i];
    return difference===0;
  }
  const operator = matches(reviewVerifier);
  if (!matches(verifier) && !operator) return reply(401,{error:"Unauthorized"});

  let args:(string|number)[],op:string;
  try {
    const command = await body(req);
    op = command.operation; args = command.args;
    if (operator !== (op==="review" || op==="claimRefund")) return reply(403,{error:"Forbidden"});
    const entry = statements.get(op);
    if (!entry || !Array.isArray(args) || args.length !== entry[1] ||
      args.some(v=>typeof v !== "string" && !Number.isSafeInteger(v))) throw Error();
    if (op==="review" && (typeof args[0]!=="string" || args[0].length>64 || !Number.isSafeInteger(args[1]) || Number(args[1])<0 || Number(args[1])>2147483647)) throw Error();
    if ((op==="slots" || op==="offer") && !recipients.has(String(args[0])) || op==="reserve" && !recipients.has(String(args[1]))) throw Error();
    if (["reserve","receipt","method","settleVerified","claimRefund"].includes(op) && !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(String(args[0]))) throw Error();
  } catch { return reply(400,{error:"Invalid checkout operation"}); }
  const password = Deno.env.get("BOOK05_DATABASE_PASSWORD");
  if (!password || Deno.env.get("SUPABASE_URL") !== "https://"+project+".supabase.co") return reply(503,{error:"Preview unavailable"});
  const db = postgres({host:"aws-1-eu-west-1.pooler.supabase.com",port:6543,database:"postgres",
    username:"book05_checkout_login."+project,password,ssl:{rejectUnauthorized:true},
    max:1,prepare:false,connect_timeout:5,idle_timeout:2});
  try {
    const rows = await db.unsafe(statements.get(op)![0],args);
    return reply(200,{result:rows[0]?.result ?? []});
  } catch(e) {
    const state = (e as {code?:string}).code;
    return state==="P0001" || state==="P0002" ? reply(409,{error:"Booking details or availability changed"}) : reply(503,{error:"Checkout unavailable"});
  } finally { await db.end({timeout:2}); }
});


