"""Native PG17 snapshot arithmetic, boundaries, authorization and real PHP requests.
All fixtures are disposable. No hosted writes or outbound provider operations.
"""
from profiles import Profiles
from journey import lit,ROOT
import json,uuid,unittest,sys,re
class Dashboard(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment','invoices_payments','dashboard_overview','dashboard_live_intake']
 def call(self,owner=None,env='live',bid=None,month='2026-11-01'):
  return json.loads(self.scope(owner or self.ids[0],f"select public.business_dashboard({lit(bid or self.bids[0])},{lit(env)},{lit(month)}::date)"))
 def doc(self,name='Fictional Client',currency='ZAR',price=10000):return dict(name=name,email='client@example.test',phone='',notes='',currency=currency,items=[dict(name='Clean',quantity=1,price=price)])
 def invoice(self,state='Issued',currency='ZAR',due='2026-11-13',env='live',bid=None):
  i=str(uuid.uuid4());bid=bid or self.bids[0]
  self.sql('insert into public.business_invoices(id,business_id,environment,document,due_on,state,number,share_token,issued_at) values('+','.join([lit(i),lit(bid),lit(env),lit(json.dumps(self.doc(currency=currency)))+'::jsonb',lit(due),lit(state),lit(None if state=='Draft' else 'TEST-'+i),lit(None if state=='Draft' else i.replace('-','')*2),'null' if state=='Draft' else 'now()'])+')')
  return i
 def payment(self,i,amount,date,reversal=None):
  p=str(uuid.uuid4());self.sql('insert into public.business_invoice_payments(id,invoice_id,business_id,environment,amount,paid_on,reference,created_by,reversal_of) values('+','.join(map(lit,[p,i,self.bids[0],'live',amount,date,'TEST '+p,self.ids[0],reversal]))+')');return p
 def booking(self,start,duration=60,status='Scheduled',env='live'):
  i=str(uuid.uuid4());self.sql('insert into public.business_bookings(id,business_id,environment,document,address,starts_at,time_zone,duration_minutes,status) values('+','.join([lit(i),lit(self.bids[0]),lit(env),lit(json.dumps(self.doc()))+'::jsonb',lit('Fictional address'),lit(start),lit('Africa/Johannesburg'),str(duration),lit(status)])+')');return i
 def freeze(self,at):
  # Test-only function clock substitution, never committed/applied to hosted source.
  source=next((ROOT/'supabase/migrations').glob('*dashboard_overview.sql')).read_text();body=source[source.index('create function public.business_dashboard'):source.index('revoke all on function public.business_dashboard')]
  self.sql(body.replace('create function','create or replace function',1).replace('now()',lit(at)+'::timestamptz'))
 def test_dashboard(self):
  a,b=self.ids;bid=self.bids[0];self.freeze('2026-11-13 22:30+00') # local Nov 14, UTC Nov 13
  empty=self.call();self.assertEqual(empty['today'],'2026-11-14');self.assertEqual(empty['bookings_count'],0);self.assertEqual(empty['money'][0]['net'],0)
  before=self.booking('2026-11-13 22:00+00') # midnight local inclusive
  overlap=self.booking('2026-11-13 21:30+00',60) # carryover included
  self.booking('2026-11-13 21:00+00',60) # ends exactly midnight excluded
  self.booking('2026-11-14 22:00+00') # next midnight excluded
  self.booking('2026-11-14 08:00+00',status='Cancelled')
  self.booking('2026-11-14 08:00+00',env='preview')
  self.booking('2026-11-14 08:00+00',status='Completed')
  for n in ['Fictional Alex','Fictional Sam']:
   s=str(uuid.uuid4())
   self.sql('insert into public.business_staff(id,business_id,environment,name,email,phone,active) values('+','.join(map(lit,[s,bid,'live',n,'','',True]))+')')
   self.sql('insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) values('+','.join(map(lit,[before,s,bid,'live']))+')')
  i1=self.invoice(due='2026-11-13');i2=self.invoice(due='2026-11-14');i3=self.invoice(due='2026-11-15');paid=self.invoice();void=self.invoice(state='Void');self.invoice(state='Draft');usd=self.invoice(currency='USD');self.invoice(env='preview');self.invoice(bid=self.bids[1])
  self.payment(i2,2500,'2026-11-01');self.payment(paid,10000,'2026-11-30');p=self.payment(void,5000,'2026-11-13');self.payment(void,5000,'2026-11-13',p)
  self.payment(i3,1000,'2026-10-31');p=self.payment(i3,2000,'2026-11-01');self.payment(i3,2000,'2026-11-01',p)
  # 30+ bookings prove counts aren't limited to displayed rows or PostgREST pagination.
  for _ in range(30):self.booking('2026-11-14 10:00+00')
  for status,expiry in [('Sent','2026-11-13'),('Sent','2026-11-14'),('Accepted','2026-11-20'),('Draft','2026-11-20')]:
   q=str(uuid.uuid4());self.sql('insert into public.business_quotes(id,business_id,environment,document,expires_on,status,share_token,sent_at,sender) values('+','.join([lit(q),lit(bid),lit('live'),lit(json.dumps(self.doc()))+'::jsonb',lit(expiry),lit(status),lit(None if status=='Draft' else q.replace('-','')*2),'null' if status=='Draft' else 'now()',lit('{"time_zone":"UTC"}')+'::jsonb'])+')')
  d=self.call();self.assertEqual(d['bookings_count'],33);self.assertEqual(len(d['bookings']),8);self.assertEqual(len(next(x for x in d['bookings'] if x['id']==before)['assigned_staff']),2)
  self.assertEqual(d['awaiting_quotes'],1);self.assertEqual((d['unpaid'],d['part_paid'],d['overdue_count']),(2,2,2))
  m={x['currency']:x for x in d['money']};self.assertEqual((m['ZAR']['outstanding'],m['ZAR']['overdue']),(26500,10000));self.assertEqual((m['ZAR']['receipts'],m['ZAR']['reversals'],m['ZAR']['net']),(19500,7000,12500));self.assertEqual(m['USD']['outstanding'],10000)
  self.assertEqual({x['currency']:x['net'] for x in self.call(month='2026-10-01')['money']}['ZAR'],1000)
  self.assertEqual({x['currency']:x['net'] for x in self.call(month='2026-12-01')['money']}['ZAR'],0)
  # Cross-tenant, anonymous JWT, SQL role and environment denial; no direct enquiry writes.
  self.assertEqual(self.call(owner=b,bid=self.bids[1])['bookings_count'],0)
  with self.assertRaises(RuntimeError):self.call(owner=b,bid=bid)
  for query in [f"set role anon;select public.business_dashboard('{bid}','live')",f"set role authenticated;set request.jwt.claim.sub='{a}';set request.jwt.claims='{{\"is_anonymous\":true}}';select public.business_dashboard('{bid}','live')"]:
   with self.assertRaises(RuntimeError):self.sql(query)
  with self.assertRaises(RuntimeError):self.call(env='bad')
  with self.assertRaises(RuntimeError):self.call(month='1999-01-01')
  # Real private manual intake: idempotent and cannot change/steal a submission.
  eid=str(uuid.uuid4());args=[bid,'preview',eid,'Fictional Phone Client','client@example.test','','Please quote a deep clean']
  query='select public.business_enquiry_create('+','.join(map(lit,args))+')';self.scope(a,query);self.scope(a,query)
  self.assertEqual(self.call(env='preview')['new_enquiries'],1)
  with self.assertRaises(RuntimeError):self.scope(b,query)
  with self.assertRaises(RuntimeError):self.scope(a,query.replace('deep clean','changed clean'))
  with self.assertRaises(RuntimeError):self.scope(a,query.replace("'preview'","'invalid'"))
  with self.assertRaises(RuntimeError):self.scope(a,'insert into public.business_enquiries(id) values(gen_random_uuid())')
  # DST 23-hour and 25-hour days, half-open overlap boundaries.
  self.sql("update public.businesses set time_zone='America/New_York' where id="+lit(bid))
  self.freeze('2026-03-08 12:00+00');self.booking('2026-03-08 05:00+00');self.booking('2026-03-09 04:00+00');self.booking('2026-03-08 04:00+00')
  self.assertEqual(self.call()['bookings_count'],1)
  self.freeze('2026-11-01 12:00+00');self.booking('2026-11-01 04:00+00');self.booking('2026-11-02 05:00+00');self.booking('2026-11-01 06:30+00')
  self.assertEqual(self.call()['bookings_count'],2)
  self.freeze('2026-11-14 12:00+00');self.sql("update public.businesses set time_zone='Africa/Johannesburg' where id="+lit(bid))
  # Real PHP transport, XSS escaping, period validation, quick links and non-owner isolation.
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  html=self.get('/account/dashboard.php')[1];self.assertIn('265.00',html);self.assertIn('Fictional Alex',html);self.assertIn('enquiry-new.php',html);self.assertIn('As of',html)
  self.assertNotIn('265.00',self.get('/account/dashboard.php?month=garbage')[1]);self.assertIn('could not load',self.get('/account/dashboard.php?month=1999-01')[1])
  html=self.get('/account/enquiry-new.php')[1];eid=re.search('name="id" value="([^"]+)"',html)[1]
  # Local disposable live environment exercises the approved intake release.
  self.sql("update enquiry_private.ingress set enabled=true where environment='live'")
  saved=self.post('/account/enquiry-new.php',id=eid,name='Fictional HTTP Client',email='client@example.test',phone='',requirements='Please quote the fictional service')
  self.assertIn('Enquiry created. No notification sent.',saved)
  self.assertEqual(self.call()['new_enquiries'],1)
  self.sql("update enquiry_private.ingress set enabled=false where environment='live'")
  with self.assertRaises(RuntimeError):self.scope(a,query.replace("'preview'","'live'"))
  self.sql("update enquiry_private.ingress set enabled=true where environment='live'")
  self.sql("update public.business_bookings set document=jsonb_set(document,'{name}',to_jsonb('<script>alert(1)</script>'::text)) where id="+lit(before))
  html=self.get('/account/dashboard.php')[1];self.assertIn('&lt;script&gt;',html);self.assertNotIn('<script>alert',html)
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Fictional Alex',self.get('/account/dashboard.php')[1])
  # Fingerprint proves reads do not modify financial or booking records.
  fingerprint=self.sql("select md5(string_agg(row_to_json(t)::text,'' order by id)) from public.business_invoices t")
  for _ in range(3):self.call()
  self.assertEqual(fingerprint,self.sql("select md5(string_agg(row_to_json(t)::text,'' order by id)) from public.business_invoices t"))
if __name__=='__main__':
 r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Dashboard('test_dashboard')]));sys.exit(not r.wasSuccessful())
