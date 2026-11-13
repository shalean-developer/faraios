"""Customer HTTP journeys, native PostgreSQL permissions and snapshot preservation. Auth/REST simulated."""
from profiles import Profiles
from journey import lit
import json,re,uuid,unittest,sys
from concurrent.futures import ThreadPoolExecutor
class Customers(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles']
 def test_customers(self):
  a,b=self.ids;bid=self.bids[0]
  self.sql("update customer_private.ingress set enabled=true where environment='live';update quote_private.ingress set enabled=true where environment='live';update booking_private.ingress set enabled=true where environment='live'")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  self.assertIn('Customers',self.get('/account/index.php?page=welcome')[1])
  path='/account/customers.php?new=1';html=self.get(path)[1];cid=re.search('name="id" value="([^"]+)"',html)[1]
  data=dict(action='save',id=cid,version=0,name='Fictional Customer',email='client@example.test',phone='+27 (82) 555-0143',address='10 Fictional Road',notes='Private <script>note</script>')
  for change in [dict(name='x'),dict(phone='x'),dict(email='invalid'),dict(address='a'*1001),dict(notes='a'*2001)]:
   self.assertNotIn('Customer saved',self.post(path,**(data|change)))
  self.assertIn('Customer saved',self.post(path,**data));detail='/account/customers.php?id='+cid
  self.assertIn('&lt;script&gt;',self.get(detail)[1]);self.assertIn('client@example.test',self.get(detail)[1])
  for query in ['fictional','CLIENT@EXAMPLE.TEST','082555','825550143']:
   text=self.get('/account/customers.php?search='+query)[1]
   if query!='082555':self.assertIn('Fictional Customer',text)
  self.assertNotIn('Fictional Customer',self.get('/account/customers.php?search=zzzz')[1])
  self.assertIn('changed or unavailable',self.post(path,**data));self.assertEqual(self.scope(a,'select count(*) from public.business_customers'),'1')
  # New separate profile warns for normalized email, name or phone and requires explicit override.
  dupid=str(uuid.uuid4());dup=data|dict(id=dupid,name='Different Name',email='CLIENT@EXAMPLE.TEST',phone='')
  self.assertIn('Possible duplicate',self.post(path,**dup));self.assertEqual(self.scope(a,'select count(*) from public.business_customers'),'1')
  self.assertIn('Customer saved',self.post(path,**(dup|dict(confirm_duplicate='yes'))))
  # Prepare new quote by selecting profile; private notes never enter agreement.
  qpath='/account/quotes.php?new=1&customer='+cid;qhtml=self.get(qpath)[1];self.assertIn('client@example.test',qhtml);self.assertNotIn('Private &lt;script&gt;',qhtml)
  qid=re.search('name="id" value="([^"]+)"',qhtml)[1]
  qdata=dict(action='save',id=qid,version=0,customer=cid,name='Fictional Customer',email='client@example.test',phone='',notes='Agreement notes',expires_on='2026-12-01',item_name_0='Test service',quantity_0='2',price_0='505.25')
  self.assertIn('Draft saved',self.post(qpath,**qdata));self.assertEqual(self.scope(a,'select customer_id from public.business_quotes where id='+lit(qid)),cid)
  # Manual booking selection copies address; save links atomically.
  bpath='/account/bookings.php?new=1&customer='+cid;bhtml=self.get(bpath)[1];self.assertIn('10 Fictional Road',bhtml);self.assertNotIn('Private &lt;script&gt;',bhtml)
  rid=re.search('name="id" value="([^"]+)"',bhtml)[1]
  bdata=qdata|dict(id=rid,version=0,time_zone='Africa/Johannesburg',currency='ZAR',address='10 Fictional Road',date='2026-11-28',time='08:30',duration=120)
  self.assertIn('Booking saved',self.post(bpath,**bdata));self.assertEqual(self.scope(a,'select customer_id from public.business_bookings where id='+lit(rid)),cid)
  before=self.sql("select jsonb_build_object('quote',(select document from public.business_quotes where id="+lit(qid)+"),'booking',(select to_jsonb(t)-'customer_id'-'version' from public.business_bookings t where id="+lit(rid)+'))')
  # Editing profile does not rewrite saved agreements or scheduling.
  self.assertIn('Customer saved',self.post(detail,**(data|dict(version=1,name='Updated Customer',address='90 New Profile Road',email='new@example.test'))))
  after=self.sql("select jsonb_build_object('quote',(select document from public.business_quotes where id="+lit(qid)+"),'booking',(select to_jsonb(t)-'customer_id'-'version' from public.business_bookings t where id="+lit(rid)+'))')
  self.assertEqual(before,after);self.assertIn(qid,self.get(detail)[1]);self.assertIn(rid,self.get(detail)[1]);self.assertIn('changed or unavailable',self.post(detail,**(data|dict(version=1))))
  # Customer actions denied for foreign owner, environment, anonymous claims and direct DML.
  def rpc(uid,name,**args):return self.scope(uid,'select public.business_customer_'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k in ['p_details','p_document'] else lit(v)) for k,v in args.items())+')')
  args=dict(p_business=bid,p_environment='live',p_id=cid,p_version=2,p_details=data|{})
  args['p_details']={k:data[k] for k in ['name','email','phone','address','notes']};args['p_confirm']=False
  with self.assertRaises(RuntimeError):rpc(b,'write',**args)
  with self.assertRaises(RuntimeError):rpc(a,'write',**(args|dict(p_environment='preview')))
  self.assertEqual(self.scope(b,'select count(*) from public.business_customers'),'0')
  for query in ['set role anon;select * from public.business_customers','set role authenticated;update public.business_customers set version=99','set role authenticated;insert into public.business_customers default values','set role anon;select public.business_customer_search(null,null,null,null)']:
   with self.assertRaises(RuntimeError):self.sql(query)
  # Explicit historical link changes association/version only; no name-based background linking.
  eid=str(uuid.uuid4());self.sql("insert into public.business_enquiries(id,business_id,environment,customer_name,email,phone,requirements,service_name,request_id,page_slug) values("+','.join([lit(eid),lit(bid),"'live'","'Updated Customer'","'other@example.test'","''","'Historical request'","''",lit(str(uuid.uuid4())),"'test-page'"])+')')
  self.assertNotIn(eid,self.get(detail)[1]);link='/account/customers.php?link_kind=enquiry&record='+eid
  self.assertIn('Historical request',self.get('/account/enquiries.php?id='+eid)[1]);self.assertIn('Link customer profile',self.get('/account/enquiries.php?id='+eid)[1])
  self.assertIn('Confirm this record',self.post(link,action='link',customer=cid,record_version=1))
  self.assertIn('Record linked',self.post(link,action='link',customer=cid,record_version=1,confirm_link='yes'));self.assertIn(eid,self.get(detail)[1]);self.assertEqual(self.scope(a,'select requirements from public.business_enquiries where id='+lit(eid)),'Historical request')
  # Link inheritance is by explicit ID through enquiry -> quote -> accepted booking.
  q2='/account/quotes.php?new=1&enquiry='+eid;q2html=self.get(q2)[1];qid2=re.search('name="id" value="([^"]+)"',q2html)[1]
  self.assertIn('Draft saved',self.post(q2,**(qdata|dict(id=qid2,enquiry=eid,customer=''))));self.assertEqual(self.scope(a,'select customer_id from public.business_quotes where id='+lit(qid2)),cid)
  self.sql("update public.business_quotes set status='Accepted',share_token=repeat('e',64),sent_at=now(),sender='{\"time_zone\":\"Africa/Johannesburg\"}' where id="+lit(qid2))
  bp='/account/bookings.php?new=1&quote='+qid2;bh=self.get(bp)[1];rid2=re.search('name="id" value="([^"]+)"',bh)[1]
  self.assertIn('Booking saved',self.post(bp,**(bdata|dict(id=rid2,quote=qid2,customer=''))));self.assertEqual(self.scope(a,'select customer_id from public.business_bookings where id='+lit(rid2)),cid)
  # Foreign profile cannot be selected or linked, even with crafted identifiers.
  foreign=str(uuid.uuid4());self.sql('insert into public.business_customers(id,business_id,environment,details) values('+','.join([lit(foreign),lit(self.bids[1]),"'live'",lit(json.dumps(args['p_details']))+'::jsonb'])+')')
  self.assertIn('Customer unavailable',self.get('/account/quotes.php?new=1&customer='+foreign)[1])
  with self.assertRaises(RuntimeError):rpc(a,'link',p_business=bid,p_environment='live',p_customer=foreign,p_kind='booking',p_record=rid,p_version=1)
  # Concurrent matching creates serialize; second receives duplicates and does not save.
  nd=args['p_details']|dict(name='Concurrent unique',email='parallel@example.test',phone='')
  def create(_):return json.loads(rpc(a,'write',p_business=bid,p_environment='live',p_id=str(uuid.uuid4()),p_version=0,p_details=nd,p_confirm=False))
  with ThreadPoolExecutor(max_workers=2) as pool:results=list(pool.map(create,range(2)))
  self.assertEqual(sum('id' in r for r in results),1);self.assertEqual(sum('duplicates' in r for r in results),1)
  from pathlib import Path
  self.assertIn('PASS:',self.sql((Path(__file__).parent/'customers-hosted.sql').read_text()))
  self.assertEqual(self.get('/account/customers-core.php')[0],403)
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password')
  self.assertNotIn('Updated Customer',self.get('/account/customers.php')[1]);self.assertIn('Customer unavailable',self.get(detail)[1])
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Customers('test_customers')]));sys.exit(not r.wasSuccessful())
