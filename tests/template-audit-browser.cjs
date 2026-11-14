const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const AxeBuilder=require(process.env.AXE_MODULE||'@axe-core/playwright').default;
const cp=require('child_process'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const root=path.resolve(__dirname,'..');const logo=cp.execFileSync('python',['-c',"from PIL import Image; Image.new('RGB',(1000,120),'#214e42').save('/tmp/template-wide-logo.png')"]);const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});
const report=[];
for(const width of [1280,390,320])for(const mode of ['empty','closed','wide']){
const context=await browser.newContext({viewport:{width,height:844}});const p=await context.newPage();const html=cp.execFileSync(process.env.PHP_BIN||'php',[path.join(root,'tests/homepage-fixture.php'),mode],{encoding:'utf8',env:{...process.env,FARAIOS_TEST_LOGO_FILE:'/tmp/template-wide-logo.png'}});
await p.route('https://example.test/**',r=>r.request().url().includes('logo=1')?r.fulfill({contentType:'image/png',body:fs.readFileSync('/tmp/template-wide-logo.png')}):r.fulfill({contentType:'text/html',body:html}));await p.goto('https://example.test/b/example');for(const f of ['business/profile.css','business/homepage.css'])await p.addStyleTag({path:path.join(root,f)});
assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
if(mode==='wide'){const box=await p.locator('.home-brand img').boundingBox();assert(box.width/box.height>8,'Wide logo ratio');assert.equal(await p.locator('.home-service-card a').first().getAttribute('href'),'https://example.test/b/example?booking=1&service='+ '0'.repeat(32));}
else {assert.equal(await p.getByRole('link',{name:'Book now',exact:true}).count(),0);assert.equal(await p.locator('.home-header-actions>.home-button').getAttribute('href'),'https://example.test/b/example/contact#enquire');assert(await p.getByRole('heading',{name:'Send an enquiry',exact:true}).isVisible());}
if(mode==='empty'){assert.equal(await p.locator('select#service').count(),0);assert(await p.getByRole('link',{name:'Make an enquiry',exact:false}).isVisible());}
assert.equal(await p.locator('nav[aria-label="Footer navigation"] a').count(),4);
const results=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();report.push({width,mode,violations:results.violations.map(v=>v.id)});assert.deepEqual(results.violations,[]);
if(width===390&&mode==='empty')await p.screenshot({path:path.join(root,'docs/evidence/template-empty-mobile.png'),fullPage:true});if(width===1280&&mode==='wide')await p.screenshot({path:path.join(root,'docs/evidence/template-wide-desktop.png'),fullPage:true});await context.close();}
fs.writeFileSync(path.join(root,'docs/evidence/template-audit-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log('PASS empty/closed intake, proportional wide logo, service links, footer, overflow and axe at1280/390/320');})().catch(e=>{console.error(e);process.exit(1)});
