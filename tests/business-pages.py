"""Preview HTTP edit/save/reload/publish and public route tests; disposable database only."""
import unittest,sys,time
import profiles
class Pages(profiles.Profiles):
 @classmethod
 def setUpClass(cls):
  super().setUpClass()
  private=cls.private/'profiles';config=private/'config.php';config.write_text(config.read_text().replace("'base_url'=>'"+cls.url+"'","'base_url'=>'"+cls.url+"/preview'"))
  (private/'router.php').write_text("<?php $path=parse_url($_SERVER['REQUEST_URI'],PHP_URL_PATH);if(preg_match('~^/preview/account/([a-z-]+\\.php)$~',$path,$m)){$_SERVER['SCRIPT_NAME']=$path;require "+repr(str(profiles.ROOT/'account'))+".'/'.$m[1];return true;}if(preg_match('~^/preview/b/([a-z0-9-]+)(?:/(services|how-it-works|areas|contact))?$~',$path,$m)){$_GET['slug']=$m[1];$_GET['page']=$m[2]??'';$_SERVER['SCRIPT_NAME']='/preview/b/index.php';require "+repr(str(profiles.ROOT/'b/index.php'))+";return true;}return false;")
 def test_pages_editing(self):
  self.post('/preview/account/index.php?page=signin',email='a@example.test',password='test-long-password')
  path='/preview/account/profile.php';html=self.get(path)[1];self.assertIn('Website pages',html)
  data=dict(action='save',version=0,name='Pages Example',description='Business description',email='public@example.test',phone='',website='',areas='Newlands',slug='pages-example')
  data.update({'pages[services][title]':'Our services','pages[services][introduction]':'Owner service intro','pages[services][body]':'<script>owner text</script>','pages[how-it-works][steps][0][0]':'Select your clean','pages[how-it-works][steps][0][1]':'Owner first step'})
  self.assertIn('Draft saved',self.post(path,**data));html=self.get(path)[1];self.assertIn('Our services',html);self.assertIn('Select your clean',html)
  saved=self.get(path+'?view=preview&section=services')[1];self.assertIn('<h1>Our services</h1>',saved);self.assertIn('&lt;script&gt;owner text&lt;/script&gt;',saved);self.assertIn('section=contact',saved)
  self.assertEqual(self.get('/preview/b/pages-example/services')[0],404)
  self.assertIn('is published',self.post(path,action='publish',version=1,confirm_public='on'))
  for key in ['services','how-it-works','areas','contact']:
   status,html=self.get('/preview/b/pages-example/'+key);self.assertEqual(status,200);self.assertIn('aria-current="page"',html);self.assertIn('/pages-example/'+key+'"',html);self.assertIn('/pages-example/contact#enquire',html);self.assertNotIn('>Book now',html)
  status,html=self.get('/preview/b/pages-example/how-it-works');self.assertIn('Send an enquiry',html);self.assertIn('An enquiry does not reserve',html)
  self.assertIn('/pages-example/contact#enquire',self.get('/preview/b/pages-example/contact')[1])
  time.sleep(2.05)
  reply=self.post('/preview/b/pages-example/contact',name='Fictional Page Test',email='page@example.test',phone='',requirements='Synthetic local contact enquiry',website='',service='')
  self.assertIn('Your enquiry has been sent',reply);self.assertIn('/pages-example/contact#enquire',reply)
  self.assertIn('Enquire or request a quote',self.get('/preview/b/pages-example?booking=1')[1])
  data['version']=1;data['pages[services][title]']='Private revised services';self.assertIn('Draft saved',self.post(path,**data));self.assertNotIn('Private revised services',self.get('/preview/b/pages-example/services')[1])
  self.assertIn('Draft changed',self.post(path,**data))
  data['version']=2;data['pages[services][title]']='x'*121;self.assertIn('Check page content',self.post(path,**data))
  self.post('/preview/account/index.php?page=signin',email='b@example.test',password='test-long-password');self.assertNotIn('Private revised services',self.get(path)[1])
if __name__=='__main__':
 result=unittest.TextTestRunner(verbosity=2).run(unittest.TestSuite([Pages('test_pages_editing')]));sys.exit(not result.wasSuccessful())
