"""V1-010 native/PHP acceptance. Disposable synthetic state and injected transport only."""
import importlib.util,json,uuid,unittest,shutil,subprocess,os,tempfile,hashlib
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from journey import ROOT,lit,PHP
spec=importlib.util.spec_from_file_location('communication_base',ROOT/'tests/scheduling-runtime.py');base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)
PACK=ROOT/'docs/v1-010'
class Communications(base.Runtime):
 rpc_aliases=base.Runtime.rpc_aliases|{n:n for n in ['business_communication_list','business_communication_approve']}
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  cls.preinstall=cls.sql("select jsonb_agg(to_jsonb(r)order by id)from public.business_bookings r")
  cls.sql((PACK/'install.sql').read_text())
  cls.afterinstall=cls.sql("select jsonb_agg(to_jsonb(r)order by id)from public.business_bookings r")
  cls.sql('update auth.users set email=\'owner@example.test\',email_confirmed_at=now() where id='+lit(cls.ids[0]))
  for p in (PACK/'runtime').rglob('*'):
   if p.is_file():
    out=cls.webroot/p.relative_to(PACK/'runtime');out.parent.mkdir(exist_ok=True,parents=True);shutil.copyfile(p,out)
  cls.restart_php()
 def call_new(self,u,b,name,**args):
  if getattr(self,'capture_pilot',False) and b not in self.bids:
   self.sql('insert into authorization_private.communication_scopes(business_id,environment,capture)values('+lit(b)+",'preview',true)on conflict do nothing")
   self.sql("update auth.users set email='owner@example.test',email_confirmed_at=now()where id="+lit(u))
  return super().call_new(u,b,name,**args)
 def scope_on(self,outbound=False):
  self.sql('insert into authorization_private.communication_scopes(business_id,environment,capture,outbound,recipients)values('+','.join([lit(self.bids[0]),lit('preview'),'true',lit(outbound),"array['fixture@example.test','owner@example.test','customer@example.test']"])+')on conflict(business_id,environment)do update set capture=true,outbound=excluded.outbound,recipients=excluded.recipients')
 def comm(self,name,**args):return self.call_new(self.ids[0],self.bids[0],'business_communication_'+name,**args)
 def worker(self,name,**args):return json.loads(self.sql('set role service_role;select public.business_communication_'+name+'('+','.join(k+'=>'+lit(v)for k,v in args.items())+')'))
 def event(self,bid,event):return json.loads(self.sql('select to_jsonb(o)from authorization_private.communication_outbox o where entity_id='+lit(bid)+' and event='+lit(event)+' order by version desc limit 1'))
 def finish(self,j,pid='',retry=False,error=''):
  return self.worker('finish',p_id=j['id'],p_lease=j['lease'],p_provider_id=pid,p_retry=retry,p_error=error)
 def clear_pending(self):self.sql("update authorization_private.communication_outbox set status='blocked'where status in('review','queued','sending')")
 def test_01_default_off_no_backfill_atomic_capture_and_scope(self):
  self.assertEqual(self.preinstall,self.afterinstall);self.assertEqual(self.sql('select count(*)from authorization_private.communication_outbox'),'0')
  a=self.job(*[self.ids[0],self.bids[0]]);self.assertEqual(self.sql('select count(*)from authorization_private.communication_outbox'),'0')
  self.scope_on();bid=self.job(self.ids[0],self.bids[0]);j=self.event(bid,'booking.confirmation');self.assertEqual(j['status'],'review');self.assertNotIn('notes',j['payload']);self.assertEqual(self.worker('claim',p_environment='preview'),{})
  before=self.sql('select count(*)from authorization_private.communication_outbox');candidate=str(uuid.uuid4())
  with self.assertRaisesRegex(RuntimeError,'division by zero'):self.sql('begin;insert into public.business_bookings select (jsonb_populate_record(null::public.business_bookings,to_jsonb(r)||jsonb_build_object(\'id\','+lit(candidate)+',\'quote_id\',null))).* from public.business_bookings r where id='+lit(bid)+';select 1/0;commit;')
  self.assertEqual(self.sql('select count(*)from authorization_private.communication_outbox'),before)
  for actor,b,e in [(self.ids[1],self.bids[0],'preview'),(self.ids[0],self.bids[0],'live'),(self.ids[0],self.bids[1],'preview')]:
   with self.assertRaises(RuntimeError):self.call_new(actor,b,'business_communication_list',p_environment=e)
  with self.assertRaises(RuntimeError):self.context(self.ids[0],self.bids[0],'live','select public.business_communication_list('+lit(self.bids[0])+",'preview')")
  for role in ['anon','authenticated','service_role']:

   with self.assertRaises(RuntimeError):self.sql('set role '+role+';select * from authorization_private.communication_outbox')
  for role in ['anon','authenticated']:
   with self.assertRaises(RuntimeError):self.sql('set role '+role+";select public.business_communication_claim('preview')")
  self.enable();m=self.member('manager')
  with self.assertRaises(RuntimeError):self.call_new(m,self.bids[0],'business_communication_list')
  self.enable(False)
  self.scope_on(False)
  with self.assertRaisesRegex(RuntimeError,'Sending disabled'):self.comm('approve',p_id=j['id'])
 def test_02_confirmation_change_cancellation_missing_contact_and_snapshots(self):
  self.scope_on();bid=self.job(self.ids[0],self.bids[0]);first=self.event(bid,'booking.confirmation');self.assertEqual(first['payload']['local'],'20 May 2090 09:00');self.assertEqual(first['payload']['zone'],'Africa/Johannesburg')
  self.call_new(self.ids[0],self.bids[0],'business_booking_write',p_id=bid,p_version=1,p_quote=None,p_document=self.document(),p_address='Changed synthetic address',p_local='2090-05-21 11:30',p_zone='Africa/Johannesburg',p_duration=90,p_status='Scheduled')
  changed=self.event(bid,'booking.changed');self.assertEqual(changed['payload']['previous_local'],'20 May 2090 09:00');self.assertEqual(changed['payload']['local'],'21 May 2090 11:30');self.assertEqual(changed['payload']['previous_address'],'Synthetic address')
  self.scope_on(True)
  with self.assertRaisesRegex(RuntimeError,'superseded'):self.comm('approve',p_id=first['id'])
  self.call_new(self.ids[0],self.bids[0],'business_booking_write',p_id=bid,p_version=2,p_quote=None,p_document=self.document(),p_address='Changed synthetic address',p_local='2090-05-21 11:30',p_zone='Africa/Johannesburg',p_duration=90,p_status='Cancelled')
  cancel=self.event(bid,'booking.cancelled');self.assertEqual(cancel['payload']['previous_status'],'Scheduled');self.assertEqual(self.sql('select payload from authorization_private.communication_outbox where id='+lit(first['id'])),json.dumps(first['payload'],sort_keys=True) if False else self.sql('select '+lit(json.dumps(first['payload']))+'::jsonb'))
  # Missing-email jobs remain visible/blocked; no fabricated recipient.
  doc=self.document()|dict(email='',phone='0600000000');missing=str(uuid.uuid4());self.call_new(self.ids[0],self.bids[0],'business_booking_write',p_id=missing,p_version=0,p_quote=None,p_document=doc,p_address='Synthetic address',p_local='2090-06-01 10:00',p_zone='Africa/Johannesburg',p_duration=60,p_status='Scheduled')
  self.assertEqual(self.event(missing,'booking.confirmation')['status'],'blocked')
  self.login(self.ids[0]);html=self.get('/account/communications.php')[1];self.assertIn('Messages',html);self.assertNotIn('Fatal error',html);self.assertIn('No valid email',html)
  self.clear_pending()
 def test_03_quote_decisions_invoice_links_and_no_cross_purpose_tokens(self):
  self.scope_on();u,b=self.ids[0],self.bids[0];q=self.quote('Draft')
  self.call_new(u,b,'business_quote_send',p_id=q,p_version=1);j=self.event(q,'quote.sent');token=self.sql('select share_token from public.business_quotes where id='+lit(q));self.assertEqual(j['payload']['link'],'/quote/index.php?token='+token)
  self.sql("set role anon;select public.business_quote_customer('preview',"+lit(token)+",'Accepted')");decision=self.event(q,'quote.accepted');self.assertEqual(decision['recipient'],'owner@example.test')
  self.sql("set role anon;select public.business_quote_customer('preview',"+lit(token)+",'Accepted')");self.assertEqual(self.sql("select count(*)from authorization_private.communication_outbox where entity_id="+lit(q)+" and event='quote.accepted'"),'1')
  iid=self.make();invoice=self.event(iid,'invoice.issued');itoken=self.sql('select share_token from public.business_invoices where id='+lit(iid));self.assertEqual(invoice['payload']['link'],'/invoice/index.php?token='+itoken)
  self.assertFalse(json.loads(self.sql("set role anon;select public.business_invoice_customer('preview',"+lit(token)+')')))
  self.assertFalse(json.loads(self.sql("set role anon;select public.business_quote_customer('preview',"+lit(itoken)+")")))
  declined=self.quote('Draft');self.call_new(u,b,'business_quote_send',p_id=declined,p_version=1);dt=self.sql('select share_token from public.business_quotes where id='+lit(declined));self.sql("set role anon;select public.business_quote_customer('preview',"+lit(dt)+",'Declined')");self.assertEqual(self.event(declined,'quote.declined')['recipient'],'owner@example.test')
  r=self.row(iid);self.call_new(u,b,'business_invoice_write',p_id=iid,p_version=r['version'],p_action='void',p_reason='Synthetic communication correction');void=self.event(iid,'invoice.void');self.assertEqual(void['payload']['link'],invoice['payload']['link']);self.clear_pending()
 def test_04_concurrent_approval_claim_leases_timeouts_and_revoke(self):
  self.clear_pending();self.scope_on(True);bid=self.job(self.ids[0],self.bids[0]);j=self.event(bid,'booking.confirmation')
  with ThreadPoolExecutor(max_workers=3)as p:results=list(p.map(lambda _:self.comm('approve',p_id=j['id']),range(3)))
  self.assertEqual({x['id']for x in results},{j['id']})
  with ThreadPoolExecutor(max_workers=3)as p:jobs=list(p.map(lambda _:self.worker('claim',p_environment='preview'),range(3)))
  self.assertEqual(sum(bool(x)for x in jobs),1);lease=next(x for x in jobs if x)
  with self.assertRaisesRegex(RuntimeError,'lease changed'):self.finish(lease|dict(lease=str(uuid.uuid4())))
  self.finish(lease,retry=True,error='Temporary provider failure');self.assertEqual(self.worker('claim',p_environment='preview'),{})
  self.sql('update authorization_private.communication_outbox set available_at=now()where id='+lit(j['id']));retry=self.worker('claim',p_environment='preview');self.assertEqual(retry['id'],lease['id']);self.assertEqual(retry['payload'],lease['payload']);self.assertNotEqual(retry['lease'],lease['lease'])
  self.worker('delivery',p_event_id='synthetic-early',p_provider_id='synthetic-id',p_event='email.delivered');self.finish(retry,pid='synthetic-id');self.assertEqual(self.event(bid,'booking.confirmation')['delivery'],'delivered')
  self.worker('delivery',p_event_id='synthetic-bounce',p_provider_id='synthetic-id',p_event='email.bounced');self.worker('delivery',p_event_id='synthetic-early',p_provider_id='synthetic-id',p_event='email.delivered');self.assertEqual(self.event(bid,'booking.confirmation')['delivery'],'failed')
  with self.assertRaises(RuntimeError):self.worker('delivery',p_event_id='synthetic-bounce',p_provider_id='different-id',p_event='email.bounced')
  self.assertEqual(self.worker('claim',p_environment='preview'),{})
  bid=self.job(self.ids[0],self.bids[0]);j=self.event(bid,'booking.confirmation');self.comm('approve',p_id=j['id']);self.scope_on(False);self.assertEqual(self.worker('claim',p_environment='preview'),{});self.assertEqual(self.event(bid,'booking.confirmation')['status'],'blocked')
  self.scope_on(True);bid=self.job(self.ids[0],self.bids[0]);j=self.event(bid,'booking.confirmation');self.comm('approve',p_id=j['id']);lease=self.worker('claim',p_environment='preview');self.sql("update authorization_private.communication_outbox set first_attempt_at=now()-interval '21 hours',leased_until=now()-interval '1 minute'where id="+lit(j['id']));self.assertEqual(self.worker('claim',p_environment='preview'),{});self.assertIn('Retry window expired',self.event(bid,'booking.confirmation')['error'])
  with self.assertRaises(RuntimeError):self.comm('approve',p_id=j['id'])
 def test_05_transport_stable_bytes_html_escape_and_allowlist(self):
  script=PACK/'transport-test.php';r=subprocess.run([PHP,str(script)],capture_output=True,text=True,check=True);self.assertIn('PASS',r.stdout)
 def test_06_fresh_pilot_original_regression_and_financial_history(self):
  # Existing end-to-end test with new capture scoped OFF for the fresh business.
  self.capture_pilot=True
  self.test_08_fresh_independent_za_request_to_paid_and_correction_history()
  events=json.loads(self.sql('select jsonb_agg(distinct event)from authorization_private.communication_outbox where business_id='+lit(self.pilot_ids['business'])))
  for event in ['request.accepted','quote.sent','quote.accepted','booking.confirmation','booking.completed','booking.cancelled','invoice.issued','invoice.void']:self.assertIn(event,events)
  b=self.pilot_ids['business'];u=self.pilot_ids['owner'];page=json.loads(self.sql('select to_jsonb(p)from public.business_public_pages p where business_id='+lit(b)));svc=page['services']['items'][0]
  args=dict(p_environment='preview',p_slug=page['slug'],p_service=svc['id'],p_name='Synthetic declined request',p_email='guest@example.test',p_phone='',p_requirements='Synthetic request decline only',p_request=str(uuid.uuid4()),p_address='123 Fictional Road',p_local='2090-05-28 10:00',p_zone='Africa/Johannesburg',p_currency='ZAR',p_service_snapshot=svc)
  self.sql('set role anon;select public.business_booking_request_submit('+','.join(k+'=>'+(lit(json.dumps(v))+'::jsonb'if isinstance(v,dict)else lit(v))for k,v in args.items())+')');rid=self.sql('select id from public.business_enquiries where request_id='+lit(args['p_request']));self.call_new(u,b,'business_booking_request_action',p_id=rid,p_version=1,p_action='decline');self.assertEqual(self.event(rid,'request.declined')['recipient'],'guest@example.test')

 def test_07_changed_payload_same_event_key_rejects_and_rolls_back(self):
  self.scope_on();bid=self.job(self.ids[0],self.bids[0])
  self.sql("update public.business_bookings set address='First synthetic corrected address'where id="+lit(bid))
  before=self.sql('select to_jsonb(b)from public.business_bookings b where id='+lit(bid))
  with self.assertRaisesRegex(RuntimeError,'payload conflict'):self.sql("update public.business_bookings set address='Conflicting same-version synthetic address'where id="+lit(bid))
  self.assertEqual(self.sql('select to_jsonb(b)from public.business_bookings b where id='+lit(bid)),before)
 def test_08_owner_php_deliberate_approval_error_recovery_and_pagination(self):
  self.clear_pending();self.scope_on(False);bid=self.job(self.ids[0],self.bids[0]);j=self.event(bid,'booking.confirmation');self.login(self.ids[0])
  html=self.get('/account/communications.php')[1];self.assertIn('Review message',html);self.assertIn(j['recipient'],html)
  html=self.post('/account/communications.php',id=j['id'],confirm='yes');self.assertIn('Sending disabled or recipient not approved',html);self.assertIn('Review message',html)
  self.scope_on(True);html=self.post('/account/communications.php',id=j['id']);self.assertIn('Review the recipient',html);self.assertEqual(self.event(bid,'booking.confirmation')['status'],'review')
  html=self.post('/account/communications.php',id=j['id'],confirm='yes');self.assertIn('Message queued once',html)
  self.assertEqual(self.event(bid,'booking.confirmation')['attempts'],0)
  first=self.comm('list',p_offset=0);second=self.comm('list',p_offset=20);self.assertLessEqual(len(first),21);self.assertFalse(set(x['id']for x in first[:20])&set(x['id']for x in second[:20]))
  self.clear_pending()
 def test_09_browser_mobile_review_and_blocked_sending(self):
  from playwright.sync_api import sync_playwright
  self.clear_pending();self.scope_on(False);bid=self.job(self.ids[0],self.bids[0]);type(self).sc04_login_user=self.ids[0]
  out=ROOT/'test-results/communications';out.mkdir(parents=True,exist_ok=True)
  with sync_playwright()as pw:
   browser=pw.chromium.launch(executable_path=os.environ.get('FARAIOS_CHROMIUM'),headless=True,args=['--no-sandbox','--disable-dev-shm-usage'])
   try:
    for width in [320,390,768,1280]:
     ctx=browser.new_context(viewport={'width':width,'height':900});page=ctx.new_page();page.goto(self.url+'/account/index.php?page=signin');page.get_by_label('Email address',exact=True).fill('new@example.test');page.get_by_label('Password',exact=True).fill('test-long-password');page.get_by_role('button',name='Sign in',exact=True).click();page.goto(self.url+'/account/context.php');page.get_by_label('Business and environment',exact=True).select_option(self.bids[0]+':preview');page.get_by_role('button',name='Continue',exact=True).click()
     page.goto(self.url+'/account/communications.php');page.get_by_text('Review message',exact=True).first.click();self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
     form=page.locator('form').filter(has=page.locator('input[name="id"][value="'+self.event(bid,'booking.confirmation')['id']+'"]'));form.get_by_role('checkbox').check();button=form.get_by_role('button',name='Approve this message');self.assertGreaterEqual(button.bounding_box()['height'],40);button.click();page.get_by_role('alert').filter(has_text='Sending disabled').wait_for();self.assertLessEqual(page.evaluate('document.documentElement.scrollWidth'),width)
     page.screenshot(path=str(out/('review-'+str(width)+'.png')),full_page=False);ctx.close()
   finally:browser.close()
 def test_10_recovery_preserves_communication_and_financial_records(self):
  self.test_09_encrypted_recovery_and_guarded_ui_rollback_preserve_new_history()

 def test_11_exact_payload_preview_and_guarded_application_rollback(self):
  spec=importlib.util.spec_from_file_location('communication_stage',PACK/'stage.py');stage=importlib.util.module_from_spec(spec);spec.loader.exec_module(stage)
  self.assertEqual(stage.manifest(),json.loads((PACK/'release-scope.json').read_text()))
  spec=importlib.util.spec_from_file_location('communication_preview',PACK/'preview.py');preview=importlib.util.module_from_spec(spec);spec.loader.exec_module(preview)
  spec=importlib.util.spec_from_file_location('communication_guard',ROOT/'docs/v1-017/guarded-files.py');guard=importlib.util.module_from_spec(spec);spec.loader.exec_module(guard)
  with tempfile.TemporaryDirectory()as tmp:
   candidate=stage.stage(Path(tmp)/'candidate');original=stage.previous.stage(Path(tmp)/'original');plan={r['path']:dict(expected=r['candidate_sha256'],replacement=(original/r['path']).read_bytes())for r in stage.manifest()['files']if r['previous_sha256']}
   target=next(iter(plan));old=(candidate/target).read_bytes();(candidate/target).write_bytes(old+b'later edit')
   with self.assertRaises(ValueError):guard.apply(candidate,plan)
   (candidate/target).write_bytes(old);guard.apply(candidate,plan)
   for path in plan:self.assertEqual((candidate/path).read_bytes(),(original/path).read_bytes())
   result=preview.build(Path(tmp)/'preview');self.assertEqual(result,json.loads((PACK/'preview-scope.json').read_text()))
   for file in (Path(tmp)/'preview').rglob('*.php'):
    r=subprocess.run([PHP,'-l',str(file)],capture_output=True,text=True);self.assertEqual(r.returncode,0,r.stdout+r.stderr)
  self.assertEqual(self.sql("select count(*)from pg_tables where schemaname='authorization_private'and tablename like 'communication_%'"),'4')
if __name__=='__main__':
 names=[n for n in Communications.__dict__ if n.startswith('test_')and(n!='test_09_browser_mobile_review_and_blocked_sending'or os.environ.get('FARAIOS_COMMUNICATION_BROWSER_CHECK')=='true')];names += [n for n in base.base.f.Financial.__dict__ if n.startswith('test_')];r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite(Communications(n)for n in names));raise SystemExit(not r.wasSuccessful())
