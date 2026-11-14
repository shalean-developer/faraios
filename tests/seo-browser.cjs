// Real renderer, synthetic HTTP fixture. No hosted writes or external provider calls.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const AxeBuilder=require(process.env.AXE_MODULE||'@axe-core/playwright').default;
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert'),cp=require('child_process');
(async()=>{
 const root=path.resolve(__dirname,'..'),report={environment:'Synthetic local PHP-rendered fixtures; Chromium; no field data',viewports:[1280,390,320],accessibility:[],mobileLab:[]};
 // Exercise the full allowed 150 KB image transfer, not a tiny transparent LCP fixture.
 const hero=cp.execFileSync(process.env.PYTHON_BIN||'python',['-c',`from PIL import Image
import random,io,sys
rng=random.Random(22)
im=Image.frombytes('RGB',(1200,630),rng.randbytes(1200*630*3))
for quality in range(80,4,-1):
 out=io.BytesIO();im.save(out,format='JPEG',quality=quality)
 if len(out.getvalue())<=150000:
  raw=out.getvalue();sys.stdout.buffer.write(raw+b'\\0'*(150000-len(raw)));break
`]);report.heroFixture={bytes:hero.length,width:1200,height:630,content:'Synthetic raster, maximum allowed transfer'};
 const fixtureDir=fs.mkdtempSync(path.join(require('os').tmpdir(),'faraios-seo-'));const heroFile=path.join(fixtureDir,'hero.jpg');fs.writeFileSync(heroFile,hero);
 const server=http.createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/account/header-session.php'){res.setHeader('Content-Type','application/json');return res.end('{"authenticated":false}');}
  if(/\.(css|js)$/.test(url.pathname)){const file=path.join(root,url.pathname);res.setHeader('Content-Type',url.pathname.endsWith('.css')?'text/css':'text/javascript');return res.end(fs.readFileSync(file));}
  if(url.pathname==='/hero.png'){res.setHeader('Content-Type','image/jpeg');return res.end(hero);}
  const page=url.pathname.split('/')[3]||'',custom=url.searchParams.get('custom')==='1';
  let html=cp.execFileSync(process.env.PHP_BIN||'php',[path.join(root,'tests/homepage-fixture.php'),custom?'custom':'legacy',page],{encoding:'utf8',env:{...process.env,FARAIOS_TEST_HERO_FILE:heroFile}});
  const origin='http://127.0.0.1:'+server.address().port;
  html=html.replaceAll('https://example.test',origin).replace('</head>', ['business/profile.css','business/homepage.css',...(!page||page==='contact'?['ui/select.css']:[])].map(x=>'<link rel="stylesheet" href="/'+x+'">').join('')+'</head>').replace('</body>',['ui/booking-header.js',...(!page||page==='contact'?['ui/select.js']:[])].map(x=>'<script src="/'+x+'" defer></script>').join('')+'</body>');
  res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);
 });await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});
 try{
 for(const width of report.viewports)for(const page of ['','services','how-it-works','areas','contact']){
  const context=await browser.newContext({viewport:{width,height:844}});const p=await context.newPage();await p.goto(base+'/b/example'+(page?'/'+page:''));
  assert.equal(await p.getByRole('heading',{level:1}).count(),1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const levels=await p.locator('h1,h2,h3').evaluateAll(es=>es.filter(e=>e.getClientRects().length).map(e=>Number(e.tagName[1])));for(let i=1;i<levels.length;i++)assert(levels[i]<=levels[i-1]+1,`${width} ${page}: skipped heading`);
  const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  report.accessibility.push({width,page:page||'home',violations:axe.violations.map(v=>({id:v.id,impact:v.impact,nodes:v.nodes.map(n=>({target:n.target,summary:n.failureSummary}))}))});
  const sizes=await p.locator('.home-header nav a').evaluateAll(es=>es.map(e=>({text:e.textContent,height:e.getBoundingClientRect().height})));assert(sizes.every(s=>s.height>=44));
  if(width===390&&page==='services')await p.screenshot({path:path.join(root,'docs/evidence/business-seo-mobile.png'),fullPage:true});
  // Keyboard skip link must receive focus first and point at main content.
  await p.keyboard.press('Tab');assert.equal(await p.evaluate(()=>document.activeElement.textContent.trim()),'Skip to content');await p.keyboard.press('Enter');assert.equal(await p.evaluate(()=>document.activeElement.id),'homepage');
  await context.close();
 }
 for(const custom of [false,true])for(let run=1;run<=3;run++){
  const p=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:1});const cdp=await p.context().newCDPSession(p);
  await cdp.send('Network.enable');await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:1.6*1024*1024/8,uploadThroughput:750*1024/8});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
  await p.addInitScript(()=>{window.lab={lcp:0,cls:0,longTasks:[],events:[]};new PerformanceObserver(l=>{for(const e of l.getEntries())window.lab.lcp=e.startTime}).observe({type:'largest-contentful-paint',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())if(!e.hadRecentInput)window.lab.cls+=e.value}).observe({type:'layout-shift',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.lab.longTasks.push(e.duration)}).observe({type:'longtask',buffered:true});new PerformanceObserver(l=>{for(const e of l.getEntries())window.lab.events.push({name:e.name,duration:e.duration,delay:e.processingStart-e.startTime,processing:e.processingEnd-e.processingStart,interactionId:e.interactionId})}).observe({type:'event',durationThreshold:16,buffered:true});});
  await p.goto(base+'/b/example'+(custom?'?custom=1':''));await p.getByRole('link',{name:'Sign in',exact:true}).waitFor();await p.waitForTimeout(500);
  await p.getByRole('combobox',{name:'Service optional',exact:true}).tap();await p.getByRole('option',{name:'Deep cleaning',exact:true}).tap();await p.waitForTimeout(100);
  const lab=await p.evaluate(()=>({...window.lab,ttfb:performance.getEntriesByType('navigation')[0].responseStart,domBytes:document.documentElement.outerHTML.length,resources:performance.getEntriesByType('resource').map(r=>({name:new URL(r.name).pathname,bytes:r.transferSize}))}));
  report.mobileLab.push({customHero:custom,run,...lab});assert(lab.cls<=0.1);assert(lab.lcp<2500);assert(Math.max(0,...lab.longTasks)<200);assert(Math.max(0,...lab.events.filter(e=>e.interactionId>0).map(e=>e.duration))<200);
  await p.close();
 }
 fs.writeFileSync(path.join(root,'docs/evidence/business-seo-checks.json'),JSON.stringify(report,null,2)+'\n');
 const failures=report.accessibility.filter(r=>r.violations.length);assert.deepEqual(failures,[],'Accessibility violations (see evidence JSON)');
 console.log(JSON.stringify({accessibilityPages:report.accessibility.length,violations:failures.length,mobileLab:report.mobileLab.map(x=>({customHero:x.customHero,run:x.run,lcp:x.lcp,cls:x.cls,maxTask:Math.max(0,...x.longTasks),maxInteraction:Math.max(0,...x.events.filter(e=>e.interactionId>0).map(e=>e.duration))}))},null,2));
 }finally{await browser.close();await new Promise(r=>server.close(r));fs.rmSync(fixtureDir,{recursive:true});}
})().catch(e=>{console.error(e);process.exit(1)});
