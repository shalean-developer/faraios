"""Offline SC-02 gates: no database, Auth, network or messages.
Tests frozen contracts, parser edge cases, production JS calculator and preservation.
Does not claim native RLS/hosted or future role/lifecycle acceptance.
"""
import copy, hashlib, json, re, subprocess, unittest
from pathlib import Path
from sc02_inventory import ROOT, build, manifest, statements, render
FIX = ROOT/'tests/fixtures/sc02'

def canonical(value):
    return json.dumps(value,sort_keys=True,separators=(',',':'),ensure_ascii=False).encode()

class Baseline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.f=json.loads((FIX/'baseline.json').read_text())
        cls.lock=json.loads((FIX/'fingerprints.json').read_text())
        cls.inventory=json.loads((ROOT/'docs/sc02/contract-inventory.json').read_text())

    def test_01_inventory_reproducible_and_complete(self):
        self.assertEqual(self.inventory,build())
        # Preserve the historical SC-02 manifest. Only these reviewed operational
        # workflow bytes and the bounded marketing repair below may differ.
        # Every other original file remains exact; keep both historical baselines.
        expected=copy.deepcopy(json.loads((ROOT/'docs/sc02/preservation-manifest.json').read_text()))
        delta=json.loads((ROOT/'docs/sc04/operational-source-delta.json').read_text())
        self.assertEqual(set(delta),{'.github/workflows/database-backup.yml',
                                     '.github/workflows/database-restore-check.yml'})
        found=set()
        for entry in expected['files']:
            if entry['path'] in delta:
                change=delta[entry['path']]
                self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
                self.assertEqual(entry['sha256'],change['baseline_sha256'])
                entry['sha256']=change['candidate_sha256']
                found.add(entry['path'])
        self.assertEqual(found,set(delta))
        marketing=json.loads((ROOT/'docs/marketing-recovery/source-delta.json').read_text())
        self.assertEqual(set(marketing),{'.htaccess','index.html','sitemap.php',
            'features.html','hosting.html','industries.html','marketing.css',
            'industries/tourism.html','industries/gardening.html',
            'industries/technology.html','industries/construction.html',
            'release/marketing-recovery/preview.zip'})
        original={entry['path']:entry for entry in expected['files']}
        for path,change in marketing.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        recovery=json.loads((ROOT/'docs/remaining-404s/source-delta.json').read_text())
        self.assertEqual(set(recovery),{'.htaccess','sitemap.php','index.html',
            'industries.html','terms.html','pricing.html','marketplace.html',
            'industries/cleaning.html','industries/electrical.html',
            'industries/security.html','industries/beauty-spa.html',
            'industries/fitness.html','industries/consulting.html',
            'release/remaining-404s/preview.zip'})
        for path,change in recovery.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        walkthrough=json.loads((ROOT/'docs/walkthrough/source-delta.json').read_text())
        self.assertEqual(set(walkthrough),{'.htaccess','sitemap.php','index.html',
            'about.html','pricing.html','guides/enquiry-to-invoice.html',
            'walkthrough.css','release/walkthrough/walkthrough-preview.zip'})
        for path,change in walkthrough.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        ui=json.loads((ROOT/'docs/ui-consistency/source-delta.json').read_text())
        self.assertEqual(set(ui),{'account/customers.php', 'industries/beauty-spa.html', 'industries/construction.html', 'account/quotes.php', 'industries/security.html', 'quote/index.php', 'hosting.html', 'industries/technology.html', 'b/index.php', 'industries/cleaning.html', 'account/account-view.php', 'account/customer.php', 'account/invoices.php', 'account/customer-help.php', 'industries/consulting.html', 'account/layout.php', 'pricing.html', 'ui/design-system.css', 'account/services.php', 'account/profile.php', 'industries/fitness.html', 'guides/enquiry-to-invoice.html', 'industries/gardening.html', 'waitlist/action-page.php', 'index.html', '.github/workflows/foundation-regression.yml', 'account/requests.php', 'account/index.php', 'features.html', 'terms.html', 'account/bookings.php', 'account/staff.php', 'privacy.html', 'contact.html', 'industries.html', 'industries/electrical.html', 'invoice/index.php', 'marketplace.html', 'ui/site-menu.js', 'account/enquiry-new.php', 'about.html', 'account/dashboard.php', 'waitlist.html', 'account/enquiries.php', 'industries/tourism.html'})
        for path,change in ui.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        onboarding=json.loads((ROOT/'docs/onboarding/source-delta.json').read_text())
        self.assertEqual(set(onboarding),{'account/staff.php','account/staff-access.php','account/staff-invite-core.php','account/staff-join.php','account/staff-join.js','account/staff-join.css','account/staff-search.js','notifications/staff-invitation.php','scripts/staff-invitation-worker.php','scripts/staff-invitation-keygen.php','account/staff-onboarding.css','scripts/private_config.php'})
        for path,change in onboarding.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        release=json.loads((ROOT/'docs/v1-017/source-delta.json').read_text())
        self.assertEqual(set(release),{'.github/workflows/foundation-regression.yml'})
        for path,change in release.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original[path]['sha256'])
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        scheduling=json.loads((ROOT/'docs/v1-005/source-delta.json').read_text())
        self.assertEqual(set(scheduling),{'.github/workflows/scheduling-regression.yml'})
        for path,change in scheduling.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        communications=json.loads((ROOT/'docs/v1-010/source-delta.json').read_text())
        self.assertEqual(set(communications),{'.github/workflows/lifecycle-communications.yml'})
        for path,change in communications.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        accessibility=json.loads((ROOT/'docs/v1-016/source-delta.json').read_text())
        self.assertEqual(set(accessibility),{'.github/workflows/v1-016-accessibility.yml','account/account.js','account/error-focus.js','account/index.php','account/layout.php','b/index.php','account/enquiries-core.php'})
        for path,change in accessibility.items():
            self.assertEqual(set(change),{'baseline_sha256','candidate_sha256'})
            self.assertEqual(change['baseline_sha256'],original.get(path,{}).get('sha256'))
            original[path]={'path':path,'sha256':change['candidate_sha256']}
        expected['files']=[original[path] for path in sorted(original,key=Path)]
        self.assertEqual(expected,manifest())
        self.assertEqual(len(self.inventory['files']),31)
        self.assertEqual({r['name'] for r in self.inventory['sql'] if r['kind']=='view'},
            {'public.business_quote_list','public.business_booking_schedule','public.business_invoice_list'})
        for r in self.inventory['sql']:
            self.assertEqual(hashlib.sha256(r['sql'].encode()).hexdigest(),r['sha256'])
        # Fail closed if a new SQL source is omitted by directory conventions.
        covered={x['path'] for x in self.inventory['files']}
        self.assertEqual(covered,{str(p.relative_to(ROOT)) for d in ['supabase','release'] for p in (ROOT/d).rglob('*.sql')})

    def test_02_sql_lexer(self):
        sql="-- header\ncreate function public.f() returns text as $tag$ begin return 'x;y'; end $tag$ language plpgsql; /* a /* nested */ b */ grant execute on function public.f() to authenticated; select 'it''s;safe';"
        rows=list(statements(sql))
        self.assertEqual(len(rows),3)
        self.assertIn("'x;y'",rows[0][0]);self.assertEqual(rows[0][1],2)
        self.assertEqual(rows[2][0],"select 'it''s;safe'")
        with self.assertRaises(ValueError):list(statements("select $x$unclosed"))

    def test_03_manual_overrides_and_overloads(self):
        effective=self.inventory['effective_function_sources']
        key='invoice_private.write(uuid,text,uuid,integer,text,jsonb,date,uuid,text)'
        self.assertTrue(effective['manual_activation'][key].startswith('release/activate-foundation.sql'))
        self.assertTrue(effective['manual_rollback'][key].startswith('release/deactivate-foundation.sql'))
        self.assertTrue(effective['migrations_only'][key].startswith('supabase/migrations/20261114161207'))
        overloads=[k for k in effective['migrations_only'] if k.startswith('public.business_booking_request_submit(')]
        self.assertEqual(len(overloads),2)
        self.assertEqual(len(self.inventory['dynamic_sql_expansions'][0]['writes']),3)

    def test_04_fixture_fingerprints_and_tamper_detection(self):
        self.assertEqual(hashlib.sha256((FIX/'baseline.json').read_bytes()).hexdigest(),self.lock['fixture_sha256'])
        for key,value in self.f['preserved'].items():
            self.assertEqual(hashlib.sha256(canonical(value)).hexdigest(),self.lock['sections'][key])
            changed=copy.deepcopy(value)
            if isinstance(changed,dict):changed['_tamper']=True
            else:changed.append({'_tamper':True})
            self.assertNotEqual(hashlib.sha256(canonical(changed)).hexdigest(),self.lock['sections'][key])

    def test_05_actual_browser_calculator_against_frozen_cases(self):
        # Evaluate the exact production function, isolated from DOM navigation.
        source=(ROOT/'business/booking.js').read_text()
        fn=re.search(r'const calculateOptions = service => \{.*?\n\};',source,re.S)[0]
        script="""const fs=require('fs');const cases=JSON.parse(fs.readFileSync(0,'utf8'));
        let activeService='',optionInputs=new Map();
        const money=n=>'ZAR '+(n/100).toFixed(2);
        const rebuildOptions=()=>{throw Error('unexpected DOM rebuild')};
        """+fn+"""
        const out=cases.map(c=>{activeService=c.service.id;optionInputs=new Map(c.selections.map(s=>[s.id,{value:String(s.quantity),setCustomValidity(v){this.error=v;}}]));return calculateOptions(c.service)});
        process.stdout.write(JSON.stringify(out));"""
        cases=self.f['calculation_cases']
        p=subprocess.run(['node','-e',script],input=json.dumps(cases),capture_output=True,text=True,check=True)
        for case,result in zip(cases,json.loads(p.stdout)):
            expected=case['expected'];total=expected['total'];minutes=expected['minutes']
            price='Quote required' if total is None else ('From ' if case['service']['mode']=='from' else '')+'ZAR '+format(total/100,'.2f')
            duration=' '.join(([str(minutes//60)+' hr'] if minutes//60 else [])+([str(minutes%60)+' min'] if minutes%60 else [])) or '0 min'
            self.assertEqual(result['price'],price,case['id']);self.assertEqual(result['duration'],duration,case['id'])
        # JPY test here proves integer arithmetic only; currency display is native/browser-suite territory.

    def test_06_financial_chain_and_unknown_actuals(self):
        p=self.f['preserved'];invoices=p['invoices'];payments=p['payments']
        self.assertEqual(len([i for i in invoices if i['state']!='Void']),1)
        self.assertEqual(invoices[1]['replaces_id'],invoices[0]['id'])
        self.assertEqual(payments[1]['reversal_of'],payments[0]['id'])
        self.assertEqual(sum(x['amount']*(1 if x['reversal_of'] is None else -1) for x in payments),0)
        self.assertEqual(p['counter']['value'],2)
        self.assertEqual(p['booking']['document'],invoices[0]['document'])
        self.assertIsNone(self.f['adaptation_expectations']['actual_start'])
        self.assertIsNone(self.f['adaptation_expectations']['actual_end'])
        self.assertFalse(p['staff'][0]['active'])
        self.assertEqual(len(p['assignments']),1)

    def test_07_role_contract_and_pilot_defaults(self):
        roles=json.loads((ROOT/'docs/sc02/role-actions.json').read_text())
        rows={x['id']:x for x in roles['actions']}
        self.assertEqual(len(rows),20)
        for action in ['payment.reverse','invoice.void_replace','membership.admin']:
            for role in ['manager','receptionist','worker','customer']:
                self.assertEqual(rows[action]['target'][role],'No')
        self.assertEqual(rows['visit.execute']['target']['worker'],'Currently assigned visit only')
        self.assertEqual({b['model'] for b in self.f['businesses']},{'mobile-team','individual-appointment','quote-led-field-work'})
        self.assertTrue(all(b['currency']=='ZAR' and not b['implemented_pilot'] for b in self.f['businesses']))
        defaults=json.loads((ROOT/'docs/sc02/pilot-defaults.json').read_text())
        self.assertEqual(defaults['confirmation'],'request-first');self.assertFalse(defaults['automated_customer_messages'])
        self.assertEqual(defaults['active_invoices_per_booking'],1)

    def test_08_five_steps_and_tab_draft_contract(self):
        js=(ROOT/'business/booking.js').read_text()
        self.assertIn("['service','details','schedule','contact','review']",js)
        self.assertIn("const draftKey='faraios-booking:'+location.pathname",js)
        self.assertIn('const draftAge=30*60*1000',js)
        self.assertIn('sessionStorage.setItem',js);self.assertNotIn('localStorage',js)
        self.assertIn('draft.catalogue===JSON.stringify(catalogue)',js)

if __name__=='__main__':unittest.main(verbosity=2)
