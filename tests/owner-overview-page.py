"""Exercise real PHP page/factory/navigation with isolated Auth/reader fixtures only."""
import os, pathlib, shutil, socket, subprocess, tempfile, time, urllib.request, urllib.error
root=pathlib.Path(__file__).resolve().parents[1]
php=os.environ.get('PHP_BIN','php')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
opener=urllib.request.build_opener(NoRedirect())
with tempfile.TemporaryDirectory(prefix='owner03-page-') as tmp:
    d=pathlib.Path(tmp); account=d/'account'; account.mkdir(); private=d/'private'; private.mkdir()
    for name in ['platform-overview-page.php','platform-overview.php','platform-overview-fixtures.php','platform-directory.php','platform-navigation.php','platform-core.php']:
        shutil.copy(root/'account'/name, account/name)
    (private/'platform-owner.php').write_text("<?php return ['enabled'=>true,'owner_ids'=>['11111111-1111-4111-8111-111111111111']];")
    (account/'platform-session.php').write_text('''<?php
function cfg():array{return [];}
function start():void {header('Cache-Control: no-store');}
function user():array {
 $who=$_COOKIE['fixture_identity']??'';
 if($who===''){header('Location: index.php?page=signin',true,303);exit;}
 if($who==='expired')throw new RuntimeException('SECRET_EXPIRED_TOKEN');
 return ['id'=>in_array($who,['platform','stale','failure','bad'],true)?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026-11-18','user_metadata'=>['platform_owner'=>true,'role'=>$who]];
}
''')
    (account/'platform-directory-https.php').write_text("""<?php
function platform_directory_https_request($args,$config,$token,$rpc){
 $who=$_COOKIE['fixture_identity']??'';
 if($who==='failure')throw new RuntimeException('SECRET_PROVIDER');
 $data=['observed_at'=>gmdate('Y-m-d\\TH:i:s\\Z',time()-($who==='stale'?600:0)),'token'=>'SECRET'];
 foreach(['businesses'=>['total','published','draft','in_progress','not_started','unknown'],'users'=>['total','verified','unverified','no_business']] as $r=>$keys)foreach(['all','known_test','other'] as $cohort)$data[$r][$cohort]=array_fill_keys($keys,0);
 if($who==='bad')$data['users']['all']['total']='<script>SECRET</script>';
 return $data;
}
""")
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    env=dict(os.environ,FARAIOS_ACCOUNT_DIR=str(private))
    log=open(d/'php.log','w+')
    server=subprocess.Popen([php,'-S',f'127.0.0.1:{port}','-t',str(d)],env=env,stdout=log,stderr=log)
    count=0
    def check(value,label):
        global count
        assert value,label
        count+=1
    def get(query='',identity='platform',method='GET',path='platform-overview-page.php'):
        request=urllib.request.Request(f'http://127.0.0.1:{port}/account/{path}'+query,method=method,headers={'Cookie':'fixture_identity='+identity} if identity else {})
        try:r=opener.open(request,timeout=4)
        except urllib.error.HTTPError as e:r=e
        return r.status,r.headers,r.read().decode()
    try:
        for _ in range(30):
            try:
                with socket.create_connection(('127.0.0.1',port),timeout=.1):break
            except OSError:time.sleep(.05)
        status,headers,html=get()
        check(status==200 and 'Platform overview' in html,'owner overview')
        check('Other registrations are unclassified' in html,'classification caveat')
        check('No registrations yet' in html,'confirmed empty state')
        check('stage=published' in html and 'Development progress' in html,'permitted links')
        check(headers['Cache-Control']=='no-store' and 'noindex' in headers['X-Robots-Tag'],'private headers')
        check('SECRET' not in html,'no provider extras')
        check(get(identity='')[0]==303,'anonymous signin')
        check(get(identity='expired')[0]==401,'expired denied')
        for role in ['owner','manager','receptionist','worker']:
            status,_,html=get(identity=role)
            check(status==403 and 'Registration totals' not in html,'nonowner '+role)
        for q in ['?q=hello','?export=1','?p_test_users[]=x','?environment=preview']:
            check(get(q)[0]==400,'query rejected')
        check(get(method='POST')[0]==405,'read only')
        for who in ['stale','failure','bad']:
            status,_,html=get(identity=who)
            check(status==503 and 'SECRET' not in html and 'No registrations yet' not in html,'no fake zero '+who)
        for name in ['platform-overview.php','platform-overview-fixtures.php']:
            check(get(path=name)[0]==404,'include only '+name)
        print({'status':'PASS','assertions':count,'hosted_requests':0})
    finally:
        server.terminate();server.wait(timeout=5);log.close()
