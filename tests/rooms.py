"""Native PG security and end-to-end document snapshots; fictional disposable data only."""
from requests import Requests
from journey import lit
import json,uuid,unittest,sys,re,time,urllib.request
from concurrent.futures import ThreadPoolExecutor
class Rooms(Requests):
 def test_rooms(self):
  # Baseline regression runs against the new schema, including legacy RPC support.
  self.test_requests()
  a,b=self.ids;bid=self.bids[0]
  self.sql("update invoice_private.ingress set enabled=true where environment='live'")
  bedroom=dict(id='a'*32,name='Bedrooms',kind='bedrooms',minimum=0,maximum=10,included=1,price=6000,minutes=20)
  bathroom=dict(id='b'*32,name='Bathrooms',kind='bathrooms',minimum=1,maximum=10,included=1,price=8000,minutes=30)
  room=dict(id='c'*32,name='Study',kind='room',minimum=0,maximum=5,included=0,price=4000,minutes=10)
  oven=dict(id='d'*32,name='Inside oven',kind='toggle',minimum=0,maximum=1,included=0,price=10000,minutes=45)
  svc=dict(id='1'*32,name='Fixed clean',description='',duration=90,mode='fixed',amount=50500,visible=True,archived=False,options=[bedroom,bathroom,room,oven])
  choices=[dict(id=o['id'],quantity=q) for o,q in zip(svc['options'],[3,2,1,1])]
  def sqljson(v):return lit(json.dumps(v))+'::jsonb'
  def save(service,version):return self.scope(a,f"select public.business_services_save('{bid}','live',"+sqljson(dict(currency='ZAR',items=[service]))+f",{version})")
  save(svc,1);self.scope(a,f"select public.business_services_publish('{bid}','live',2)");self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  def submit(service=svc,sel=choices,key=None,email=None):
   key=key or str(uuid.uuid4());email=email or key+'@example.test'
   args=['live','request-demo',service['id'],'Fictional Rooms',email,'','Fictional room selections.',key,'123 Fictional Rooms Road','2090-06-10 09:00','Africa/Johannesburg','ZAR']
   return self.sql('set role anon;select public.business_booking_request_submit('+','.join(lit(x) for x in args)+','+sqljson(service)+','+sqljson(sel)+')')
  def action(rid,version,act,uid=a):return json.loads(self.scope(uid,f"select public.business_booking_request_action('{bid}','live','{rid}',{version},'{act}')"))
  # Service validation and owner boundaries.
  for bad in [bedroom|dict(price=-1),bedroom|dict(minimum=11),bedroom|dict(kind=None),bedroom|dict(minutes=10081),bedroom|dict(id='x')]:
   with self.assertRaises(RuntimeError):save(svc|dict(options=[bad]),2)
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_services_save('{bid}','live',"+sqljson(dict(currency='ZAR',items=[svc]))+",2)")
  for bad in [choices[:-1],choices+[choices[0]],choices+[dict(id='e'*32,quantity=1)],[dict(id=o['id'],quantity=-1) for o in svc['options']],[dict(id=o['id'],quantity=1.5) for o in svc['options']],choices[:-1]+[dict(id=oven['id'],quantity=2)]]:
   with self.assertRaises(RuntimeError):submit(sel=bad)
  with self.assertRaises(RuntimeError):submit(service=svc|dict(amount=1))
  # Legacy RPC may not omit required option quantities.
  with self.assertRaises(RuntimeError):
   self.sql("set role anon;select public.business_booking_request_submit('live','request-demo','"+svc['id']+"','Fictional','legacy@example.test','','Fictional instructions.','"+str(uuid.uuid4())+"','123 Fictional Road','2090-01-01 09:00','Africa/Johannesburg','ZAR',"+sqljson(svc)+")")
  key=str(uuid.uuid4());email='rooms-fixed@example.test'
  with ThreadPoolExecutor(2) as pool:list(pool.map(lambda _:submit(key=key,email=email),range(2)))
  rid=self.sql("select r.id from public.business_booking_requests r join public.business_enquiries e on e.id=r.id where e.email='"+email+"'")
  snapshot=json.loads(self.sql(f"select scope from public.business_booking_requests where id='{rid}'"));self.assertEqual(snapshot['total'],84500);self.assertEqual(snapshot['minutes'],215)
  with self.assertRaises(RuntimeError):submit(sel=choices[:-1]+[dict(id=oven['id'],quantity=0)],key=key,email=email)
  with self.assertRaises(RuntimeError):action(rid,1,'accept',b)
  action(rid,1,'accept');book=action(rid,2,'convert')['booking_id'];self.assertEqual(book,action(rid,2,'convert')['booking_id'])
  doc=json.loads(self.sql(f"select document from public.business_bookings where id='{book}'"));self.assertEqual(doc['scope'],snapshot);self.assertEqual(sum(x['quantity']*x['price'] for x in doc['items']),84500)
  # Fixed request agreement survives ordinary status/schedule saves, even a tampered client document.
  self.scope(a,f"select public.business_booking_write('{bid}','live','{book}',1,null,"+sqljson(doc|dict(items=[dict(name='Tampered',quantity=1,price=1)]))+",'123 Fictional Rooms Road','2090-06-10 09:00','Africa/Johannesburg',215,'Cancelled')")
  self.assertEqual(json.loads(self.sql(f"select document from public.business_bookings where id='{book}'")),doc)
  self.scope(a,f"select public.business_booking_write('{bid}','live','{book}',2,null,"+sqljson(doc)+",'123 Fictional Rooms Road','2090-06-10 09:00','Africa/Johannesburg',215,'Scheduled')")
  iid=str(uuid.uuid4());due=self.sql("select current_date+10")
  self.scope(a,f"select public.business_invoice_write('{bid}','live','{iid}',0,'save',null,'{due}','{book}')")
  self.assertEqual(json.loads(self.sql(f"select document from public.business_invoices where id='{iid}'")),doc)
  self.scope(a,f"select public.business_invoice_write('{bid}','live','{iid}',1,'issue')")
  token=self.sql(f"select share_token from public.business_invoices where id='{iid}'")
  public=json.loads(self.sql(f"set role anon;select public.business_invoice_customer('live','{token}')"));self.assertEqual(public['total'],84500);self.assertEqual(public['document']['scope'],snapshot)
  # Price changes reject old forms; existing records retain the old agreement.
  updated=svc|dict(options=[bedroom|dict(price=9000),bathroom,room,oven]);save(updated,2);self.scope(a,f"select public.business_services_publish('{bid}','live',3)")
  with self.assertRaises(RuntimeError):submit()
  self.assertEqual(json.loads(self.sql(f"select document from public.business_invoices where id='{iid}'")),doc)
  # From and quote services preserve original scope but use the accepted offered amount.
  for index,mode in enumerate(['from','quote']):
   service=svc|dict(mode=mode,amount=50500 if mode=='from' else None);version=3+index;save(service,version);self.scope(a,f"select public.business_services_publish('{bid}','live',{version+1})")
   mail=f'rooms-{mode}@example.test';submit(service=service,email=mail)
   req=self.sql("select r.id from public.business_booking_requests r join public.business_enquiries e on e.id=r.id where e.email="+lit(mail))
   with self.assertRaises(RuntimeError):action(req,1,'accept')
   quote=action(req,1,'quote')['quote_id'];qd=json.loads(self.sql(f"select document from public.business_quotes where id='{quote}'"));scope=qd['scope'];self.assertEqual(scope['total'],84500 if mode=='from' else None)
   qd['items'][0]['price']=70000;qd.pop('scope') # ordinary editor reconstructs fields: DB retains scope
   self.scope(a,f"select public.business_quote_write('{bid}','live','{quote}',1,'save',"+sqljson(qd)+f",'{due}','{req}')")
   self.assertEqual(json.loads(self.sql(f"select document->'scope' from public.business_quotes where id='{quote}'")),scope)
   self.scope(a,f"select public.business_quote_write('{bid}','live','{quote}',2,'send',null,null)")
   token=self.sql(f"select share_token from public.business_quotes where id='{quote}'");self.sql(f"set role anon;select public.business_quote_customer('live','{token}','Accepted')")
   action(req,2,'accept');book2=action(req,3,'convert')['booking_id'];bd=json.loads(self.sql(f"select document from public.business_bookings where id='{book2}'"));self.assertEqual(bd['scope'],scope);self.assertEqual(bd['items'][0]['price'],70000)
  # Owner form roundtrip and no-JS public option fields.
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  html=self.get('/account/services.php?edit='+svc['id'])[1];self.assertIn('Additional minutes per unit',html);self.assertIn('Inside oven',html)
  path='/b/index.php?slug=request-demo&booking=1';html=self.post(path,configure_options=1,service=svc['id']);self.assertIn('name="options['+oven['id']+']"',html)
  fields=dict(action='save',id=svc['id'],version=5,name=svc['name'],description='',duration=90,mode='fixed',amount='505.00',visible='on')
  for i,o in enumerate(svc['options']):
   fields['option_enabled_'+str(i)]='on'
   for k,v in o.items():fields['option_'+k+'_'+str(i)]=str(v/100) if k=='price' else str(v)
  self.assertIn('Draft saved',self.post('/account/services.php',**fields))
  saved=json.loads(self.sql(f"select draft from public.business_service_catalogues where business_id='{bid}'"));self.assertEqual(saved['items'][0]['options'],svc['options'])
  self.assertEqual(self.sql(f"select published->'items'->0->>'mode' from public.business_service_catalogues where business_id='{bid}'"),'quote')
  self.assertIn('Services changed',self.post('/account/services.php',**fields))
  fields['version']=6;fields['option_price_0']='-1';self.assertIn('Check room and extra prices',self.post('/account/services.php',**fields))
  self.assertEqual(self.sql(f"select version from public.business_service_catalogues where business_id='{bid}'"),'6')
  # Canonical input ordering and free/included quantities.
  forward=self.sql('select request_private.calculate('+sqljson(svc)+",'ZAR',"+sqljson(choices)+')')
  reverse=self.sql('select request_private.calculate('+sqljson(svc)+",'ZAR',"+sqljson(list(reversed(choices)))+')');self.assertEqual(forward,reverse)
  included=[dict(id=o['id'],quantity=q) for o,q in zip(svc['options'],[0,1,0,0])]
  calc=json.loads(self.sql('select request_private.calculate('+sqljson(svc)+",'ZAR',"+sqljson(included)+')'));self.assertEqual(calc['total'],50500);self.assertEqual(calc['minutes'],90);self.assertEqual(len(calc['rows']),4)
  for bad in [svc|dict(amount=999999999),svc|dict(duration=10080)]:
   with self.assertRaises(RuntimeError):self.sql('select request_private.calculate('+sqljson(bad)+",'ZAR',"+sqljson(choices)+')')
  # Snapshot validation must reject malformed metadata, not return SQL NULL.
  self.assertEqual(self.sql("select request_private.scope_valid('{}')"),'f')
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Rooms('test_rooms')]));sys.exit(not result.wasSuccessful())
