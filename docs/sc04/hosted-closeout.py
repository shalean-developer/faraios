"""Read-only final SC04 census. No host files, user values or live writes."""
import hashlib,json,os,subprocess,sys
EXPECTED='a6f692a2f4a175c77594fa7d5b2b2134630892be1b5499d5247a7ea6815995e2'
TABLES=['booking_private.ingress', 'customer_private.ingress', 'enquiry_private.ingress', 'enquiry_private.mail_outbox', 'enquiry_private.mail_settings', 'enquiry_private.rate_limits', 'invoice_private.counters', 'invoice_private.ingress', 'public.business_booking_requests', 'public.business_booking_staff', 'public.business_bookings', 'public.business_customers', 'public.business_enquiries', 'public.business_enquiry_activity', 'public.business_invoice_events', 'public.business_invoice_payments', 'public.business_invoices', 'public.business_profiles', 'public.business_public_pages', 'public.business_quotes', 'public.business_service_catalogues', 'public.business_service_images', 'public.business_staff', 'public.businesses', 'public.waitlist_subscribers', 'quote_private.ingress', 'request_private.ingress', 'staff_private.ingress', 'waitlist_private.delivery_events', 'waitlist_private.outbox']
A='2f16e658-e031-4c4a-930a-2731ec1d1492';B='4627f805-8243-4890-bf18-a14fdf3fd21b'
def main():
 env=dict(os.environ,PGSSLMODE='require',PGCONNECT_TIMEOUT='10',PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=20000')
 if 'rxelmugnucfajrqmphhe' not in env.get('PGHOST','')+env.get('PGUSER',''):raise RuntimeError('Project endpoint mismatch')
 parts=[]
 for name in TABLES:
  schema,table=name.split('.')
  where="coalesce(to_jsonb(t)->>'business_id','') not in ('"+A+"','"+B+"')"
  if table=='businesses':where="id not in ('"+A+"','"+B+"')"
  if table=='business_enquiry_activity':where="enquiry_id not in (select id from public.business_enquiries where business_id in ('"+A+"','"+B+"'))"
  parts.append("select '"+name+"' as name,count(*)::text as rows,md5(coalesce(string_agg(to_jsonb(t)::text,'' order by to_jsonb(t)::text collate \"C\"),'')) as fingerprint from \""+schema+"\".\""+table+"\" t where "+where)
 state="""jsonb_build_object('gate_off',not exists(select 1 from authorization_private.delegation_gate where enabled),'live_allowlist',(select count(*) from authorization_private.live_businesses),'active_delegated',(select count(*) from public.business_memberships where role<>'owner' and active),'memberships_retained',(select count(*) from public.business_memberships where role<>'owner'),'invitations_retained',(select count(*) from authorization_private.invitations),'audit_events_retained',(select count(*) from authorization_private.events),'preview_scopes',(select jsonb_agg(business_id::text order by business_id) from authorization_private.preview_businesses),'legacy_definitions',(select count(*) from authorization_private.legacy_functions),'legacy_differences',(select count(*) from authorization_private.legacy_functions where definition<>pg_get_functiondef(to_regprocedure(identity))),'public_policies',(select count(*) from pg_policies where schemaname='public'),'invoker_views',(select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='v' and c.reloptions @> array['security_invoker=true']),'database_bytes',pg_database_size(current_database()))"""
 q="select jsonb_build_object('state',"+state+",'tables',(select jsonb_agg(to_jsonb(f) order by name) from ("+' union all '.join(parts)+") f));"
 r=subprocess.run(['psql','-XAtq','-v','ON_ERROR_STOP=1','-c',q],env=env,capture_output=True,text=True,timeout=45)
 if r.returncode:raise RuntimeError('Read-only census failed; private output suppressed')
 data=json.loads(r.stdout);s=data['state'];digest=hashlib.sha256(json.dumps(data['tables'],sort_keys=True,separators=(',',':')).encode()).hexdigest()
 ok=s['gate_off'] and s['live_allowlist']==0 and s['active_delegated']==0 and s['memberships_retained']==4 and s['invitations_retained']>=8 and s['audit_events_retained']>=77 and s['preview_scopes']==[A,B] and s['legacy_definitions']==42 and s['legacy_differences']==0 and s['public_policies']==23 and s['invoker_views']==3 and digest==EXPECTED
 data.update(status='PASS' if ok else 'REVIEW',original_durable_fingerprints_match=digest==EXPECTED,expected_original_digest=EXPECTED,observed_original_digest=digest,transaction_read_only=True,customer_values_printed=False)
 print(json.dumps(data));return 0 if ok else 1
if __name__=='__main__':
 try:raise SystemExit(main())
 except (RuntimeError,OSError,ValueError,KeyError,subprocess.SubprocessError):print('Final read-only census stopped; private output suppressed.',file=sys.stderr);raise SystemExit(1)
