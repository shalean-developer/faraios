"""Booking PHP/HTTP journeys with native PostgreSQL permissions; Auth/REST transports simulated."""
from profiles import Profiles
from journey import lit
from concurrent.futures import ThreadPoolExecutor
import json,unittest,sys,uuid
from datetime import datetime,timezone
class Bookings(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling']
 def test_bookings(self):
  a,b=self.ids;bid=self.bids[0]
  self.sql("update booking_private.ingress set enabled=true where environment='live';update quote_private.ingress set enabled=true where environment='live'")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/account/bookings.php?new=1'
  data=dict(time_zone='Africa/Johannesburg',currency='ZAR',version=0,name='Fictional Booking',email='book@example.test',phone='',notes='<script>test</script>',item_name_0='Standard clean',quantity_0='2',price_0='505.25',address='10 Example Road, Testville',date='2026-11-20',time='08:30',duration='120')
  self.assertIn('valid date',self.post(path,**(data|{'date':'2026-02-30'})))
  self.assertIn('service address',self.post(path,**(data|{'address':'x'})))
  self.assertIn('duration',self.post(path,**(data|{'duration':'0'})))
  self.assertIn('item prices',self.post(path,**(data|{'price_0':'1.234'})))
  html=self.post(path,**data);self.assertIn('Booking saved',html);self.assertIn('ZAR 1,010.50',html);self.assertIn('08:30 – 10:30',html);self.assertIn('&lt;script&gt;',html)
  r=json.loads(self.scope(a,'select to_jsonb(r) from public.business_bookings r'));rid=r['id'];detail='/account/bookings.php?id='+rid
  self.assertEqual(datetime.fromisoformat(r['starts_at']).astimezone(timezone.utc).isoformat(),'2026-11-20T06:30:00+00:00')
  self.assertIn('10 Example Road',self.get(detail)[1]);self.assertIn('Fictional Booking',self.get('/account/bookings.php?view=calendar&month=2026-11')[1]);self.assertNotIn('Fictional Booking',self.get('/account/bookings.php?view=calendar&month=2026-12')[1])
  # Persist all statuses, reschedule and protect stale forms.
  for i,status in enumerate(['In Progress','Completed','Cancelled','Scheduled']):
   html=self.post(detail,**(data|dict(id=rid,version=i+1,status=status,time='09:00')));self.assertIn('Booking saved',html)
   self.assertEqual(self.scope(a,'select status from public.business_bookings'),status)
   self.assertIn('Fictional Booking',self.get('/account/bookings.php?status='+status.replace(' ','%20'))[1])
  self.assertIn('changed or unavailable',self.post(detail,**(data|dict(id=rid,version=1))))
  for sql in ['set role anon;select * from public.business_bookings','set role authenticated;insert into public.business_bookings default values',"set role authenticated;update public.business_bookings set status='Completed'",'set role anon;select public.business_booking_write(null,null,null,null,null,null,null,null,null,null,null)']:
   with self.assertRaises(RuntimeError):self.sql(sql)
  def write(uid,**kw):
   args=dict(p_business=bid,p_environment='live',p_id=rid,p_version=5,p_quote=None,p_document=r['document'],p_address='10 Example Road',p_local='2026-11-21 08:00',p_zone='Africa/Johannesburg',p_duration=60,p_status='Scheduled')|kw
   return self.scope(uid,'select public.business_booking_write('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k=='p_document' else lit(v)) for k,v in args.items())+')')
  with self.assertRaises(RuntimeError):write(b)
  with self.assertRaises(RuntimeError):write(a,p_environment='preview')
  with self.assertRaises(RuntimeError):write(a,p_zone='UTC')
  with self.assertRaises(RuntimeError):write(a,p_document=r['document']|{'currency':'USD'})
  self.assertEqual(self.scope(b,'select count(*) from public.business_bookings'),'0')
  # Existing bookings retain original zone/currency after business settings change.
  self.sql("update public.businesses set time_zone='America/New_York' where id="+lit(bid))
  self.assertIn('Africa/Johannesburg',self.get(detail)[1]);write(a)
  # DST gaps and ambiguity rejected at the DB boundary; valid local time roundtrips.
  for value in ['2027-03-14 02:30','2026-11-01 01:30']:
   with self.assertRaises(RuntimeError):self.sql('select booking_private.instant('+lit(value)+",'America/New_York')")
  self.assertEqual(self.sql("select booking_private.instant('2026-11-20 08:30','America/New_York') at time zone 'UTC'"),'2026-11-20 13:30:00')
  self.sql("update public.businesses set time_zone='Africa/Johannesburg' where id="+lit(bid))
  # Accepted quote conversion is authoritative and unique, including simultaneous saves.
  qid=str(uuid.uuid4());doc=r['document']|{'currency':'USD'}
  self.sql('insert into public.business_quotes(id,business_id,environment,document,expires_on,status,share_token,sent_at,sender) values('+','.join([lit(qid),lit(bid),"'live'",lit(json.dumps(doc))+'::jsonb',"'2026-12-01'","'Accepted'",lit('a'*64),'now()',"'{\"time_zone\":\"Africa/Johannesburg\"}'::jsonb"])+')')
  conv=path+'&quote='+qid;self.assertIn('USD 1,010.50',self.get(conv)[1]);self.assertNotIn('name="price_0"',self.get(conv)[1])
  self.assertIn('Booking saved',self.post(conv,**dict(time_zone='Africa/Johannesburg',currency='USD',version=0,quote=qid,address='20 Fictional Road',date='2026-11-23',time='10:00',duration=90)))
  linked=json.loads(self.scope(a,'select to_jsonb(r) from public.business_bookings r where quote_id='+lit(qid)));self.assertEqual(linked['document'],doc)
  self.assertIn('Booking '+linked['id'][:8].upper(),self.get(conv)[1]);self.assertEqual(self.scope(a,'select count(*) from public.business_bookings where quote_id='+lit(qid)),'1')
  with self.assertRaises(RuntimeError):write(a,p_id=str(uuid.uuid4()),p_version=0,p_quote=qid)
  self.assertEqual(self.scope(a,'select status from public.business_quotes where id='+lit(qid)),'Accepted')
  # Cancelled quote bookings also remain the only conversion.
  write(a,p_id=linked['id'],p_version=1,p_quote=qid,p_status='Cancelled',p_document=r['document'])
  with self.assertRaises(RuntimeError):write(a,p_id=str(uuid.uuid4()),p_version=0,p_quote=qid)
  # Non-accepted and foreign quote conversion denied.
  self.sql("update public.business_quotes set status='Declined' where id="+lit(qid))
  with self.assertRaises(RuntimeError):write(a,p_id=str(uuid.uuid4()),p_version=0,p_quote=qid)
  self.sql("update public.business_quotes set status='Accepted' where id="+lit(qid))
  qid2=str(uuid.uuid4());self.sql('insert into public.business_quotes select '+lit(qid2)+',business_id,environment,enquiry_id,document,expires_on,status,version,'+lit('b'*64)+',sender,created_at,sent_at,responded_at from public.business_quotes where id='+lit(qid))
  def attempt(_):
   try:write(a,p_id=str(uuid.uuid4()),p_version=0,p_quote=qid2);return True
   except RuntimeError:return False
  with ThreadPoolExecutor(max_workers=2) as pool:self.assertEqual(sum(pool.map(attempt,range(2))),1)
  self.assertEqual(self.scope(a,'select count(*) from public.business_bookings where quote_id='+lit(qid2)),'1')
  from pathlib import Path
  self.assertIn('PASS:',self.sql((Path(__file__).parent/'bookings-hosted.sql').read_text()))
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password')
  self.assertNotIn('Fictional Booking',self.get('/account/bookings.php')[1]);self.assertIn('unavailable',self.get(detail)[1]);self.assertIn('accepted quote',self.get(conv)[1]);self.assertEqual(self.get('/account/bookings-core.php')[0],403)
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Bookings('test_bookings')]));sys.exit(not r.wasSuccessful())
