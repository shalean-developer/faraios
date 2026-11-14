const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),AxeBuilder=require(process.env.AXE_MODULE||'@axe-core/playwright').default;
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const root=path.resolve(__dirname,'..'),browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});
try{for(const width of [1280,390,320]){
 const context=await browser.newContext({viewport:{width,height:844}}),p=await context.newPage();
 await context.route('https://example.test/**',r=>{const u=new URL(r.request().url());const file=path.join(root,u.pathname);return r.fulfill({contentType:u.pathname.endsWith('.css')?'text/css':u.pathname.endsWith('.svg')?'image/svg+xml':'text/html',body:fs.readFileSync(file)});});
 await p.goto('https://example.test/privacy.html');assert.equal(await p.getByRole('heading',{level:1}).count(),1);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 for(const [name,id] of [['Accounts','accounts'],['Enquiries and quote requests','enquiries'],['Booking requests','bookings'],['Waitlist updates','waitlist']]){
  await p.getByRole('navigation',{name:'Privacy sections'}).getByRole('link',{name,exact:true}).click();assert.equal(new URL(p.url()).hash,'#'+id);assert.equal(await p.evaluate(()=>document.activeElement.id),id);assert(await p.locator('#'+id).getByRole('heading',{name,exact:true}).isVisible());
 }
 const result=await new AxeBuilder({page:p}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();assert.deepEqual(result.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})),[]);
 if(width===390){await p.goto('https://example.test/privacy.html#bookings');await p.screenshot({path:path.join(root,'docs/evidence/privacy-bookings-mobile.png')});}
 await context.close();
}console.log('PASS privacy policy sections, focus, no overflow, accessible navigation at1280/390/320; zero axe violations');}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
