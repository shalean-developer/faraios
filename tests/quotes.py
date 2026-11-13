"""Real PHP lifecycle, native PG authorization and capability tests. Auth/REST are simulated."""
from profiles import Profiles
from journey import lit
import json,unittest,sys,uuid,re
class Quotes(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment']
 def test_quotes(self):
  a,b=self.ids;bid=self.bids[0]
  self.sql("update quote_private.ingress set enabled=true where environment='live'")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/quotes.php?new=1';data=dict(action='save',version=0,name='Fictional Customer',email='quote@example.test',phone='',notes='<script>test</script>',expires_on='2026-11-28',item_name_0='Standard clean',quantity_0='2',price_0='505.25')
  self.assertIn('customer name',self.post(path,**(data|{'name':'x'})))
  self.assertIn('item prices',self.post(path,**(data|{'price_0':'1.123'})))
  self.assertIn('whole quantity',self.post(path,**(data|{'quantity_0':'1.5'})))
  self.assertIn('valid expiry',self.post(path,**(data|{'expires_on':'2026-02-30'})))
  html=self.post(path,**data);self.assertIn('Draft saved',html);self.assertIn('ZAR 1,010.50',html)
  q=json.loads(self.scope(a,'select to_jsonb(q) from public.business_quotes q'));qid=q['id'];detail='/account/quotes.php?id='+qid
  self.assertIn('&lt;script&gt;',self.get(detail)[1]);self.assertIsNone(q['share_token'])
  self.assertEqual(self.scope(b,'select count(*) from public.business_quotes'),'0')
  for sql in ['set role anon;select * from public.business_quotes','set role anon;select * from public.business_quote_list',"set role authenticated;insert into public.business_quotes default values",f"set role authenticated;update public.business_quotes set status='Accepted'"]:
   with self.assertRaises(RuntimeError):self.sql(sql)
  def customer(token,response='',env='live'):
   return json.loads(self.sql('set role anon;select public.business_quote_customer('+','.join(map(lit,[env,token,response]))+')'))
  self.assertEqual(customer('0'*64),{})
  def write(uid,**kw):
   args=dict(p_business=bid,p_environment='live',p_id=qid,p_version=1,p_action='send',p_document=q['document'],p_expiry=q['expires_on'],p_enquiry=None)|kw
   return self.scope(uid,'select public.business_quote_write('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k=='p_document' else lit(v)) for k,v in args.items())+')')
  with self.assertRaises(RuntimeError):write(b)
  self.assertIn('Confirm the saved',self.post(detail,action='send',id=qid,version=1))
  self.assertIn('marked sent',self.post(detail,action='send',id=qid,version=1,confirm_send='on'))
  q=json.loads(self.scope(a,'select to_jsonb(q) from public.business_quotes q'));token=q['share_token'];self.assertEqual(len(token),64)
  self.assertEqual(customer(token,env='preview'),{})
  public='/quote/index.php?token='+token;html=self.get(public)[1];self.assertIn('Accept quote',html);self.assertNotIn('quote@example.test',html);self.assertNotIn(bid,html);self.assertNotIn('<script>test',html)
  for kw in [dict(p_action='save',p_version=2),dict(p_version=1)]:
   with self.assertRaises(RuntimeError):write(a,**kw)
  self.assertIn('has been accepted',self.post(public,response='Accepted',confirm_response='on'))
  self.assertEqual(customer(token)['status'],'Accepted');self.assertEqual(customer(token,'Accepted')['status'],'Accepted')
  with self.assertRaises(RuntimeError):customer(token,'Declined')
  self.assertIn('Accepted',self.get('/account/quotes.php?status=Accepted')[1]);self.assertNotIn('Fictional Customer',self.get('/account/quotes.php?status=Sent')[1])
  # New manual quote, decline, then expiry behavior from native clock.
  html=self.post(path,**data);self.assertIn('Draft saved',html)
  q2=json.loads(self.scope(a,"select to_jsonb(q) from public.business_quotes q where status='Draft'"));qid2=q2['id']
  write(a,p_id=qid2,p_version=1);q2=json.loads(self.scope(a,"select to_jsonb(q) from public.business_quotes q where id="+lit(qid2)));token2=q2['share_token']
  self.assertEqual(customer(token2,'Declined')['status'],'Declined')
  self.sql("update public.business_quotes set status='Sent',expires_on=current_date-1 where id="+lit(qid2))
  self.assertEqual(customer(token2)['status'],'Expired')
  with self.assertRaises(RuntimeError):customer(token2,'Accepted')
  self.assertIn('Expired',self.get('/account/quotes.php?status=Expired')[1]);self.assertNotIn('Accept quote',self.get('/quote/index.php?token='+token2)[1])
  # Cross-business enquiry link rejected, same-business enquiry prefill retained without status mutation.
  self.sql("insert into public.business_enquiries(business_id,environment,request_id,page_slug,customer_name,email,phone,requirements) values("+lit(bid)+",'live',gen_random_uuid(),'fixture','Enquiry Customer','enquiry@example.test','','Please clean my office.')")
  eid=self.scope(a,'select id from public.business_enquiries');epath=path+'&enquiry='+eid
  self.assertIn('Enquiry Customer',self.get(epath)[1]);html=self.post(epath,**(data|{'name':'Enquiry Customer'}));self.assertIn('Draft saved',html)
  self.assertEqual(self.scope(a,'select status from public.business_enquiries'),'New')
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password')
  self.assertNotIn('Fictional Customer',self.get('/account/quotes.php')[1]);self.assertIn('unavailable',self.get(detail)[1]);self.assertIn('unavailable',self.get(epath)[1])
  self.assertEqual(self.get('/account/quotes-core.php')[0],403)
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Quotes('test_quotes')]));sys.exit(not r.wasSuccessful())
