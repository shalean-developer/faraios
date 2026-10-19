import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {createAuthSessions} from './auth-session.js';
import {parseBusinessSettings,readBusinessSettings,saveBusinessSettings,renderBusinessSettings} from './business-settings.js';
import {parseCatalogueItem,listCatalogue,saveCatalogueItem,deleteCatalogueItem,renderCatalogueDelete,renderCatalogue} from './catalogue.js';
import {parseCustomerForm,listCustomers,readCustomer,listAddresses,readAddress,saveCustomerRecord,renderCustomers} from './customers.js';
import {bookingContext,listBookings,readBooking,parseBookingCreate,createBooking,updateBooking,renderBookings} from './bookings.js';
import {renderWorkspace} from './workspace.js';
const esc=v=>String(v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=(title,body)=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)} · FaraiOS staging</title><link rel="stylesheet" href="/style.css"><script type="module" src="/dropdown.js"></script></head><body><div class="notice">FARAiOS STAGING · Real test-account sign-in · No production data</div><main class="login"><div class="brand">FaraiOS</div>${body}</main></body></html>`;
const form=message=>html('Sign in',`<h1>Welcome back</h1><p>Use your FaraiOS staging test account.</p>${message?`<p role="alert">${esc(message)}</p>`:''}<form method="post" action="/login" class="panel"><label for="email">Email</label><input id="email" name="email" type="email" autocomplete="username" maxlength="254" required style="display:block;width:100%;padding:12px;margin:8px 0 20px"><label for="password">Password</label><input id="password" name="password" type="password" autocomplete="current-password" maxlength="1024" required style="display:block;width:100%;padding:12px;margin:8px 0 20px"><button type="submit">Sign in</button><p class="muted">Accounts are provisioned in staging. Never enter a production password here.</p></form>`);

export function createStagingServer({createClient,now=()=>Date.now()}){
  if(process.env.NODE_ENV==='production')throw new Error('Local staging server cannot run in production');
  const auth=createAuthSessions({createClient,now});let failures=[];
  const server=createServer(async(req,res)=>{
    const expected=`127.0.0.1:${server.address()?.port}`, origin=`http://${expected}`;
    const send=(code,body,type='text/html; charset=utf-8')=>{res.writeHead(code,{'Content-Type':type,'Cache-Control':'no-store','Referrer-Policy':'same-origin','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"});res.end(body);};
    const redirect=path=>{res.writeHead(303,{Location:path,'Cache-Control':'no-store'});res.end();};
    const clear=()=>res.setHeader('Set-Cookie','faraios_staging=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
    try{
      if(req.headers.host!==expected||!['127.0.0.1','::ffff:127.0.0.1','::1'].includes(req.socket.remoteAddress))return send(403,'Local access only','text/plain');
      const url=new URL(req.url,origin),id=req.headers.cookie?.match(/(?:^|;\s*)faraios_staging=([a-f0-9-]+)/)?.[1];
      if(req.method==='GET'&&url.pathname==='/dropdown.js')return send(200,await readFile(new URL('../public/dropdown.js',import.meta.url),'utf8'),'text/javascript; charset=utf-8');
      if(req.method==='GET'&&url.pathname==='/style.css')return send(200,await readFile(new URL('../public/style.css',import.meta.url),'utf8'),'text/css');
      if(req.method==='GET'&&(url.pathname==='/login'||url.pathname==='/'))return send(200,form(''));
      if(req.method==='POST'){
        if(req.headers.origin!==origin)return send(403,'Origin rejected','text/plain');
        if(req.headers['content-type']?.split(';')[0]!=='application/x-www-form-urlencoded')return send(415,'Form encoding required','text/plain');
        let body='';for await(const chunk of req){body+=chunk;if(Buffer.byteLength(body)>(['/customers','/bookings'].includes(url.pathname)?65536:['/settings','/catalogue'].includes(url.pathname)?32768:4096))return send(413,'Form too large','text/plain');}
        if(url.pathname==='/bookings'){
          if(!await auth.read(id)){clear();return redirect('/login');}
          return await auth.withBookings(id,url.searchParams.get('business'),async(client,business)=>{
            const data=new URLSearchParams(body),bookingId=url.searchParams.get('booking'),ctx=await bookingContext(client,business.id),booking=bookingId?await readBooking(client,business.id,bookingId):null;
            if(bookingId&&!booking)return send(404,'Booking unavailable','text/plain');
            const customerId=data.get('customer_id'),customer=!booking&&customerId?await readCustomer(client,business.id,customerId):null;
            const catalogue=!booking?await listCatalogue(client,business.id):[];
            try{
              if(booking){await updateBooking(client,business.id,booking,data);return redirect('/bookings?business='+encodeURIComponent(business.id)+'&booking='+encodeURIComponent(booking.id)+'&saved=1');}
              if(data.get('action')!=='create'||!customer?.is_active)throw new Error('Select an active customer.');
              const row=parseBookingCreate(data,catalogue),saved=await createBooking(client,business.id,row);
              return redirect('/bookings?business='+encodeURIComponent(business.id)+'&booking='+encodeURIComponent(saved)+'&saved=1');
            }catch(error){return send(error.status??422,html('Bookings',renderBookings(business,await listBookings(client,business.id),ctx,{booking,customers:await listCustomers(client,business.id),customer,addresses:customer?await listAddresses(client,business.id,customer.id):[],catalogue,values:Object.fromEntries(data),message:error.message,error:true})));}
          });
        }
        if(url.pathname==='/customers'){
          if(!await auth.read(id)){clear();return redirect('/login');}
          return await auth.withCustomers(id,url.searchParams.get('business'),async(client,business)=>{
            const customerId=url.searchParams.get('customer'),addressId=url.searchParams.get('address'),data=new URLSearchParams(body),action=data.get('action');
            if(!['customer','address'].includes(action))return send(400,'Invalid action','text/plain');
            const customer=customerId?await readCustomer(client,business.id,customerId):null;
            if((customerId&&!customer)||(action==='address'&&!customer))return send(404,'Customer unavailable','text/plain');
            if(action==='customer'&&addressId)return send(400,'Invalid address action','text/plain');
            const addresses=customer?await listAddresses(client,business.id,customer.id):[],address=addressId?await readAddress(client,business.id,customerId,addressId):null;
            if(addressId&&!address)return send(404,'Address unavailable','text/plain');
            let row;
            try{row=parseCustomerForm(data,action==='address');const saved=await saveCustomerRecord(client,business.id,row,{id:action==='address'?addressId:customerId,version:Number(data.get('version')),...(action==='address'?{customerId}: {})});return redirect('/customers?business='+encodeURIComponent(business.id)+'&customer='+encodeURIComponent(action==='address'?customerId:saved)+'&saved=1');}
            catch(error){const values={...Object.fromEntries(data),...row,id:action==='address'?addressId:customerId,version:data.get('version')};if(values.is_active===undefined)values.is_active=data.get('status')==='active';return send(error.status??(row?502:422),html('Customers',renderCustomers(business,await listCustomers(client,business.id),action==='address'?customer:values,addresses,action==='address'?values:null,error.message,true)));}
          });
        }
      if(url.pathname==='/catalogue'){
          if(!await auth.read(id)){clear();return redirect('/login');}
          const businessId=url.searchParams.get('business'),itemId=url.searchParams.get('item');
          return await auth.withCatalogue(id,businessId,true,async(client,business)=>{
            const data=new URLSearchParams(body),items=await listCatalogue(client,businessId);
            if(itemId&&!items.some(i=>i.id===itemId))return send(404,html('Item unavailable','<h1>Item unavailable</h1><a href="/dashboard">Back to workspace</a>'));
            if(data.get('action')==='delete'){
              if(!itemId)return send(400,'Item required','text/plain');
              try{await deleteCatalogueItem(client,businessId,itemId,Number(data.get('version')));}
              catch(error){return send(error.status??502,html('Catalogue',renderCatalogue(business,items,true,null,error.message,true)));}
              return redirect('/catalogue?business='+encodeURIComponent(businessId)+'&deleted=1');
            }
            let item;try{item=parseCatalogueItem(data);}catch(error){return send(422,html('Catalogue',renderCatalogue(business,items,true,{...Object.fromEntries(data),id:itemId},error.message,true)));}
            if(itemId&&items.find(i=>i.id===itemId).kind!==item.kind)return send(422,html('Catalogue',renderCatalogue(business,items,true,{...item,id:itemId,version:data.get('version')},'Item type cannot be changed. Create another item instead.',true)));
            try{await saveCatalogueItem(client,businessId,item,{id:itemId,version:Number(data.get('version'))});}
            catch(error){return send(error.status??502,html('Catalogue',renderCatalogue(business,items,true,{...item,id:itemId,version:data.get('version')},error.message,true)));}
            return redirect('/catalogue?business='+encodeURIComponent(businessId)+'&saved=1');
          });
        }
        if(url.pathname==='/settings'){
          const businessId=url.searchParams.get('business');
          if(!await auth.read(id)){clear();return redirect('/login');}
          return await auth.withOwner(id,businessId,async(client,business)=>{
            const data=new URLSearchParams(body);let settings;
            try{settings=parseBusinessSettings(data);}catch(error){
              const values=Object.fromEntries(data);values.working_days=data.getAll('working_days').map(Number);
              return send(422,html('Business settings',renderBusinessSettings(business,values,error.message,true)));
            }
            await saveBusinessSettings(client,businessId,settings);return redirect('/settings?business='+encodeURIComponent(businessId)+'&saved=1');
          });
        }
        if(url.pathname==='/logout'){clear();try{await auth.logout(id);}catch{return send(502,form('Local session cleared. Remote sign-out could not be confirmed.'));}return redirect('/login');}
        if(url.pathname==='/login'){
          failures=failures.filter(t=>t>now()-60000);if(failures.length>=5)return send(429,form('Too many attempts. Wait one minute.'));
          const data=new URLSearchParams(body);
          try{const session=await auth.login(data.get('email'),data.get('password'));if(id)await auth.logout(id);res.setHeader('Set-Cookie',`faraios_staging=${session.id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=1800`);return redirect('/dashboard');}
          catch{failures.push(now());return send(401,form('Unable to sign in. Check your staging account and try again.'));}
        }
      }
      if(req.method!=='GET')return send(405,'Method not allowed','text/plain');
      if(url.pathname==='/bookings'){
        if(!await auth.read(id)){clear();return redirect('/login');}
        return await auth.withBookings(id,url.searchParams.get('business'),async(client,business)=>{
          const ctx=await bookingContext(client,business.id),bookingId=url.searchParams.get('booking'),customerId=url.searchParams.get('customer'),booking=bookingId?await readBooking(client,business.id,bookingId):null,customer=customerId?await readCustomer(client,business.id,customerId):null;
          if(bookingId&&!booking||customerId&&!customer)return send(404,'Booking or customer unavailable','text/plain');
          return send(200,html('Bookings',renderBookings(business,await listBookings(client,business.id),ctx,{booking,customer,customers:await listCustomers(client,business.id),addresses:customer?await listAddresses(client,business.id,customer.id):[],catalogue:await listCatalogue(client,business.id),values:{service_id:url.searchParams.get('service_id')??''},message:url.searchParams.get('saved')==='1'?'Booking saved.':''})));
        });
      }
        if(url.pathname==='/customers'){
        if(!await auth.read(id)){clear();return redirect('/login');}
        return await auth.withCustomers(id,url.searchParams.get('business'),async(client,business)=>{
          const customerId=url.searchParams.get('customer'),addressId=url.searchParams.get('address'),customer=customerId?await readCustomer(client,business.id,customerId):null;
          if(customerId&&!customer)return send(404,'Customer unavailable','text/plain');
          const addresses=customer?await listAddresses(client,business.id,customer.id):[],address=addressId?await readAddress(client,business.id,customerId,addressId):null;
          if(addressId&&!address)return send(404,'Address unavailable','text/plain');
          return send(200,html('Customers',renderCustomers(business,await listCustomers(client,business.id),customer,addresses,address,url.searchParams.get('saved')==='1'?'Record saved.':'')));
        });
      }
      if(url.pathname==='/catalogue'){
        if(!await auth.read(id)){clear();return redirect('/login');}
        return await auth.withCatalogue(id,url.searchParams.get('business'),false,async(client,business,canManage)=>{
          const items=await listCatalogue(client,business.id),itemId=url.searchParams.get('item'),editing=itemId?items.find(i=>i.id===itemId):null;
          if(itemId&&!editing)return send(404,html('Item unavailable','<h1>Item unavailable</h1><a href="/dashboard">Back to workspace</a>'));
          if(url.searchParams.get('delete')==='1'){
            if(!canManage)throw new Error('Catalogue access denied');
            if(!editing)return send(400,'Item required','text/plain');
            return send(200,html('Delete catalogue item',renderCatalogueDelete(business,editing)));
          }
          return send(200,html('Catalogue',renderCatalogue(business,items,canManage,editing,url.searchParams.get('deleted')==='1'?'Item deleted.':url.searchParams.get('saved')==='1'?'Catalogue saved.':'')));
        });
      }
      if(url.pathname==='/settings'){
        if(!await auth.read(id)){clear();return redirect('/login');}
        return await auth.withOwner(id,url.searchParams.get('business'),async(client,business)=>send(200,html('Business settings',renderBusinessSettings(business,await readBusinessSettings(client,business.id),url.searchParams.get('saved')==='1'?'Settings saved.':''))));
      }
      if(url.pathname!=='/dashboard')return send(404,'Not found','text/plain');
      const identity=await auth.read(id);if(!identity){clear();return redirect('/login');}
      const selected=url.searchParams.get('business')??'all';
      if(selected!=='all'&&!identity.businessIds.includes(selected))return send(403,'You do not have access to this business.','text/plain');
      return send(200,renderWorkspace(identity,selected));
    }catch(error){if(['Settings access denied','Catalogue access denied','Customer access denied','Booking access denied'].includes(error.message))return send(403,html('Access denied','<h1>Access denied</h1><p>You do not have permission to access this business configuration.</p><a href="/dashboard">Back to workspace</a>'));return send(503,form('Staging service unavailable. Please try again later.'));}
  });return server;
}
