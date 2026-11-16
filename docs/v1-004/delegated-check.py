"""Run against a disposable snapshot of the pinned installed PR68 source."""
import sys, importlib.util, unittest, json
from pathlib import Path
snapshot=Path(sys.argv[1]).resolve();sys.path.insert(0,str(snapshot/'tests'))
spec=importlib.util.spec_from_file_location('installed_repairs',snapshot/'tests/defect-repairs.py');m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
class StaleAssignment(m.Repairs):
 def test_stale_choices_and_versions(self):
  self.enable();b=m.lit(self.bids[0]);self.sql("insert into public.business_staff(id,business_id,environment,name,email,phone) select gen_random_uuid(),"+b+",'preview','Synthetic V1004 '||lpad(n::text,3,'0'),'v1004@example.test','' from generate_series(1,101)n")
  for role in ['manager','receptionist']:
   u=self.member(role);self.login(u);bid=self.booking();staff=self.page(u,'staff')['items'];ids=[r['id']for r in staff];first,second=ids[:2]
   self.command(u,'business_staff_assign',dict(p_booking=bid,p_version=0,p_staff=[first]))
   self.command(u,'business_staff_assign',dict(p_booking=bid,p_version=1,p_staff=[first,second]))
   saved=self.page(u,'bookings',id=bid)['items'][0]
   for choices in [[],[second]]:
    data=dict(action='assign',id=bid,version='1',assignment_version='1',staff_page_ids=json.dumps(ids))
    if choices:data['staff[]']=choices[0]
    for _ in range(2):
     html=self.post('/account/delegated.php?view=bookings',**data)
     self.assertIn('Assignments changed',html);self.assertIn('Unsaved changes',html)
     recovery=html.split('<h2>Unsaved changes</h2>',1)[1].split('</form>',1)[0]
     self.assertIn('name="assignment_version" value="1"',recovery)
     self.assertIn('name="staff_page_ids"',recovery)
     self.assertEqual(m.re.findall(r'name="staff\[\]" value="([^"]+)" checked',recovery),choices)
     self.assertEqual(self.page(u,'bookings',id=bid)['items'][0],saved)
  self.enable(False)
result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([StaleAssignment('test_stale_choices_and_versions')]))
raise SystemExit(not result.wasSuccessful())
