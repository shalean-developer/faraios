// Staging-only deny endpoint: no payload/token reads, credentials, logging or I/O.
// Keep gateway JWT verification enabled; all requests that reach this handler
// are denied as well. Auth email errors are intentional in this environment.
export function denyAuthEmail(){
  return new Response(JSON.stringify({error:{http_code:403,message:'Auth email delivery disabled in FaraiOS staging'}}),{
    status:403,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},
  });
}
if(typeof Deno!=='undefined')Deno.serve(denyAuthEmail);
