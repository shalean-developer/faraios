"""Read-only hosted preview checks. GET only: no profiles saved or requests submitted."""
import concurrent.futures,json,os,urllib.request,urllib.error,xml.etree.ElementTree as ET
from seo import Head,NoRedirect
BASE='https://www.faraios.com/_accounts-preview'
SLUG='faraios-demo-cleaning'
ROOT=BASE+'/b/'+SLUG

def read(url):
 try:r=urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url,headers={'User-Agent':'FaraiOS-Preview-SEO-Verification/1.0'}),timeout=45)
 except urllib.error.HTTPError as e:r=e
 return r.code,r.headers,r.read().decode('utf-8')
def check(task):
 kind,url,target=task;status,headers,html=read(url);head=Head(html)
 if kind=='page':
  assert status==200,(url,status);assert 'noindex' in headers.get('X-Robots-Tag','');assert head.meta['robots']=='noindex,nofollow';assert head.canonical==[url];assert head.meta['og:url']==url;assert head.meta['description'];assert head.meta['og:title']==head.title
  graph=head.schemas[0]['@graph'];assert graph[0]['name']=='Bright & Co Cleaning';assert graph[0]['@type']=='Organization';assert 'address' not in graph[0];assert 'aggregateRating' not in graph[0];assert graph[1]['itemListElement'][-1]['item']==url
  if url.endswith(('/services','/how-it-works','/areas')):assert 'ui/select.js' not in html
 elif kind=='redirect':assert status==301,(url,status);assert headers['Location']==target,(url,headers.get('Location'))
 elif kind=='missing':assert status==404,(url,status);assert 'noindex' in headers.get('X-Robots-Tag','');assert not head.canonical;assert not head.schemas
 elif kind=='booking':assert status==200,(url,status);assert 'noindex' in headers.get('X-Robots-Tag','');assert head.meta['robots']=='noindex,nofollow';assert not head.canonical;assert not head.schemas;assert 'og:url' not in head.meta
 elif kind=='sitemap':assert status==200,(url,status);assert len(ET.fromstring(html))==0;assert 'noindex' in headers.get('X-Robots-Tag','');assert SLUG not in html
 elif kind=='private':assert status in [200,303],(url,status);assert 'noindex' in headers.get('X-Robots-Tag','');assert not head.canonical
 elif kind=='asset':assert status==200,(url,status);assert 'noindex' in headers.get('X-Robots-Tag','')
 elif kind=='production-sitemap':assert status==200,(url,status);assert [e.text for e in ET.fromstring(html).iter('{http://www.sitemaps.org/schemas/sitemap/0.9}loc')]==['https://www.faraios.com/']
 return {'kind':kind,'url':url,'status':status,'robots':headers.get('X-Robots-Tag'),'pass':True}
if __name__=='__main__':
 tasks=[('page',ROOT+('/'+p if p else ''),None) for p in ['','services','how-it-works','areas','contact']]
 tasks += [('redirect',ROOT+'/',ROOT),('redirect',ROOT+'/services/',ROOT+'/services'),('redirect',ROOT+'?utm_source=seo-check',ROOT),('redirect',BASE+'/b/FARAIOS-DEMO-CLEANING/SERVICES',ROOT+'/services'),('redirect',BASE+'/b/index.php?slug='+SLUG,ROOT),('redirect',ROOT+'?slug=another-business&page=contact',ROOT)]
 tasks += [('missing',ROOT+'/not-a-page',None),('missing',BASE+'/b/nonexistent-seo-verification-business',None)]
 tasks += [('booking',ROOT+'?booking=1'+('&step='+step if step else ''),None) for step in ['','service','details','schedule','contact','review']]
 tasks += [('sitemap',BASE+'/sitemap.xml',None),('private',BASE+'/account/profile.php',None),('private',BASE+'/account/index.php?page=signin',None),('asset',BASE+'/business/homepage.css?v=seo-1',None),('asset',BASE+'/',None),('production-sitemap','https://www.faraios.com/sitemap.xml',None)]
 results=[]
 with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
  for result in pool.map(check,tasks):results.append(result);print('PASS',result['kind'],result['status'],result['url'],flush=True)
 if os.environ.get('SEO_HOSTED_REPORT'):
  with open(os.environ['SEO_HOSTED_REPORT'],'w') as f:json.dump(results,f,indent=2);f.write('\n')
 print('PASS',len(results),'read-only hosted SEO checks',flush=True)
