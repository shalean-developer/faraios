// Actual PHP renderer and upload helper; synthetic content only, no hosted writes.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('fs'),path=require('path'),assert=require('assert'),cp=require('child_process');
(async()=>{const root=path.resolve(__dirname,'..'),browser=await chromium.launch({executablePath:process.env.BROWSER_BIN,headless:true,args:['--no-sandbox']});
const png=cp.execFileSync('python3',['-c',"from PIL import Image;import io,sys;out=io.BytesIO();Image.new('RGB',(640,400),'navy').save(out,format='PNG');sys.stdout.buffer.write(out.getvalue())"]);
for(const width of [1280,390,320])for(const section of ['','services']){
 const p=await browser.newPage({viewport:{width,height:844}}),html=cp.execFileSync(process.env.PHP_BIN||'php',[path.join(root,'tests/homepage-fixture.php'),'service-photo',section],{encoding:'utf8'});
 await p.route('https://example.test/**',r=>r.request().url().includes('service_image=')?r.fulfill({contentType:'image/png',body:png}):r.request().url().includes('mode=header')?r.fulfill({json:{authenticated:false}}):r.fulfill({contentType:'text/html',body:html}));
 await p.goto('https://example.test/b/example'+(section?'/'+section:''));for(const file of ['business/profile.css','business/homepage.css'])await p.addStyleTag({path:path.join(root,file)});
 assert.equal(await p.locator('.home-service-card').count(),3);assert.equal(await p.locator('.service-photo').count(),1);assert.equal(await p.locator('.service-photo').getAttribute('alt'),'Example service photograph');
 await p.locator('.service-photo').scrollIntoViewIfNeeded();await p.waitForFunction(()=>document.querySelector('.service-photo').naturalWidth===640);
 const photo=await p.locator('.service-photo').evaluate(e=>({width:e.clientWidth,height:e.clientHeight,fit:getComputedStyle(e).objectFit}));assert(Math.abs(photo.width/photo.height-1.6)<.03);assert.equal(photo.fit,'cover');assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await p.close();
}
const p=await browser.newPage();let posts=0;
await p.route('https://example.test/**',r=>{if(r.request().method()==='POST'){posts++;assert(r.request().postDataBuffer().length<250000);return r.fulfill({body:'Draft saved'});}return r.fulfill({contentType:'text/html',body:'<form method="post" enctype="multipart/form-data" data-profile-images><input id="service_image" name="service_image" type="file"><button>Save draft</button></form>'});});
await p.goto('https://example.test/editor');await p.addScriptTag({path:path.join(root,'account/profile-images.js')});
const source=cp.execFileSync('python3',['-c',"from PIL import Image;import random,io,sys;r=random.Random(17);im=Image.frombytes('RGB',(2400,1200),r.randbytes(2400*1200*3));out=io.BytesIO();im.save(out,format='PNG');sys.stdout.buffer.write(out.getvalue())"],{maxBuffer:12000000});assert(source.length>650000);
await p.locator('#service_image').setInputFiles({name:'service.png',mimeType:'image/png',buffer:source});await p.getByRole('button',{name:'Save draft'}).click();await p.getByText('Draft saved',{exact:true}).waitFor();assert.equal(posts,1);
await browser.close();console.log('PASS service images: proportional card display at1280/390/320, mixed image/no-image cards, alt text, lazy loading and >8MB PNG reduced before a single bounded save');})().catch(e=>{console.error(e);process.exit(1)});
