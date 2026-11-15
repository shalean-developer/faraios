"""SC-02 synthetic fixture/native catalogue rehearsal, disposable loopback PG only.
Uses existing local Auth/REST simulation. No hosted connection or provider sends.
"""
import json, unittest
from foundation import Foundation
from journey import ROOT, lit
FIX=ROOT/'tests/fixtures/sc02'

class SC02Native(Foundation):
    def test_sc02(self):
        f=json.loads((FIX/'baseline.json').read_text())
        def js(value):return lit(json.dumps(value))+'::jsonb'
        for c in f['calculation_cases']:
            got=json.loads(self.sql('select request_private.calculate('+js(c['service'])+','+lit(c['currency'])+','+js(c['selections'])+')'))
            self.assertEqual(got,c['expected'],c['id'])
            self.assertEqual(self.sql('select request_private.scope_valid('+js(got)+')'),'t')
        for c in f['profile_cases']:
            self.assertEqual(self.sql('select public.business_profile_valid('+js(c['document'])+')'),'t',c['id'])
        for c in f['legacy_documents']:
            self.assertEqual(self.sql('select quote_private.valid('+js(c['document'])+')'),'t',c['id'])
        base=f['calculation_cases'][0]
        for selections in [base['selections'][:-1],base['selections']+[base['selections'][0]],
                [dict(id='f'*32,quantity=1)]+base['selections'][1:],
                [dict(id=base['selections'][0]['id'],quantity=1.5)]+base['selections'][1:]]:
            with self.assertRaises(RuntimeError):self.sql('select request_private.calculate('+js(base['service'])+",'ZAR',"+js(selections)+')')
        bad=json.loads(json.dumps(base['service']));bad['options'][0]['price']=6001
        with self.assertRaises(RuntimeError):self.sql('select request_private.calculate('+js(bad)+",'JPY',"+js(base['selections'])+')')
        with self.assertRaises(RuntimeError):self.sql('select request_private.calculate('+js(base['service']|dict(amount=999999999))+",'ZAR',"+js(base['selections'])+')')
        # Compose source profiles in a disposable database only; snapshot output is metadata.
        schemas="('public','booking_private','customer_private','enquiry_private','invoice_private','quote_private','request_private','staff_private','waitlist_private')"
        def capture():
            queries={
                'functions':"select n.nspname as schema,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,p.prosecdef,md5(pg_get_functiondef(p.oid)) as definition_md5,p.proacl::text as acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in "+schemas+" and p.prokind='f' order by 1,2,3",
                'policies':"select schemaname,tablename,policyname,permissive,roles,cmd,qual,with_check from pg_policies where schemaname in "+schemas+" order by 1,2,3",
                'views':"select schemaname,viewname,definition from pg_views where schemaname='public' order by 1,2",
                'relations':"select n.nspname as schema,c.relname,c.relkind,c.relrowsecurity,c.reloptions,c.relacl::text as acl from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in "+schemas+" and c.relkind in ('r','p','v','S') order by 1,2",
                'schema_acl':"select nspname,nspacl::text as acl from pg_namespace where nspname in "+schemas+" order by 1",
                'column_grants':"select table_schema,table_name,column_name,grantee,privilege_type from information_schema.column_privileges where table_schema in "+schemas+" order by 1,2,3,4,5",
                'function_role_access':"select n.nspname as schema,p.proname,pg_get_function_identity_arguments(p.oid) as arguments,r.rolname,has_schema_privilege(r.oid,n.oid,'USAGE') as schema_usage,has_function_privilege(r.oid,p.oid,'EXECUTE') as execute from pg_proc p join pg_namespace n on n.oid=p.pronamespace cross join pg_roles r where n.nspname in "+schemas+" and p.prokind='f' and r.rolname in ('anon','authenticated','service_role') order by 1,2,3,4"
            }
            return {k:json.loads(self.sql("select coalesce(jsonb_agg(to_jsonb(t)),'[]') from ("+q+") t")) for k,q in queries.items()}
        result={'scope':'disposable PostgreSQL catalogue, simulated Auth; no hosted equivalence claim','migrations_only':capture()}
        self.assertEqual(len(result['migrations_only']['policies']),23)
        self.assertEqual(len(result['migrations_only']['views']),3)
        self.assertEqual(len(result['migrations_only']['functions']),81)
        for name in ['business_quote_list','business_invoice_list','business_booking_schedule']:
            self.assertEqual(self.sql("select 'security_invoker=true'=any(reloptions) from pg_class where oid="+lit('public.'+name)+'::regclass'),'t')
        self.sql((ROOT/'release/activate-foundation.sql').read_text())
        result['manual_activation']=capture()
        # Materialize an actual frozen document/ledger chain through existing commands.
        a,b=self.ids;bid=self.bids[0];p=f['preserved'];booking=p['booking'];doc=f['legacy_documents'][0]['document'];ctx=dict(p_business=bid,p_environment='preview')
        args=[bid,'preview',booking['id'],0,None]
        self.scope(a,'select public.business_booking_write('+','.join(map(lit,args))+','+js(doc)+','+','.join(map(lit,[booking['address'],'2026-12-01 09:00','Africa/Johannesburg',215,'Scheduled']))+')')
        iid=p['invoices'][0]['id'];due=self.sql('select current_date+14')
        self.call(a,'write',**ctx,p_id=iid,p_version=0,p_action='save',p_document=doc,p_due=due,p_booking=booking['id'])
        self.call(a,'write',**ctx,p_id=iid,p_version=1,p_action='issue')
        payment=p['payments'][0];pay=ctx|dict(p_invoice=iid,p_id=payment['id'],p_amount=payment['amount'],p_paid_on=self.sql('select current_date'),p_reference=payment['reference'])
        self.call(a,'payment',**pay)
        with self.assertRaises(RuntimeError):self.call(a,'write',**ctx,p_id=iid,p_version=3,p_action='void',p_reason='Synthetic correction')
        self.call(a,'payment',**(pay|dict(p_id=p['payments'][1]['id'],p_reversal=payment['id'],p_reason='Synthetic correction')))
        self.call(a,'write',**ctx,p_id=iid,p_version=4,p_action='void',p_reason='Synthetic correction')
        original=self.scope(a,'select document::text from public.business_invoices where id='+lit(iid))
        ledger=self.scope(a,"select jsonb_agg(to_jsonb(t) order by id) from public.business_invoice_payments t")
        child=self.call(a,'write',**ctx,p_id=iid,p_version=5,p_action='replace',p_reason='Synthetic correction')['id']
        self.assertEqual(self.scope(a,'select replaces_id from public.business_invoices where id='+lit(child)),iid)
        self.assertEqual(self.scope(a,'select document::text from public.business_invoices where id='+lit(iid)),original)
        self.assertEqual(self.scope(a,"select jsonb_agg(to_jsonb(t) order by id) from public.business_invoice_payments t"),ledger)
        self.assertEqual(self.scope(b,'select count(*) from public.business_invoice_list'),'0')
        with self.assertRaises(RuntimeError):self.call(b,'write',**ctx,p_id=iid,p_version=5,p_action='replace',p_reason='Synthetic correction')
        with self.assertRaises(RuntimeError):self.call(a,'write',**(ctx|dict(p_environment='live')),p_id=iid,p_version=5,p_action='replace',p_reason='Synthetic correction')
        self.sql((ROOT/'release/deactivate-foundation.sql').read_text());result['manual_rollback']=capture()
        self.assertEqual(self.scope(a,'select document::text from public.business_invoices where id='+lit(iid)),original)
        self.assertEqual(self.scope(a,"select jsonb_agg(to_jsonb(t) order by id) from public.business_invoice_payments t"),ledger)
        out=ROOT/'test-results/release';out.mkdir(parents=True,exist_ok=True)
        (out/'sc02-native.json').write_text(json.dumps(result,indent=2)+'\n')

if __name__=='__main__':
    r=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([SC02Native('test_sc02')]))
    raise SystemExit(not r.wasSuccessful())
