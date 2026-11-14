const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const AxeBuilder=require(process.env.AXE_MODULE||'@axe-core/playwright').default;
const assert=require('assert'),fs=require('fs'),path=require('path');
(async()=>{const root=path.resolve(__dirname,'..'),base=process.env.CUSTOMER_TEST_URL;const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});const report=[];
for(const width of [1280,390,320]){
 const context=await browser.newContext({viewport:{width,height:844}}),p=await context.newPage();
 await p.route('**/preview/business/*',r=>{const file=path.basename(new URL(r.request().url()).pathname);return r.fulfill({path:path.join(root,'business',file)});});
 await p.route('**/preview/ui/*',r=>{const file=path.basename(new URL(r.request().url()).pathname);return r.fulfill({path:path.join(root,'ui',file)});});
 await p.goto(base+'/preview/b/header-one');await p.getByRole('link',{name:'Customer help',exact:true}).click();
 assert((await p.url()).includes('/account/customer.php?slug=header-one'));
 assert(await p.getByRole('heading',{name:'Customer help',exact:true}).isVisible());
 assert.equal(await p.locator('input[type=password]').count(),0);
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(x=>x.id),[]);
 await p.goto(base+'/preview/b/header-two');await p.getByRole('link',{name:'Customer help',exact:true}).click();
 assert((await p.url()).includes('slug=header-two'));
 await p.goto(base+'/preview/account/customer.php?slug=header-one&return=services');
 await p.getByRole('link',{name:'Back to SEO Example',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/preview/b/header-one/services');
 report.push({width,customerHelp:true,noPassword:true,businessIsolation:true,returnNavigation:true,axeViolations:0});await context.close();
}
await browser.close();fs.writeFileSync(path.join(root,'docs/evidence/customer-login-browser.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS real PHP guest customer-help journey at 1280/390/320; three axe scans');})().catch(e=>{console.error(e);process.exit(1)});
