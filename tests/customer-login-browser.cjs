const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const AxeBuilder=require(process.env.AXE_MODULE||'@axe-core/playwright').default;
const assert=require('assert'),fs=require('fs'),path=require('path');
(async()=>{const root=path.resolve(__dirname,'..'),base=process.env.CUSTOMER_TEST_URL;const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});const report=[];
for(const width of [1280,390,320]){
 const context=await browser.newContext({viewport:{width,height:844}}),p=await context.newPage();
 await p.route('**/preview/business/*',r=>{const file=path.basename(new URL(r.request().url()).pathname);return r.fulfill({path:path.join(root,'business',file)});});
 await p.route('**/preview/ui/*',r=>{const file=path.basename(new URL(r.request().url()).pathname);return r.fulfill({path:path.join(root,'ui',file)});});
 await p.goto(base+'/preview/b/header-one');await p.getByRole('link',{name:'Sign in',exact:true}).click();assert((await p.url()).includes('/account/customer.php?slug=header-one'));
 await p.getByLabel('Email address',{exact:true}).fill('a@example.test');await p.getByLabel('Password',{exact:true}).fill('test-long-password');await p.getByRole('button',{name:'Sign in',exact:true}).click();
 await p.getByRole('link',{name:'Your account',exact:true}).waitFor();assert.equal(new URL(p.url()).pathname,'/preview/b/header-one');
 await p.getByRole('link',{name:'Your account',exact:true}).click();assert(await p.getByRole('heading',{name:'Your account',exact:true}).isVisible());assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 const axe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(axe.violations.map(x=>x.id),[]);
 await p.goto(base+'/preview/b/header-two');assert(await p.getByRole('link',{name:'Sign in',exact:true}).isVisible());
 await p.goto(base+'/preview/account/customer.php?slug=header-one&return=contact');await p.getByRole('button',{name:'Sign out',exact:true}).click();assert.equal(new URL(p.url()).pathname,'/preview/b/header-one/contact');await p.getByRole('link',{name:'Sign in',exact:true}).waitFor();
 await p.goto(base+'/preview/account/customer.php?slug=header-one');
 if(width===1280)await p.screenshot({path:path.join(root,'docs/evidence/customer-login-local.png')});
 const guestAxe=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();assert.deepEqual(guestAxe.violations.map(x=>x.id),[]);
 report.push({width,login:true,avatar:true,logout:true,businessIsolation:true,returnNavigation:true,axeViolations:0});await context.close();
}
await browser.close();fs.writeFileSync(path.join(root,'docs/evidence/customer-login-browser.json'),JSON.stringify(report,null,2)+'\n');console.log('PASS real PHP customer browser journey at 1280/390/320; six axe scans');})().catch(e=>{console.error(e);process.exit(1)});
