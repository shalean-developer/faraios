"""Native PostgreSQL security/lifecycle and PHP HTTP; simulated Auth and REST only."""
from profiles import Profiles
from journey import lit
import json,uuid,unittest,sys,time,re,urllib.parse,urllib.request,urllib.error
from concurrent.futures import ThreadPoolExecutor
class Requests(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment','online_booking_requests']
 def test_requests(self):
  a,b=self.ids;bid=self.bids[0]
  profile=dict(name='Request Demo',description='Fictional preview only',email='demo@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None)
  fixed=dict(id='1'*32,name='Fixed clean',description='',duration=90,mode='fixed',amount=87525,visible=True,archived=False)
  quoted=fixed|dict(id='2'*32,name='Quoted clean',mode='quote',amount=None)
  starting=fixed|dict(id='3'*32,name='Starting clean',mode='from',amount=50000)
  cat=dict(currency='ZAR',items=[fixed,quoted,starting])
  self.scope(a,f"select public.business_profile_save('{bid}','live','request-demo',"+lit(json.dumps(profile))+"::jsonb,0)")
  self.scope(a,f"select public.business_services_save('{bid}','live',"+lit(json.dumps(cat))+"::jsonb,0)")
  self.scope(a,f"select public.business_services_publish('{bid}','live',1)")
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  args=dict(p_environment='live',p_slug='request-demo',p_service=fixed['id'],p_name='Fictional Customer',p_email='request@example.test',p_phone='',p_requirements='Please clean my home.',p_request=str(uuid.uuid4()),p_address='123 Fictional Road',p_local='2090-05-20 10:30:00',p_zone='Africa/Johannesburg',p_currency='ZAR',p_service_snapshot=fixed)
  def rpc(data):return self.sql('set role anon;select public.business_booking_request_submit('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if isinstance(v,dict) else lit(v)) for k,v in data.items())+')')
  def action(uid,rid,version,act):return self.scope(uid,f"select public.business_booking_request_action('{bid}','live','{rid}',{version},'{act}')")
  with self.assertRaises(RuntimeError):rpc(args)
  self.sql("update request_private.ingress set enabled=true where environment='live';update enquiry_private.ingress set enabled=true where environment='live';update quote_private.ingress set enabled=true where environment='live';update booking_private.ingress set enabled=true where environment='live'")
  for bad in [dict(p_local='2020-01-01 00:00'),dict(p_address='x'),dict(p_zone='UTC'),dict(p_currency='USD'),dict(p_service_snapshot=fixed|dict(amount=1)),dict(p_service='hidden'),dict(p_name='x'),dict(p_email='',p_phone=''),dict(p_requirements='x'*2001)]:
   with self.assertRaises(RuntimeError):rpc(args|bad)
  rpc(args);rpc(args)
  self.assertEqual(self.sql('select count(*) from public.business_booking_requests'),'1')
  rid=self.sql('select id from public.business_booking_requests')
  self.assertEqual(self.scope(b,'select count(*) from public.business_booking_requests'),'0')
  for q in ['set role anon;select * from public.business_booking_requests',f"set role authenticated;update public.business_booking_requests set status='Accepted'",f"set role anon;select public.business_booking_request_action('{bid}','live','{rid}',1,'accept')"]:
   with self.assertRaises(RuntimeError):self.sql(q)
  with self.assertRaises(RuntimeError):action(b,rid,1,'accept')
  with self.assertRaises(RuntimeError):action(a,rid,1,'convert')
  with self.assertRaises(RuntimeError):rpc(args|dict(p_address='Changed Road'))
  action(a,rid,1,'accept')
  with self.assertRaises(RuntimeError):action(a,rid,1,'decline')
  with ThreadPoolExecutor(2) as pool:converted=list(pool.map(lambda _:action(a,rid,2,'convert'),range(2)))
  self.assertEqual(converted[0],converted[1]);self.assertEqual(self.sql('select count(*) from public.business_bookings'),'1')
  booking=json.loads(self.sql('select to_jsonb(b) from public.business_bookings b'));self.assertEqual(booking['document']['items'][0]['price'],87525);self.assertEqual(booking['address'],'123 Fictional Road');self.assertEqual(booking['duration_minutes'],90);self.assertEqual(booking['time_zone'],'Africa/Johannesburg')
  # Declined requests cannot become bookings. From/quote prices require customer quote acceptance.
  for i,svc in enumerate([quoted,starting]):
   data=args|dict(p_request=str(uuid.uuid4()),p_email=f'quote{i}@example.test',p_service=svc['id'],p_service_snapshot=svc);rpc(data)
   qrid=self.sql("select id from public.business_booking_requests where service->>'id'="+lit(svc['id']))
   with self.assertRaises(RuntimeError):action(a,qrid,1,'accept')
   if i==1:
    action(a,qrid,1,'decline')
    with self.assertRaises(RuntimeError):action(a,qrid,2,'convert')
    continue
   result=json.loads(action(a,qrid,1,'quote'));qid=result['quote_id'];self.assertEqual(json.loads(action(a,qrid,2,'quote'))['quote_id'],qid)
   with self.assertRaises(RuntimeError):action(a,qrid,2,'accept')
   doc=json.loads(self.scope(a,f"select document from public.business_quotes where id='{qid}'"));doc['items'][0]['price']=99900
   expiry=self.sql("select (now() at time zone 'Africa/Johannesburg')::date+14")
   self.scope(a,f"select public.business_quote_write('{bid}','live','{qid}',1,'save',"+lit(json.dumps(doc))+f"::jsonb,'{expiry}','{qrid}')")
   self.scope(a,f"select public.business_quote_write('{bid}','live','{qid}',2,'send',null,null)")
   token=self.sql(f"select share_token from public.business_quotes where id='{qid}'")
   self.sql(f"set role anon;select public.business_quote_customer('live','{token}','Accepted')")
   action(a,qrid,2,'accept');action(a,qrid,3,'convert')
   self.assertEqual(self.sql(f"select document->'items'->0->>'price' from public.business_bookings where quote_id='{qid}'"),'99900')
  # Real PHP form, origin, timing, retained invalid inputs, escaping, success redirect and duplicate protection.
  path='/b/index.php?slug=request-demo&booking=1';html=self.get(path)[1]
  self.assertIn('Request a booking',html);self.assertIn('Quote required',html);self.assertIn('request-summary',html)
  self.assertEqual(self.get('/account/requests-core.php')[0],403)
  fields=dict(name='Fictional HTTP',email='http@example.test',phone='',service=fixed['id'],address='456 Example Street',date='2090-06-01',time='09:15',requirements='Please clean this example home.',website='')
  token=re.search('name="csrf" value="([^"]+)"',html)[1];fields['snapshot_hash']=re.search('name="snapshot_hash" value="([^"]+)"',html)[1]
  def send(fields):
   request=urllib.request.Request(self.url+path,data=urllib.parse.urlencode(fields).encode(),headers={'Origin':self.url})
   try:r=self.client.open(request)
   except urllib.error.HTTPError as e:r=e
   return r.read().decode()
  self.assertIn('wait a moment',send(fields|dict(csrf=token)));time.sleep(2.1)
  self.assertIn('form has expired',send(fields|dict(csrf='bad')))
  self.assertIn('email address or phone',send(fields|dict(csrf=token,email='')))
  self.assertIn('value="Fictional HTTP"',send(fields|dict(csrf=token,email='')))
  before=int(self.sql('select count(*) from public.business_booking_requests'))
  send(fields|dict(csrf=token));self.assertEqual(int(self.sql('select count(*) from public.business_booking_requests')),before+1)
  self.get(path);self.assertEqual(int(self.sql('select count(*) from public.business_booking_requests')),before+1)
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password');self.assertIn('Fixed clean',self.get('/account/requests.php')[1]);self.assertIn('Fictional Customer',self.get('/account/requests.php?id='+rid)[1])
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Fixed clean',self.get('/account/requests.php')[1]);self.assertIn('unavailable',self.get('/account/requests.php?id='+rid)[1])
  self.scope(a,f"select public.business_profile_unpublish('{bid}','live')")
  self.assertEqual(self.get(path)[0],404)
  with self.assertRaises(RuntimeError):rpc(args|dict(p_request=str(uuid.uuid4())))
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Requests('test_requests')]));sys.exit(not r.wasSuccessful())
