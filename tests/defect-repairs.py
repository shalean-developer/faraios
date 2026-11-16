"""D01–D03 regression evidence: native disposable PostgreSQL + PHP, no hosted writes."""
import importlib.util,json,uuid,unittest,re,subprocess,urllib.request,urllib.parse,hashlib
from journey import ROOT,lit
spec=importlib.util.spec_from_file_location('ready',ROOT/'tests/sc04-readiness.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
class Repairs(base.Readiness):
 sc04_report_name='defect-repairs.json'
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.sql((ROOT/'docs/sc04/defect-repairs.sql').read_text())
  private=cls.private/'profiles';config=private/'config.php';config.write_text(config.read_text().replace(cls.url,cls.url+'/preview'))
  (private/'router.php').write_text("<?php $path=preg_replace('~^/preview~','',parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH));$_SERVER['SCRIPT_NAME']=$path;$_SERVER['SCRIPT_FILENAME']="+repr(str(cls.webroot))+".$path;if(preg_match('~\\.(css|js|svg)$~',$path,$m)){header('Content-Type: '.['css'=>'text/css','js'=>'application/javascript','svg'=>'image/svg+xml'][$m[1]]);readfile($_SERVER['SCRIPT_FILENAME']);return true;}require $_SERVER['SCRIPT_FILENAME'];return true;")
  cls.restart_php();cls.url+='/preview'
 def page(self,u,resource,page=1,size=50,id=None,b=None,e='preview'):
  return json.loads(self.context(u,b or self.bids[0],e,'select public.business_delegate_page('+','.join(map(lit,[b or self.bids[0],e,resource,id,page,size]))+')'))
 def login(self,u):
  type(self).sc04_login_user=u
  self.post('/account/index.php?page=signin',email='new@example.test',password='test-long-password')
  self.post('/account/context.php',context=self.bids[0]+':preview')
 def test_d00_original_failures_and_history(self):
  self.enable();u=self.member('manager');self.login(u);page=self.webroot/'account/delegated.php';fixed=page.read_text()
  frozen=(ROOT/'tests/fixtures/defects/d01-d03-before.json').read_bytes();self.assertEqual(hashlib.sha256(frozen).hexdigest(),'af51910e157e89e0604344c9009c0941ba46f4715aa5e93207a405aa46ec24a2');fixture=json.loads(frozen);old=fixture['delegated_php']
  try:
   page.write_text(old)
   html=self.post('/account/delegated.php?view=customers',action='customer',name='Synthetic disappearing original',email='bad',phone='',address='',notes='')
   self.assertNotIn('Create customer',html);self.assertNotIn('Synthetic disappearing original',html)
  finally:page.write_text(fixed)
  command=fixture['command_sql'].replace('create function ','create or replace function ',1)
  self.sql(command);w=self.member('worker');i=str(uuid.uuid4());self.sql("alter database postgres set timezone='UTC'")
  self.command(w,'availability.request',dict(id=i,starts_at='2026-12-05T09:00',ends_at='2026-12-05T10:00'))
  self.assertEqual(self.sql("select to_char(starts_at at time zone 'Africa/Johannesburg','HH24:MI') from authorization_private.availability_requests where id="+lit(i)),'11:00')
  before=self.sql('select row_to_json(t) from authorization_private.availability_requests t where id='+lit(i))
  self.sql((ROOT/'docs/sc04/defect-repairs.sql').read_text())
  self.assertEqual(self.sql('select row_to_json(t) from authorization_private.availability_requests t where id='+lit(i)),before);self.enable(False)
 def test_d01_pages_and_projection(self):
  self.enable();u=self.member('manager');b=lit(self.bids[0]);doc=lit(json.dumps(self.document()))+'::jsonb'
  self.sql("insert into public.business_customers(id,business_id,environment,details) select gen_random_uuid(),"+b+",'preview','{\"name\":\"Synthetic page customer\",\"email\":\"fixture@example.test\",\"phone\":\"\",\"address\":\"\",\"notes\":\"\"}'::jsonb from generate_series(1,201)")
  self.sql("insert into public.business_enquiries(business_id,environment,request_id,page_slug,customer_name,email,phone,requirements) select "+b+",'preview',gen_random_uuid(),'synthetic','Synthetic page enquiry','fixture@example.test','','Synthetic requirements' from generate_series(1,201)")
  for table,cols,vals in [('business_quotes','document,expires_on',doc+',current_date+14'),('business_bookings','document,address,starts_at,time_zone,duration_minutes',doc+",'Synthetic address',now()+interval '1 day','Africa/Johannesburg',90"),('business_staff','name,email,phone',"'Synthetic page staff','private@example.test',''"),('business_invoices','document,due_on',doc+',current_date+14')]:
   self.sql('insert into public.'+table+'(id,business_id,environment,'+cols+') select gen_random_uuid(),'+b+",'preview',"+vals+' from generate_series(1,201)')
  iid=self.sql('select id from public.business_invoices where business_id='+b+' limit 1')
  self.sql("insert into public.business_invoice_payments(id,business_id,environment,invoice_id,amount,paid_on,reference,created_by) select gen_random_uuid(),"+b+",'preview',"+lit(iid)+",100,current_date,'Synthetic page receipt',"+lit(u)+' from generate_series(1,201)')
  for resource in ['customers','enquiries','quotes','bookings','staff','invoices','payments']:
   before=self.read(u,resource);self.assertEqual(len(before),100)
   got=[];n=1
   while True:
    page=self.page(u,resource,n);self.assertLessEqual(len(page['items']),50);got+=page['items']
    if not page['has_next']:break
    n+=1
   self.assertGreaterEqual(len(got),201);self.assertEqual(len(got),len({x['id'] for x in got}));self.assertEqual([x['id'] for x in got[:100]],[x['id'] for x in before]);self.assertNotIn('share_token',json.dumps(got));self.assertEqual(self.page(u,resource,n+1)['items'],[])
   with self.assertRaises(RuntimeError):self.page(u,resource,b=self.bids[1])
   with self.assertRaises(RuntimeError):self.page(u,resource,e='live')
  for n,size in [(0,50),(-1,50),(1000001,50),(1,0),(1,101)]:
   with self.assertRaises(RuntimeError):self.page(u,'customers',n,size)
  rec=self.member('receptionist')
  for n in [1,3,5]:
   self.assertTrue(all(set(x)=={'id','name','active'} for x in self.page(rec,'staff',n)['items']))
   for resource in ['payments','invoices']:
    with self.assertRaises(RuntimeError):self.page(rec,resource,n)
  worker=self.member('worker');sid=self.sql('select id from public.business_staff where business_id='+b+' limit 1');self.invoke(self.ids[0],'business_worker_link',p_user=worker,p_staff=sid)
  self.sql('insert into public.business_booking_staff(booking_id,staff_id,business_id,environment) select id,'+lit(sid)+',business_id,environment from public.business_bookings where business_id='+b)
  rows=self.page(worker,'visits')['items'];self.assertEqual(len(rows),50);self.assertNotIn('document',json.dumps(rows));self.assertNotIn('50500',json.dumps(rows));self.assertTrue(self.page(worker,'visits',2)['items'])
  self.invoke(self.ids[0],'business_membership_revoke',p_user=worker)
  with self.assertRaises(RuntimeError):self.page(worker,'visits',2)
  self.enable(False)
 def test_d01_customer_navigation_at_list_end(self):
  from html.parser import HTMLParser
  class ListPage(HTMLParser):
   def __init__(self):super().__init__();self.ids=[];self.nav=[];self.bottom_after_cards=False;self.bottom_link=None;self.current_nav=None
   def handle_starttag(self,tag,attrs):
    attrs=dict(attrs)
    if tag=='nav':self.current_nav=attrs.get('aria-label');self.nav.append(self.current_nav);self.bottom_after_cards=self.bottom_after_cards or (self.current_nav=='Record pages' and len(self.ids)==10)
    if tag=='article':self.ids.append(None)
    if tag=='input' and attrs.get('name')=='id' and self.ids:self.ids[-1]=attrs.get('value')
    if tag=='a' and self.current_nav=='Record pages' and 'page=2' in attrs.get('href',''):self.bottom_link=attrs['href']
   def handle_endtag(self,tag):
    if tag=='nav':self.current_nav=None
  self.enable();u=self.member('manager');self.login(u)
  first=ListPage();first.feed(self.get('/account/delegated.php?view=customers')[1]);self.assertEqual(len(first.ids),10);self.assertTrue(first.bottom_after_cards);self.assertEqual(first.nav.count('Record pages'),1);self.assertTrue(first.bottom_link)
  second=ListPage();second.feed(self.get('/account/delegated.php'+first.bottom_link)[1]);self.assertEqual(len(second.ids),10);self.assertFalse(set(first.ids)&set(second.ids));self.enable(False)
 def test_d02_business_zone_and_dst(self):
  self.enable();u=self.member('worker');b=lit(self.bids[0]);self.sql("alter database postgres set timezone='UTC'")
  for zone,local,expected in [('UTC','2026-12-05T09:00','09:00'),('Africa/Johannesburg','2026-12-05T09:00','07:00'),('Europe/London','2026-07-05T09:00','08:00'),('Europe/London','2026-12-05T09:00','09:00')]:
   self.sql('update public.businesses set time_zone='+lit(zone)+' where id='+b);i=str(uuid.uuid4())
   self.command(u,'availability.request',dict(id=i,starts_at=local,ends_at=local.replace('09:00','10:00')))
   self.assertEqual(self.sql("select to_char(starts_at at time zone 'UTC','HH24:MI') from authorization_private.availability_requests where id="+lit(i)),expected)
  for start,end in [('2026-03-29T01:30','2026-03-29T03:00'),('2026-10-25T01:30','2026-10-25T03:00'),('bad','bad'),('2026-12-05T10:00','2026-12-05T09:00')]:
   with self.assertRaises(RuntimeError):self.command(u,'availability.request',dict(id=str(uuid.uuid4()),starts_at=start,ends_at=end))
  self.sql("update public.businesses set time_zone='Africa/Johannesburg' where id="+b);self.enable(False)
 def test_d03_validation_csrf_stale_and_revoke(self):
  self.enable();u=self.member('manager');self.login(u)
  path='/account/delegated.php?view=customers';payload=dict(action='customer',name='Synthetic retained <value>',email='invalid-email',phone='01234',address='Synthetic address',notes='Retained notes')
  html=self.post(path,**payload);self.assertIn('Enter a valid email address.',html);self.assertIn('Synthetic retained &lt;value&gt;',html);self.assertIn('Unsaved changes',html);self.assertIn('Create customer',html)
  html=self.client.open(urllib.request.Request(self.url+path,data=urllib.parse.urlencode(payload|{'csrf':'expired'}).encode(),headers={'Origin':self.url})).read().decode();self.assertIn('This form has expired.',html);self.assertIn('Retained notes',html)
  cid=str(uuid.uuid4());details=dict(name='Synthetic original',email='fixture@example.test',phone='',address='',notes='')
  self.command(u,'business_customer_write',dict(p_id=cid,p_version=0,p_details=details,p_confirm=True))
  html=self.post(path,**(payload|dict(id=cid,version='0',email='valid@example.test')));self.assertIn('Customer changed',html);self.assertIn('name="version" value="0"',html);self.assertIn('Retained notes',html)
  self.assertEqual(self.sql('select details->>\'name\' from public.business_customers where id='+lit(cid)),'Synthetic original')
  self.invoke(self.ids[0],'business_membership_revoke',p_user=u)
  html=self.get(path)[1];self.assertNotIn('Retained notes',html);self.assertNotIn('Create customer',html);self.enable(False)
 def test_d03_network_no_automatic_replay(self):
  self.enable();u=self.member('manager');self.login(u);path='/account/delegated.php?view=customers'
  type(self).rpc_faults={'business_delegate_command':503}
  before=len([x for x in self.rpc_requests if x[0]=='business_delegate_command'])
  html=self.post(path,action='customer',name='Synthetic connection retained',email='fixture@example.test',phone='',address='',notes='Network retained')
  self.assertIn('Connection problem.',html);self.assertIn('Network retained',html);self.assertIn('Unsaved changes',html)
  self.assertEqual(len([x for x in self.rpc_requests if x[0]=='business_delegate_command'])-before,1)
  self.assertEqual(self.sql("select count(*) from public.business_customers where details->>'name'='Synthetic connection retained'"),'0')
  self.enable(False)
 def test_d01_assignment_across_pages(self):
  self.enable();u=self.member('manager');self.login(u);bid=self.booking()
  staff=self.page(u,'staff')['items'];other=self.page(u,'staff',3)['items'];self.assertTrue(other)
  first=staff[0]['id'];second=other[0]['id']
  self.command(u,'business_staff_assign',dict(p_booking=bid,p_version=0,p_staff=[first]))
  row=self.page(u,'bookings',id=bid)['items'][0]
  html=self.post('/account/delegated.php?view=bookings&staff_page=3',action='assign',id=bid,version=row['version'],assignment_version=row['assignment_version'],staff_page_ids=json.dumps([s['id'] for s in self.page(u,'staff',3)['items']]),**{'staff[]':second})
  self.assertIn('Saved.',html)
  actual=self.page(u,'bookings',id=bid)['items'][0];self.assertEqual(set(actual['staff_ids']),{first,second})
  self.post('/account/delegated.php?view=bookings&staff_page=3',action='assign',id=bid,version=row['version'],assignment_version=row['assignment_version'],staff_page_ids=json.dumps([s['id'] for s in self.page(u,'staff',3)['items']]))
  self.assertEqual(set(self.page(u,'bookings',id=bid)['items'][0]['staff_ids']),{first,second});self.enable(False)
 def test_d04_browser_desktop_mobile(self):
  from playwright.sync_api import sync_playwright
  import os
  self.enable();manager=self.member('manager');worker=self.member('worker');checks=[]
  with sync_playwright() as pw:
   browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--no-zygote','--single-process','--disable-crash-reporter','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu'])
   try:
    for width in [390,1280]:
     for role,actor in [('manager',manager),('worker',worker)]:
      type(self).sc04_login_user=actor;ctx=browser.new_context(viewport={'width':width,'height':844});page=ctx.new_page()
      if role=='manager':page.route('**/ui/design-system.css',lambda route:route.abort())
      page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click()
      page.goto(self.url+'/account/context.php');page.get_by_label('Business and environment',exact=True).select_option(self.bids[0]+':preview');page.get_by_role('button',name='Continue',exact=True).click();page.get_by_role('heading',name='Fresh Test',exact=True).wait_for()
      if role=='manager':
       page.goto(self.url+'/account/delegated.php?view=customers&page=2');self.assertEqual(page.locator('article').count(),10)
       self.assertEqual(page.get_by_role('navigation',name='Record pages',exact=True).count(),1)
       if width==390:
        menu=page.get_by_role('button',name='Open menu',exact=True);icon=menu.locator('svg');self.assertEqual(icon.bounding_box()['width'],24);self.assertEqual(icon.bounding_box()['height'],24);self.assertNotEqual(icon.evaluate('(e)=>getComputedStyle(e).stroke'),'none');self.assertGreaterEqual(menu.bounding_box()['width'],44)
        page.screenshot(path=str(ROOT/'test-results/release'/'mobile-menu-visible.png'));menu.click();self.assertEqual(page.locator('.drawer-open').get_attribute('aria-expanded'),'true');self.assertTrue(page.get_by_role('dialog').is_visible());page.get_by_role('button',name='Close menu',exact=True).click();self.assertEqual(menu.get_attribute('aria-expanded'),'false')
       end=page.get_by_role('navigation',name='Record pages',exact=True);end.scroll_into_view_if_needed();self.assertEqual(end.get_by_role('link').count(),2)
       previous=end.get_by_role('link',name='Previous',exact=True).bounding_box();following=end.get_by_role('link',name='Next',exact=True).bounding_box();self.assertAlmostEqual(previous['y'],following['y'],delta=1);self.assertLess(previous['x'],following['x']);self.assertGreaterEqual(following['height'],44)
       out=ROOT/'test-results/release';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/('customer-pagination-bottom-'+str(width)+'.png')))
       end.get_by_role('link',name='Next',exact=True).click();self.assertIn('page=3',page.url)
       page.get_by_role('navigation',name='Record pages',exact=True).get_by_role('link',name='Previous',exact=True).click();self.assertIn('page=2',page.url)
       page.get_by_role('navigation',name='Record pages',exact=True).get_by_role('link',name='Next',exact=True).click();self.assertIn('page=3',page.url)
       page.locator('summary').filter(has_text='Create customer').click();form=page.locator('form').filter(has=page.locator('input[name="action"][value="customer"]')).first
       save=form.get_by_role('button',name='Save',exact=True);save.scroll_into_view_if_needed();self.assertGreaterEqual(save.bounding_box()['height'],44)
       colors=save.evaluate('(e)=>({background:getComputedStyle(e).backgroundColor,foreground:getComputedStyle(e).color})');self.assertNotIn(colors['background'],['rgba(0, 0, 0, 0)','transparent','rgb(255, 255, 255)']);self.assertNotEqual(colors['background'],colors['foreground'])
       def luminance(color):
        rgb=[int(v)/255 for v in re.findall(r'\d+',color)[:3]];linear=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb];return sum(v*w for v,w in zip(linear,[.2126,.7152,.0722]))
       a,b=sorted([luminance(colors['background']),luminance(colors['foreground'])]);self.assertGreaterEqual((b+.05)/(a+.05),4.5)
       page.screenshot(path=str(out/('customer-save-no-theme-'+str(width)+'.png')))
       form.locator('input[name="name"]').fill('Synthetic phone retained');form.locator('input[name="email"]').fill('bad-email');save.click();page.get_by_role('heading',name='Unsaved changes',exact=True).wait_for()
       self.assertEqual(page.locator('section.panel input[name="name"]').input_value(),'Synthetic phone retained');self.assertTrue(page.get_by_role('alert').is_visible())
      else:self.assertIn('Times in Africa/Johannesburg',page.locator('body').inner_text());self.assertNotIn('Payments',page.locator('body').inner_text())
      metrics=page.evaluate('({width:innerWidth,scroll:document.documentElement.scrollWidth})');self.assertLessEqual(metrics['scroll'],width);checks.append(dict(role=role,**metrics));out=ROOT/'test-results/release';out.mkdir(parents=True,exist_ok=True);page.screenshot(path=str(out/('defect-'+role+'-'+str(width)+'.png')),full_page=False);ctx.close();browser.close();browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM','/usr/bin/chromium'),headless=True,args=['--no-sandbox','--no-zygote','--single-process','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--disable-gpu'])
   finally:browser.close()
  (ROOT/'test-results/release/defect-browser.json').write_text(json.dumps(dict(status='PASS',checks=checks,physical_phone=False),indent=2));self.enable(False)
if __name__=='__main__':
 names=[n for n in Repairs.__dict__ if n.startswith('test_') and (n!='test_d04_browser_desktop_mobile' or __import__('os').environ.get('FARAIOS_MOBILE_BROWSER_CHECK')=='true')]
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Repairs(n) for n in names));raise SystemExit(not result.wasSuccessful())
