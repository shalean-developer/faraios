const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{const root=path.resolve(__dirname,'..'),base=process.env.PROFILE_TEST_URL;const browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});const context=await browser.newContext(),p=await context.newPage();
await p.route('**/preview/account/*.js*',r=>r.fulfill({path:path.join(root,'account',path.basename(new URL(r.request().url()).pathname))}));
await p.goto(base+'/preview/account/index.php?page=signin');await p.getByLabel('Email address',{exact:true}).fill('a@example.test');await p.getByLabel('Password',{exact:true}).fill('test-long-password');await p.getByRole('button',{name:'Sign in',exact:true}).click();
await p.goto(base+'/preview/account/profile.php');let posts=0,bytes=0;p.on('request',r=>{if(r.method()==='POST'&&new URL(r.url()).pathname.endsWith('/profile.php')){posts++;bytes=r.postDataBuffer()?.length||0;}});
// An actual >650KB source image would previously hit the aggregate request cap.
for(const id of ['logo','hero_image','social_image'])await p.locator('#'+id).setInputFiles(process.env.PROFILE_TEST_IMAGE);
await p.getByText('Website style & public address',{exact:true}).click();await p.locator('#header-show-name').selectOption('no');await p.getByRole('button',{name:'Save draft',exact:true}).click();
await p.getByText('Draft saved. Your published page has not changed.',{exact:true}).waitFor().catch(async e=>{console.error(await p.locator('body').innerText());throw e;});assert.equal(posts,1);assert(bytes<650000,'bounded multipart request');assert.equal(await p.locator('#header-show-name').inputValue(),'no');
// Wrong type and oversized source are rejected before any save request.
await p.locator('#logo').setInputFiles({name:'bad.txt',mimeType:'text/plain',buffer:Buffer.from('not an image')});await p.getByText('Choose a PNG, JPG or WebP image.',{exact:true}).waitFor();assert.equal(await p.locator('#logo').evaluate(e=>e.checkValidity()),false);
await p.locator('#logo').setInputFiles({name:'huge.png',mimeType:'image/png',buffer:Buffer.alloc(10000001)});await p.getByText('Choose an image up to 10 MB.',{exact:true}).waitFor();assert.equal(await p.locator('#logo').evaluate(e=>e.checkValidity()),false);assert.equal(posts,1);
await p.locator('#logo').setInputFiles([]);assert.equal(await p.locator('#logo').evaluate(e=>e.checkValidity()),true);
await browser.close();console.log(JSON.stringify({optimizedUploads:3,saveRequests:posts,multipartBytes:bytes,rejectedTypes:true,rejectedSourceLimit:true}));})().catch(e=>{console.error(e);process.exit(1)});
