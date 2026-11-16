"""Native PostgreSQL roles and real PHP HTTP; simulated Auth/PostgREST transport."""
from profiles import Profiles
from journey import lit
import json,re,uuid,unittest,sys
class Staff(Profiles):
 extra_migrations=['customer_enquiries','customer_quotes','bookings_scheduling','customer_profiles','staff_booking_assignment']
 def rpc(self,uid,name,**args):
  return self.scope(uid,'select public.business_staff_'+name+'('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb' if k=='p_staff' else lit(v)) for k,v in args.items())+')')
 def test_staff(self):
  a,b=self.ids;bid=self.bids[0];env='live';self.sql("update staff_private.ingress set enabled=true where environment='live';update booking_private.ingress set enabled=true where environment='live'")
  self.post('/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  self.assertIn('No staff yet',self.get('/account/staff.php')[1]);ids=[]
  for name in ['Fictional Alex','Fictional Bea']:
   html=self.get('/account/staff.php?new=1')[1];sid=re.search('name="id" value="([^"]+)"',html)[1];ids.append(sid)
   self.assertIn('Check staff details',self.post('/account/staff.php?new=1',id=sid,version=0,name='A',email='',phone='',active='on'))
   self.assertIn('Staff saved',self.post('/account/staff.php?new=1',id=sid,version=0,name=name,email='staff@example.test',phone='+27 82 555 0141',active='on'))
  doc={'name':'Fictional Client','email':'client@example.test','phone':'','notes':'Saved agreement','currency':'ZAR','items':[{'name':'Clean','quantity':1,'price':50500}]}
  bookings=[]
  for local,duration in [('2026-11-30 23:30',120),('2026-12-01 00:30',60),('2026-12-01 01:30',60)]:
   rid=str(uuid.uuid4());bookings.append(rid)
   self.scope(a,'select public.business_booking_write('+','.join([lit(bid),lit(env),lit(rid),'0','null',lit(json.dumps(doc))+'::jsonb',lit('1 Fictional Test Road'),lit(local)+'::timestamp',lit('Africa/Johannesburg'),str(duration),lit('Scheduled')])+')')
  rid,over,touch=bookings;path='/account/bookings.php?id='+rid
  before=self.sql('select to_jsonb(t)-\'assignment_version\' from public.business_bookings t where id='+lit(rid))
  self.assertIn('Assignments saved',self.post(path,action='assign',id=rid,assignment_version=0,**{'staff_ids[]':ids[0]}))
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=1,p_staff=ids)
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=over,p_version=0,p_staff=[ids[0]])
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=touch,p_version=0,p_staff=[ids[0]])
  html=self.get(path)[1];self.assertIn('Fictional Bea',html);self.assertIn('Overlapping assignments',html);self.assertIn(over,html)
  self.assertEqual(before,self.sql('select to_jsonb(t)-\'assignment_version\' from public.business_bookings t where id='+lit(rid)))
  for view in ['', '&view=calendar&month=2026-12']:
   html=self.get('/account/bookings.php?staff='+ids[0]+view)[1];self.assertIn('Fictional Alex',html);self.assertIn('Overlap',html)
  # Half-open intervals: touching endpoints have no overlap.
  self.assertEqual(self.scope(a,'select conflicts from public.business_booking_schedule where id='+lit(touch)),'[]')
  failed=self.post(path,action='assign',id=rid,assignment_version=0)
  self.assertIn('changed or unavailable',failed)
  assignment=failed.split('<h2>Assigned staff</h2>',1)[1].split('</form>',1)[0]
  self.assertIn('name="assignment_version" value="0"',assignment)
  self.assertNotRegex(assignment,r'name="staff_ids\[\]"[^>]*checked')
  self.assertIn('Your unsaved assignment choices are retained',failed)
  current=self.sql('select to_jsonb(t) from public.business_booking_schedule t where id='+lit(rid))
  for _ in range(2):
   failed=self.post(path,action='assign',id=rid,assignment_version=1,**{'staff_ids[]':ids[0]})
   assignment=failed.split('<h2>Assigned staff</h2>',1)[1].split('</form>',1)[0]
   self.assertIn('changed or unavailable',failed)
   self.assertIn('name="assignment_version" value="1"',assignment)
   checked=re.findall(r'name="staff_ids\[\]" value="([^"]+)" checked',assignment)
   self.assertEqual(checked,[ids[0]])
   self.assertEqual(current,self.sql('select to_jsonb(t) from public.business_booking_schedule t where id='+lit(rid)))
  refreshed=self.get(path)[1].split('<h2>Assigned staff</h2>',1)[1].split('</form>',1)[0]
  self.assertIn('name="assignment_version" value="2"',refreshed)
  self.assertEqual(set(re.findall(r'name="staff_ids\[\]" value="([^"]+)" checked',refreshed)),set(ids))
  self.assertIn('name="item_name_0" list="services" maxlength="120" value="Clean"',failed)
  self.assertIn('name="quantity_0" type="number" min="1" max="9999" step="1" value="1"',failed)
  self.assertIn('name="price_0" inputmode="decimal" value="505.00"',failed)
  if __import__('os').environ.get('FARAIOS_MOBILE_BROWSER_CHECK')=='true':
   from playwright.sync_api import sync_playwright
   import os
   from pathlib import Path
   checks=[]
   with sync_playwright() as pw:
    browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage','--disable-gpu'])
    try:
     for width in [390,1280]:
      booking=str(uuid.uuid4())
      self.scope(a,'select public.business_booking_write('+','.join([lit(bid),lit(env),lit(booking),'0','null',lit(json.dumps(doc))+'::jsonb',lit('Synthetic stale browser'),lit('2026-12-20 09:00')+'::timestamp',lit('Africa/Johannesburg'),'60',lit('Scheduled')])+')')
      self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=booking,p_version=0,p_staff=[ids[0]])
      ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page();page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('a@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click()
      page.goto(self.url+'/account/bookings.php?id='+booking);form=page.locator('form').filter(has=page.locator('input[name="action"][value="assign"]'))
      form.locator('input[name="staff_ids[]"][value="'+ids[0]+'"]').uncheck();form.locator('input[name="staff_ids[]"][value="'+ids[1]+'"]').check()
      self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=booking,p_version=1,p_staff=ids)
      current=self.sql('select to_jsonb(t) from public.business_booking_schedule t where id='+lit(booking))
      form.get_by_role('button',name='Save assignments',exact=True).click();page.get_by_role('alert').filter(has_text='Assignments changed').wait_for()
      self.assertEqual(form.locator('input[name="assignment_version"]').input_value(),'1')
      self.assertFalse(form.locator('input[name="staff_ids[]"][value="'+ids[0]+'"]').is_checked());self.assertTrue(form.locator('input[name="staff_ids[]"][value="'+ids[1]+'"]').is_checked())
      self.assertEqual(current,self.sql('select to_jsonb(t) from public.business_booking_schedule t where id='+lit(booking)))
      self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
      page.get_by_role('heading',name='Assigned staff',exact=True).scroll_into_view_if_needed();out=Path(__file__).resolve().parents[1]/'test-results/release';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/('v1-004-owner-'+str(width)+'.png')))
      page.get_by_role('link',name='Reload and compare',exact=True).click();self.assertEqual(form.locator('input[name="assignment_version"]').input_value(),'2');self.assertEqual(form.locator('input[name="staff_ids[]"]:checked').count(),2)
      checks.append({'width':width,'stale_rejected':True,'choices_retained':True,'stale_token_retained':True,'saved_row_preserved':True,'reload_current':True});ctx.close()
    finally:browser.close()
   (out/'v1-004-browser.json').write_text(json.dumps({'status':'PASS','physical_phone':False,'checks':checks},indent=2))
  edit='/account/staff.php?id='+ids[0]
  self.assertIn('Staff saved',self.post(edit,id=ids[0],version=1,name='Fictional Alex Updated',email='',phone=''))
  self.assertIn('(inactive)',self.get('/account/bookings.php')[1]);self.assertIn('existing assignment',self.get(path)[1])
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=2,p_staff=ids)
  self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=3,p_staff=[])
  with self.assertRaises(RuntimeError):self.rpc(a,'assign',p_business=bid,p_environment=env,p_booking=rid,p_version=4,p_staff=[ids[0]])
  for owner,environment,member in [(b,env,ids[1]),(a,'preview',ids[1]),(a,env,str(uuid.uuid4()))]:
   with self.assertRaises(RuntimeError):self.rpc(owner,'assign',p_business=bid,p_environment=environment,p_booking=rid,p_version=4,p_staff=[member])
  self.assertEqual(self.scope(b,'select count(*) from public.business_staff'),'0')
  for query in ['set role anon;select * from public.business_staff','set role authenticated;delete from public.business_booking_staff','set role authenticated;update public.business_staff set active=true','set role anon;select public.business_staff_assign(null,null,null,null,null)']:
   with self.assertRaises(RuntimeError):self.sql(query)
  # Removing a cancelled booking from conflict calculation needs no reassignment.
  self.sql('update public.business_bookings set status=\'Cancelled\' where id='+lit(over))
  self.assertEqual(self.scope(a,'select conflicts from public.business_booking_schedule where id='+lit(touch)),'[]')
  from pathlib import Path
  self.assertIn('PASS:',self.sql((Path(__file__).parent/'staff-hosted.sql').read_text()))
  self.assertEqual(self.get('/account/staff-core.php')[0],403)
  self.post('/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Fictional Alex',self.get('/account/staff.php')[1]);self.assertIn('Staff unavailable',self.get(edit)[1])
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Staff('test_staff')]));sys.exit(not result.wasSuccessful())
