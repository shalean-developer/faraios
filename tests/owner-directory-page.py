"""Exercise real PHP page/factory/navigation with isolated Auth/reader fixtures only."""
import os, pathlib, shutil, socket, subprocess, tempfile, time, urllib.request, urllib.error
root=pathlib.Path(__file__).resolve().parents[1]
php=os.environ.get('PHP_BIN','php')
class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self,*args,**kwargs): return None
opener=urllib.request.build_opener(NoRedirect())
with tempfile.TemporaryDirectory(prefix='owner03-page-') as tmp:
    d=pathlib.Path(tmp); account=d/'account'; account.mkdir(); private=d/'private'; private.mkdir()
    for name in ['platform-directory-page.php','platform-directory.php','platform-navigation.php','platform-core.php']:
        shutil.copy(root/'account'/name, account/name)
    (private/'platform-owner.php').write_text("<?php return ['enabled'=>true,'owner_ids'=>['11111111-1111-4111-8111-111111111111']];")
    (account/'platform-session.php').write_text('''<?php
function start():void {header('Cache-Control: no-store');}
function user():array {
 $who=$_COOKIE['fixture_identity']??'';
 if($who===''){header('Location: index.php?page=signin',true,303);exit;}
 if($who==='expired')throw new RuntimeException('SECRET_EXPIRED_TOKEN');
 return ['id'=>$who==='platform'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222','email_confirmed_at'=>'2026-11-18','user_metadata'=>['platform_owner'=>true,'role'=>$who]];
}
''')
    (account/'platform-directory-https.php').write_text('''<?php
function platform_directory_https_reader():Closure{return function($resource,$query){
 if($query['q']==='failure')throw new RuntimeException('SECRET_PROVIDER_RESPONSE');
 $rows=[];
 if($query['q']!=='empty'&&$query['page']===1){
 $r=['id'=>'33333333-3333-4333-8333-333333333333','registered_at'=>'2026-11-18T10:00:00+00:00','email'=>'secret@example.invalid'];
 if($resource==='businesses')$r+=['name'=>'<script>alert(1)</script>','location_configured'=>true,'service_configured'=>false,'profile_saved'=>null,'published'=>false];
 else $r+=['email_verified'=>true,'business_associations'=>[['business_id'=>'44444444-4444-4444-8444-444444444444','role'=>'worker','active'=>false]]];
 $rows[]=$r;}
 return ['rows'=>$rows,'has_more'=>$query['page']===1,'observed_at'=>'2026-11-18T10:00:00Z'];};}
''')
    with socket.socket() as s:s.bind(('127.0.0.1',0));port=s.getsockname()[1]
    env=dict(os.environ,FARAIOS_ACCOUNT_DIR=str(private))
    log=open(d/'php.log','w+')
    server=subprocess.Popen([php,'-S',f'127.0.0.1:{port}','-t',str(d)],env=env,stdout=log,stderr=log)
    count=0
    def check(value,label):
        global count
        assert value,label
        count+=1
    def get(query='',identity='platform',method='GET',path='platform-directory-page.php'):
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
        check(status==200,'owner page')
        check('&lt;script&gt;alert(1)&lt;/script&gt;' in html and '<script>' not in html,'escaped names')
        check('secret@example.invalid' not in html,'private fields excluded')
        check('Unknown' in html and '<dd>No</dd>' in html,'unknown versus absent facts')
        check(headers['Cache-Control']=='no-store' and 'noindex' in headers['X-Robots-Tag'],'private response headers')
        check('aria-current="page">Businesses' in html and 'view=review' in html,'shared navigation')
        status,_,html=get('?view=users')
        check(status==200 and 'Worker' in html and 'Inactive' in html,'user associations')
        check('email@example' not in html,'no account contact')
        check(get(identity='')[0]==303,'anonymous redirects')
        check(get(identity='expired')[0]==401,'expired auth denied')
        for role in ['owner','manager','receptionist','worker']:
            status,_,html=get(identity=role)
            check(status==403 and '33333333-3333' not in html,'business-role denial '+role)
        for query in ['?page=0','?page=10000','?page[]=1','?q[]=x','?export=1','?environment=preview']:
            check(get(query)[0]==400,'invalid filter '+query)
        check(get('?view[]=users')[0]==404,'resource array rejected')
        check(get(method='POST')[0]==405,'write method denied')
        status,_,html=get('?q=failure')
        check(status==503 and 'SECRET' not in html,'upstream errors redacted')
        check('No matching records' in get('?q=empty')[2],'empty state')
        check('page=2' in get('?q=a%26b')[2] and 'q=a%26b' in get('?q=a%26b')[2],'pagination preserves escaped query')
        check(get(path='platform-navigation.php')[0]==404,'include-only navigation')
        print({'status':'PASS','assertions':count,'hosted_requests':0})
    finally:
        server.terminate();server.wait(timeout=5);log.close()
