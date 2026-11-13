"""Real PHP requests and native PG authorization; Auth/REST transports simulated locally."""
from profiles import Profiles
from journey import lit
import json,re,urllib.parse,urllib.request,urllib.error,unittest,uuid,sys,time
class Enquiries(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment']
 def send(self,path,**fields):
  # Public forms have a two-second minimum and a separate cookie from owner authentication.
  html=self.get(path)[1];token=re.search('name="csrf" value="([^"]+)"',html)[1]
  fields.setdefault('csrf',token)
  try:r=self.client.open(urllib.request.Request(self.url+path,data=urllib.parse.urlencode(fields).encode(),headers={'Origin':self.url}))
  except urllib.error.HTTPError as e:r=e
  return r.status,r.read().decode()
 def test_enquiries(self):
  self.assertEqual(self.get("/account/enquiries-core.php")[0],403)
  a,b=self.ids;bid=self.bids[0]
  profile=dict(name='Published Test',description='Public description',email='public@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None)
  self.scope(a,f"select public.business_profile_save('{bid}','live','enquiry-test',"+lit(json.dumps(profile))+"::jsonb,0)")
  self.scope(a,f"select public.business_profile_publish('{bid}','live',1)")
  # Production intake starts disabled even with a published page.
  args=dict(p_environment='live',p_slug='enquiry-test',p_service='',p_name='Alice Test',p_email='alice@example.test',p_phone='',p_requirements='Please quote for a home clean.',p_request=str(uuid.uuid4()))
  def rpc(args):return self.sql('set role anon;select public.business_enquiry_submit('+','.join(k+'=>'+lit(v) for k,v in args.items())+')')
  with self.assertRaises(RuntimeError):rpc(args)
  self.sql("update enquiry_private.ingress set enabled=true where environment='live'")
  path='/b/index.php?slug=enquiry-test'
  html=self.get(path)[1];self.assertIn('Send enquiry',html);self.assertNotIn(bid,html)
  self.assertEqual(self.client.open(self.url+path).headers.get("Referrer-Policy"),"same-origin")
  fields=dict(name='Alice <script>',email='alice@example.test',phone='',requirements='Please quote for my home. <img src=x onerror=alert(1)>',service='',website='')
  self.assertIn('wait a moment',self.send(path,**fields)[1]);time.sleep(2.1)
  self.assertIn('form has expired',self.send(path,**(fields|{'csrf':'bad'}))[1])
  self.assertIn('wait a moment',self.send(path,**(fields|{'website':'spam'}))[1])
  self.assertIn('email address or phone',self.send(path,**(fields|{'email':''}))[1])
  self.assertIn('valid email',self.send(path,**(fields|{'email':'bad'}))[1])
  self.assertIn('valid phone',self.send(path,**(fields|{'phone':'(---)'}))[1])
  self.assertIn('requirements',self.send(path,**(fields|{'requirements':'short'}))[1])
  self.assertIn('no longer available',self.send(path,**(fields|{'service':'hidden-service'}))[1])
  # Tests use PHP built-in server without pretty-route rewrite; inspect native record after 303.
  self.send(path,**fields)
  self.assertEqual(self.sql('select count(*) from public.business_enquiries'),'1')
  self.assertEqual(self.scope(b,'select count(*) from public.business_enquiries'),'0')
  with self.assertRaises(RuntimeError):self.sql('set role anon;select * from public.business_enquiries')
  with self.assertRaises(RuntimeError):self.sql('set role anon;insert into public.business_enquiries default values')
  with self.assertRaises(RuntimeError):self.scope(a,f"update public.business_enquiries set business_id='{self.bids[1]}'")
  with self.assertRaises(RuntimeError):self.scope(a,"update public.business_enquiries set requirements='forged'")
  with self.assertRaises(RuntimeError):self.scope(a,'delete from public.business_enquiries')
  record=json.loads(self.scope(a,'select to_jsonb(e) from public.business_enquiries e'));eid=record['id']
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password')
  self.assertNotIn('Alice',self.get('/account/enquiries.php')[1])
  self.assertIn('unavailable',self.get('/account/enquiries.php?id='+eid)[1])
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_enquiry_status('{bid}','live','{eid}','Closed',1)")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  html=self.get('/account/enquiries.php')[1];self.assertIn('Alice &lt;script&gt;',html)
  detail='/account/enquiries.php?id='+eid;html=self.get(detail)[1];self.assertIn('&lt;img',html);self.assertNotIn('<img src=x',html)
  for version,status in enumerate(['Contacted','Closed','New'],1):
   html=self.post(detail,id=eid,version=version,status=status);self.assertIn('Status saved',html)
   self.assertEqual(self.scope(a,f"select status from public.business_enquiries where id='{eid}'"),status)
  self.assertIn('Reload before updating',self.post(detail,id=eid,version=1,status='Closed'))
  # Idempotency with identical request, different payload rejected.
  rpc(args);rpc(args);self.assertEqual(self.sql('select count(*) from public.business_enquiries'),'2')
  with self.assertRaises(RuntimeError):rpc(args|{'p_name':'Someone else'})
  with self.assertRaises(RuntimeError):rpc(args|{'p_request':str(uuid.uuid4()),'p_service':'0'*32})
  with self.assertRaises(RuntimeError):rpc(args|{'p_request':str(uuid.uuid4()),'p_email':'','p_phone':''})
  # Contact rate limit applies even when HTTP controls are bypassed.
  for i in range(3):rpc(args|{'p_request':str(uuid.uuid4())})
  with self.assertRaises(RuntimeError):rpc(args|{'p_request':str(uuid.uuid4())})
  # Preview storage isolated from live, published-service snapshot and status filtering.
  self.scope(a,f"select public.business_profile_save('{bid}','preview','preview-test',"+lit(json.dumps(profile))+"::jsonb,0)")
  service=dict(id='1'*32,name='Published Service',description='',duration=60,mode='quote',amount=None,visible=True,archived=False)
  self.scope(a,f"select public.business_services_save('{bid}','preview',"+lit(json.dumps(dict(currency='ZAR',items=[service])))+"::jsonb,0)")
  self.scope(a,f"select public.business_services_publish('{bid}','preview',1)")
  self.scope(a,f"select public.business_profile_publish('{bid}','preview',1)")
  rpc(args|{'p_environment':'preview','p_slug':'preview-test','p_email':'preview@example.test','p_request':str(uuid.uuid4()),'p_service':'1'*32})
  self.assertEqual(self.sql("select service_name from public.business_enquiries where environment='preview'"),'Published Service')
  self.assertNotIn('Published Service',self.get('/account/enquiries.php')[1])
  self.scope(a,f"select public.business_profile_unpublish('{bid}','live')")
  self.assertEqual(self.get(path)[0],404)
  with self.assertRaises(RuntimeError):rpc(args|{'p_email':'new@example.test','p_request':str(uuid.uuid4())})
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Enquiries('test_enquiries')]));sys.exit(not r.wasSuccessful())
