"""F04 secure-links journey: native tenancy/RPCs and real PHP HTTP; no hosted writes."""
from seo import SEO
from journey import lit
import unittest,json,urllib.request,urllib.parse,urllib.error,re
class Access(SEO):
 def test_secure_links(self):
  a,b=self.ids;bid,other=self.bids;p=self.doc()
  for uid,bb,slug,name in [(a,bid,'access-one','First Service Business'),(b,other,'access-two','Second Service Business')]:
   d=p|dict(name=name)
   self.scope(uid,'select public.business_profile_save('+','.join(map(lit,[bb,'preview',slug]))+','+lit(json.dumps(d))+"::jsonb,0);select public.business_profile_publish("+','.join(map(lit,[bb,'preview',1]))+')')
  catalogue=dict(currency='ZAR',items=[dict(id='1'*32,name='Assessment',description='',duration=60,mode='fixed',amount=25000,visible=True,archived=False)])
  self.scope(a,'select public.business_services_save('+','.join(map(lit,[bid,'preview']))+','+lit(json.dumps(catalogue))+"::jsonb,0);select public.business_services_publish("+','.join(map(lit,[bid,'preview',1]))+')')
  path='/preview/account/customer.php?slug=access-one' 
  def request(path,method='GET',data=None):
   req=urllib.request.Request(self.url+path,method=method,data=data)
   try:r=self.client.open(req)
   except urllib.error.HTTPError as e:r=e
   return r.code,r.headers,r.read().decode()
  before=self.sql("select md5(string_agg(to_jsonb(t)::text,'' order by id)) from public.businesses t")
  status,h,html=request(path)
  self.assertEqual(status,200);self.assertIn('Customer help',html);self.assertIn('First Service Business',html)
  self.assertNotIn('type="password"',html);self.assertNotIn('<form',html);self.assertNotIn('Sign in',html)
  self.assertIn('do not need a customer account',html);self.assertIn('pending until the business confirms',html)
  self.assertIn('no-store',h['Cache-Control']);self.assertIn('noindex',h['X-Robots-Tag']);self.assertEqual(h['Referrer-Policy'],'no-referrer');self.assertIsNone(h.get('Set-Cookie'))
  for method in ['POST','PUT','DELETE']:
   status,h,body=request(path,method,b'email=a%40example.test&password=ignored');self.assertEqual(status,405);self.assertIsNone(h.get('Set-Cookie'))
  self.assertEqual(json.loads(request(path+'&mode=header')[2]),dict(authenticated=False))
  for slug in ['unknown','../bad','access-one%2F..','']:
   self.assertEqual(request('/preview/account/customer.php?slug='+slug)[0],404)
  self.assertEqual(request('/account/customer-help.php')[0],403)
  for ret in ['https://evil.example','//evil.example','booking-bad','javascript:alert(1)']:
   html=request(path+'&return='+urllib.parse.quote(ret,safe=''))[2];self.assertIn('href="'+self.url+'/preview/b/access-one"',html);self.assertNotIn('evil.example',html)
  for step in ['service','details','schedule','contact','review']:
   html=request(path+'&return=booking-'+step)[2];self.assertIn('?booking=1&amp;step='+step,html)
  self.sql("update request_private.ingress set enabled=false where environment='preview'")
  html=request(path+'&return=booking-details')[2];self.assertIn('Online booking requests are currently unavailable',html);self.assertNotIn('You can request a booking as a guest',html);self.assertNotIn('>Request a booking</a>',html);self.assertIn('/contact#enquire',html)
  self.sql("update request_private.ingress set enabled=true where environment='preview'")
  # Owner authentication grants no additional help data and is not consumed or changed.
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  html=request(path)[2];self.assertNotIn('PRIVATE-ACCOUNT',html);self.assertEqual(json.loads(request(path+'&mode=header')[2]),dict(authenticated=False))
  self.assertTrue(json.loads(request('/preview/account/header-session.php')[2])['authenticated'])
  html=request('/preview/account/customer.php?slug=access-two')[2];self.assertIn('Second Service Business',html);self.assertNotIn('First Service Business',html)
  page=request('/preview/b/access-one')[2];self.assertIn('Customer help',page);self.assertNotIn('data-header-session=',page);self.assertNotIn('>Sign in</a>',page)
  booking=request('/preview/b/access-one?booking=1')[2];self.assertIn('data-customer-help',booking);self.assertIn('Booking progress',booking);self.assertNotIn('data-header-session=',booking)
  self.assertEqual(before,self.sql("select md5(string_agg(to_jsonb(t)::text,'' order by id)) from public.businesses t"))
  # Secure document endpoints retain single-token access and never enumerate by customer or ID.
  router=self.private/'profiles/router.php';router.write_text(router.read_text().replace("if(preg_match('~^/((?:preview/)?b)","if(preg_match('~^/preview/(quote|invoice)/index\\\\.php$~',$path,$m)){$_SERVER['SCRIPT_NAME']=$path;require $root.'/'.$m[1].'/index.php';return true;}if(preg_match('~^/((?:preview/)?b)"))
  doc=dict(name='Fictional Link Customer',email='private@example.test',phone='',notes='Agreed scope',currency='ZAR',items=[dict(name='Assessment',quantity=1,price=25000)])
  import uuid,datetime
  qid=str(uuid.uuid4());iid=str(uuid.uuid4());due=(datetime.date.today()+datetime.timedelta(days=14)).isoformat()
  self.scope(a,'select public.business_quote_write('+','.join(map(lit,[bid,'preview',qid,0,'save']))+','+lit(json.dumps(doc))+'::jsonb,'+lit(due)+');select public.business_quote_send('+','.join(map(lit,[bid,'preview',qid,1,False]))+')')
  self.scope(a,'select public.business_invoice_write('+','.join(map(lit,[bid,'preview',iid,0,'save']))+','+lit(json.dumps(doc))+'::jsonb,'+lit(due)+');select public.business_invoice_write('+','.join(map(lit,[bid,'preview',iid,1,'issue']))+')')
  for kind,rid in [('quote',qid),('invoice',iid)]:
   token=self.scope(a,'select share_token from public.business_'+('quotes' if kind=='quote' else 'invoices')+' where id='+lit(rid))
   status,h,html=request('/preview/'+kind+'/index.php?token='+token);self.assertEqual(status,200,html);self.assertEqual(h['Referrer-Policy'],'no-referrer');self.assertIn('No account needed',html);self.assertIn('Fictional Link Customer',html)
   for query in ['id='+rid,'token='+'f'*64,'email=private@example.test','token[]=bad']:
    self.assertEqual(request('/preview/'+kind+'/index.php?'+query)[0],404)
   self.assertEqual(self.scope(b,'select count(*) from public.business_'+('quotes' if kind=='quote' else 'invoices')),'0')
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Access('test_secure_links')]));raise SystemExit(not r.wasSuccessful())
