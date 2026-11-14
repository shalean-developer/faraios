const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const AxeBuilder=require(process.env.AXE_MODULE||'@axe-core/playwright').default;
const cp=require('child_process'),fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const root=path.resolve(__dirname,'..');const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});let report=[];
for(const width of [1280,390,320])for(const size of ['32','48','64','80'])for(const logo of [false,true]){
 const context=await browser.newContext({viewport:{width,height:844}});const page=await context.newPage();
 let fixture=fs.readFileSync(path.join(root,'tests/homepage-fixture.php'),'utf8').replace("$page=$argv[2]??'';",`$p['presentation']=['logo_size'=>'${size}','show_name'=>'no'];$page=$argv[2]??'';`);
 const file='/tmp/header-branding-fixture.php';fs.writeFileSync(file,fixture.replaceAll("dirname(__DIR__)",JSON.stringify(root)));
 const html=cp.execFileSync(process.env.PHP_BIN,[file,logo?'wide':'empty'],{encoding:'utf8',env:{...process.env,FARAIOS_TEST_LOGO_FILE:'/tmp/template-wide-logo.png'}});
 await page.route('https://example.test/**',r=>r.request().url().includes('logo=1')?r.fulfill({contentType:'image/png',body:fs.readFileSync('/tmp/template-wide-logo.png')}):r.fulfill({contentType:'text/html',body:html}));
 await page.goto('https://example.test/b/example');for(const f of ['business/profile.css','business/homepage.css'])await page.addStyleTag({path:path.join(root,f)});
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 assert.equal(await page.locator('.home-brand').getAttribute('aria-label'),'Independent Example');
 assert.equal(await page.locator('.home-brand .home-sr').count(),logo?1:0);
 if(logo){const box=await page.locator('.home-brand img').boundingBox();assert(box.height<=Math.min(+size,width<651?48:80));assert(Math.abs(box.width/box.height-1000/120)<.1);}
 const axe=await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(x=>x.id),[]);report.push({width,size,logo,overflow:false,axeViolations:0});await context.close();
}
fs.writeFileSync(path.join(root,'docs/evidence/header-branding-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();console.log('PASS 24 responsive logo/toggle/fallback/accessible name/axe combinations');})().catch(e=>{console.error(e);process.exit(1)});
