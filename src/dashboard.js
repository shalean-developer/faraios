import {renderWorkspaceHeader} from './workspace-header.js';
import {createServer} from 'node:http';
import {randomUUID} from 'node:crypto';
import {readFile} from 'node:fs/promises';
import {accessibleBusinesses,canAccess} from './access.js';

const businesses=[{id:'shalean',name:'Shalean'},{id:'bokkie',name:'Bokkie'}];
const people={owner:{name:'Demo owner',memberships:[['shalean','owner'],['bokkie','owner']]},manager:{name:'Demo Bokkie manager',memberships:[['bokkie','manager']]},cleaner:{name:'Demo cleaner',memberships:[['shalean','staff']]}};
const escape=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const page=(title,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${escape(title)} · FaraiOS</title><link rel="stylesheet" href="/style.css"></head><body><div class="notice">LOCAL DEMO · Synthetic users · No live business records or real sign-in</div>${body}</body></html>`;
const login=()=>page('Sign in',`<main class="login"><div class="brand">F<span>↗</span> FaraiOS</div><p class="eyebrow">YOUR BUSINESS, CONNECTED</p><h1>One place.<br>Every business.</h1><p>Preview your workspace and the permissions each role receives.</p><section class="panel"><h2>Choose a demo workspace</h2><p>These buttons simulate a user session locally. They do not authenticate a real account.</p>${Object.entries(people).map(([id,p])=>`<form method="post" action="/demo-login"><input type="hidden" name="persona" value="${id}"><button class="persona" type="submit">${escape(p.name)} <span>→</span></button></form>`).join('')}<p class="muted">Real authentication will be connected in the identity stage.</p></section></main>`);

export function createDashboardServer({demo=false,now=()=>Date.now()}={}) {
  const sessions=new Map();
  const server=createServer(async(req,res)=>{
    const host=req.headers.host;
    const expected=`127.0.0.1:${server.address()?.port}`;
    const send=(status,body,type='text/html; charset=utf-8')=>{res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Content-Security-Policy':"default-src 'none'; style-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin'});res.end(body);};
    try {
      if(!demo || process.env.NODE_ENV==='production')return send(503,'Local demo disabled. Real authentication is not configured.','text/plain');
      // Reject DNS rebinding and accidental non-loopback exposure, even if caller binds elsewhere.
      if(host!==expected || !['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress))return send(403,'Local access only','text/plain');
      const url=new URL(req.url,`http://${expected}`);
      if(req.method==='GET'&&url.pathname==='/style.css')return send(200,await readFile(new URL('../public/style.css',import.meta.url),'utf8'),'text/css');
      const cookie=req.headers.cookie?.match(/(?:^|;\s*)faraios_demo=([a-f0-9-]+)/)?.[1];
      const session=sessions.get(cookie);
      if(session&&session.expires<=now()){sessions.delete(cookie);return send(401,'Demo session expired. Return to /login.','text/plain');}
      const redirect=location=>{res.writeHead(303,{Location:location,'Cache-Control':'no-store'});res.end();};
      if(req.method==='POST'){
        if(req.headers.origin!==`http://${expected}`)return send(403,'Origin rejected','text/plain');
        if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
        let body='';for await(const chunk of req){body+=chunk;if(body.length>2048)return send(413,'Form too large','text/plain');}
        const form=new URLSearchParams(body);
        if(url.pathname==='/demo-login'){
          const persona=form.get('persona');if(!Object.hasOwn(people,persona))return send(400,'Unknown demo user','text/plain');
          for(const [id,s] of sessions)if(s.expires<=now())sessions.delete(id);
          if(sessions.size>=100)return send(429,'Demo session limit reached','text/plain');
          if(cookie)sessions.delete(cookie);
          const token=randomUUID();sessions.set(token,{persona,expires:now()+30*60*1000});
          res.setHeader('Set-Cookie',`faraios_demo=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);return redirect('/dashboard');
        }
        if(url.pathname==='/logout'){if(cookie)sessions.delete(cookie);res.setHeader('Set-Cookie','faraios_demo=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return redirect('/login');}
      }
      if(req.method!=='GET')return send(405,'Method not allowed','text/plain');
      if(url.pathname==='/'||url.pathname==='/login')return send(200,login());
      if(url.pathname!=='/dashboard')return send(404,'Not found','text/plain');
      if(!session)return redirect('/login');
      const user=people[session.persona];
      const memberships=user.memberships.map(([businessId,role])=>({userId:session.persona,businessId,role,status:'active'}));
      const allowed=accessibleBusinesses(session.persona,memberships);
      const selected=url.searchParams.get('business')??'all';
      if(selected!=='all'&&!allowed.includes(selected))return send(403,'This demo user cannot access that business.','text/plain');
      const visible=businesses.filter(b=>allowed.includes(b.id)&&(selected==='all'||selected===b.id));
      const canFinance=visible.some(b=>canAccess({userId:session.persona,businessId:b.id,permission:'finance.read',memberships}));
      const scope=selected==='all'?'All businesses':visible[0].name;
      return send(200,page('Overview',`<div class="workspace"><aside><a class="brand" href="/dashboard">F<span>↗</span> FaraiOS</a><div class="side-label">WORKSPACE</div><nav aria-label="Workspace"><a class="active" href="/dashboard">Overview</a><span>Bookings <small>Coming next</small></span><span>Calendar <small>Planned</small></span><span>Customers <small>Planned</small></span><span>Team <small>Planned</small></span>${canFinance?'<span>Finance <small>Planned</small></span>':'<span>My earnings <small>Planned</small></span>'}<span>Settings <small>Planned</small></span></nav><p class="side-note">Cleaning module<br>Foundation preview</p></aside><main class="content">${renderWorkspaceHeader({subtitle:user.name})}<section class="intro"><div><h1>Your business overview</h1><p>Keep your teams and daily work connected.</p></div><form method="get" action="/dashboard"><label for="business">Business</label><div class="switch"><select id="business" name="business"><option value="all" ${selected==='all'?'selected':''}>All businesses</option>${businesses.filter(b=>allowed.includes(b.id)).map(b=>`<option value="${b.id}" ${selected===b.id?'selected':''}>${b.name}</option>`).join('')}</select><button>Apply</button></div></form></section><p class="scope">Viewing: <strong>${escape(scope)}</strong></p><section class="cards" aria-label="Operational summary">${['Today’s bookings','Unassigned jobs',canFinance?'Payments to review':'My assigned jobs'].map(label=>`<article class="panel"><p>${label}</p><div class="metric">—</div><p class="muted">Not connected yet</p></article>`).join('')}</section><section class="panel"><h2>Your businesses</h2><p>Only businesses assigned to this demo user appear here.</p>${visible.map(b=>`<div class="business-row"><div class="avatar">${b.name[0]}</div><div><strong>${b.name}</strong><p>Cleaning · ${memberships.find(m=>m.businessId===b.id).role}</p></div><a href="/dashboard?business=${b.id}">Open workspace →</a></div>`).join('')}</section><section class="panel next"><h2>Ready for the next stage</h2><p>This preview verifies navigation and role boundaries. Live customers, bookings, finance and authentication will be connected in later stages.</p></section></main></div>`));
    }catch {if(!res.headersSent)send(500,'Unable to load workspace','text/plain');else res.end();}
  });return server;
}
