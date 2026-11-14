"""Native queue/authorization/retry tests; no real recipients or provider calls."""
from profiles import Profiles
from journey import lit
import unittest,json,uuid,subprocess,os
class Notifications(Profiles):
 def test_queue(self):
  self.sql("alter table auth.users add column email text;alter table auth.users add column email_confirmed_at timestamptz")
  a,b=self.ids;bid=self.bids[0];self.sql(f"update auth.users set email='owner@example.test',email_confirmed_at=now() where id='{a}'")
  d=dict(name='Demo business',description='Public cleaning information',email='public@example.test',phone='',website='',areas='Cape Town',hours=[None]*7,logo=None)
  self.scope(a,f"select public.business_profile_save('{bid}','preview','mail-demo',"+lit(json.dumps(d))+"::jsonb,0)");self.scope(a,f"select public.business_profile_publish('{bid}','preview',1)")
  def submit(email='customer@example.test',request=None):
   args=dict(p_environment='preview',p_slug='mail-demo',p_service='',p_name='Customer <script>',p_email=email,p_phone='0601234567',p_requirements='Please help <script>alert(1)</script>',p_request=request or str(uuid.uuid4()))
   self.sql('set role anon;select public.business_enquiry_submit('+','.join(k+'=>'+lit(v) for k,v in args.items())+')');return args
  submit();self.assertEqual(self.sql('select count(*) from enquiry_private.mail_outbox'),'0')
  self.sql("update enquiry_private.mail_settings set enabled=true where environment='preview'")
  request=str(uuid.uuid4());submit(request=request);submit(request=request)
  self.assertEqual(self.sql('select count(*) from enquiry_private.mail_outbox'),'2')
  self.assertEqual(self.sql("select recipient from enquiry_private.mail_outbox where kind='admin'"),'owner@example.test')
  customer=json.loads(self.sql("select payload from enquiry_private.mail_outbox where kind='customer'"));self.assertNotIn('requirements',customer);self.assertNotIn('customer',customer)
  for role in ['anon','authenticated']:
   with self.assertRaises(RuntimeError):self.sql('set role '+role+';select * from enquiry_private.mail_outbox')
   with self.assertRaises(RuntimeError):self.sql("set role "+role+";select public.business_enquiry_mail_claim('preview')")
  eid=self.sql("select enquiry_id from enquiry_private.mail_outbox limit 1")
  self.assertIn('pending',self.scope(a,f"select public.business_enquiry_mail_status('{bid}','preview','{eid}')"))
  with self.assertRaises(RuntimeError):self.scope(b,f"select public.business_enquiry_mail_status('{bid}','preview','{eid}')")
  self.assertEqual(self.sql("set role service_role;select public.business_enquiry_mail_claim('live')"),'{}')
  def claim():return json.loads(self.sql("set role service_role;select public.business_enquiry_mail_claim('preview')"))
  j=claim();j2=claim();self.assertNotEqual(j['id'],j2['id']);self.assertEqual(claim(),{})
  self.sql(f"set role service_role;select public.business_enquiry_mail_finish('{j['id']}','{j['lease']}','provider-example',false,'')")
  with self.assertRaises(RuntimeError):self.sql(f"set role service_role;select public.business_enquiry_mail_finish('{j['id']}','{j['lease']}','provider-example',false,'')")
  self.sql(f"set role service_role;select public.business_enquiry_mail_finish('{j2['id']}','{j2['lease']}','',true,'Temporary provider failure')")
  self.assertEqual(claim(),{});self.sql("update enquiry_private.mail_outbox set available_at=now()-interval '1 minute' where status='pending'");retried=claim();self.assertEqual(retried['id'],j2['id'])
  self.sql("update enquiry_private.mail_outbox set first_attempt_at=now()-interval '21 hours' where status='sending'");self.assertEqual(claim(),{});self.assertEqual(self.sql("select status from enquiry_private.mail_outbox where id="+lit(j2['id'])),'failed')
  submit(email='');self.assertEqual(self.sql('select count(*) from enquiry_private.mail_outbox'),'3')
  self.sql(f"update auth.users set email_confirmed_at=null where id='{a}'");submit(email='');self.assertEqual(self.sql('select count(*) from enquiry_private.mail_outbox'),'3')
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Notifications('test_queue')]));raise SystemExit(not result.wasSuccessful())
