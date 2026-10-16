'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { studyLibrary } = require('./fixtures/study-library.cjs');

async function main() {
  let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.equal((html.match(/const firebaseConfig = \{[\s\S]*?\};/g) || []).length, 1);
  html = html.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/const firebaseConfig = \{[\s\S]*?\};/, 'const firebaseConfig = {};')
    .replace(/try \{\s*firebase\.initializeApp\(firebaseConfig\);\s*firestoreDb = firebase\.firestore\(\);\s*\} catch\(e\) \{\}/,
      '// Firebase disabled before disposable security QA startup.');
  assert.equal(html.includes('firebase.initializeApp('), false);
  assert.equal(/<script\b[^>]*\bsrc=/i.test(html), false);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'franks-rendering-browser-'));
  fs.writeFileSync(path.join(tempDir, 'index.html'), html);
  const origin = 'http://127.0.0.1:8765';
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.QA_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' },
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const externalRequests = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.fulfill({
        status: 200, contentType: 'text/html; charset=utf-8', body: html,
        // Inline script/event execution is permitted, so encoding defects cannot
        // pass merely because CSP blocked the adversarial event handlers.
        headers: { 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'" }
      });
      externalRequests.push(route.request().url());
      return route.abort();
    });
    await context.addInitScript(() => {
      window.qaWrites = [];
      for (const method of ['removeItem', 'clear']) {
        const originalMethod = Storage.prototype[method];
        Storage.prototype[method] = function(...args) { window.qaWrites.push(method); return originalMethod.apply(this,args); };
      }
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.qaWrites.push(key); return original.call(this, key, value); };
    });
    const page = await context.newPage();
    const errors = [], dialogs = [];
    let answers = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message(), value: dialog.defaultValue() });
      if (answers.length) {
        const answer = answers.shift();
        if (answer === false) await dialog.dismiss(); else await dialog.accept(String(answer));
      } else await dialog.dismiss();
    });
    await page.goto(origin);

    const fixture=studyLibrary(),before=JSON.stringify(fixture.library);
    await page.evaluate(f=>{
      db=f.library;activeFilterProps=[f.first];indexNameDisplayMode='auto';window.__payloads=0;
      window.qaPersistCalls=0;persist=()=>{window.qaPersistCalls++};window.qaWrites=[];
      window.location.hash='#search';handleRouting(true);
    },fixture);
    async function preserved(){
      assert.equal(await page.evaluate(()=>JSON.stringify(db)),before);
      assert.equal(await page.evaluate(()=>window.qaPersistCalls),0);
      assert.deepEqual(await page.evaluate(()=>window.qaWrites),[]);
      assert.equal(await page.evaluate(()=>window.__payloads),0);
      assert.equal(await page.locator('#wiki-app img, #wiki-app script, #wiki-app iframe').count(),0);
    }
    async function route(hash){
      await page.evaluate(hash=>{window.location.hash=hash;handleRouting(true)},hash);
      await page.waitForTimeout(20);
      await preserved();
    }
    for(const study of fixture.library.studyObjects){
      await route('#search');
      const href='#study/'+encodeURIComponent(study.id);
      const link=page.locator('#wiki-app a').filter({hasText:study.name});
      assert.equal(await link.getAttribute('href'),href);
      await link.click();
      await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent===name,study.name);
      assert.equal(await page.locator('h1.wiki-title > span').textContent(),study.name);
      const text=await page.locator('#wiki-app').textContent();
      assert(text.includes(study.desc));assert(text.includes(study.type));assert(!text.includes('Unrelated'));
      assert.equal(await page.locator('#wiki-app a[href^="#system/"]').count(),2);
      assert.equal(await page.locator('#wiki-app a[href^="#property/"]').count(),1);
      assert.equal(await page.locator('#wiki-app [data-core-action]').count(),0);await preserved();
      await route('#index');await route(href);
      assert.equal(await page.locator('h1.wiki-title > span').textContent(),study.name);
    }
    for(const hash of ['#study','#study/','#study/missing','#study/%','#study/%ZZ','#study/%E0%A4','#study/ordinary/extra']){
      await route(hash);assert.equal(await page.locator('h1.wiki-title > span').textContent(),'Studieobjekt hittades inte');
    }
    await route('#search');
    await page.locator('#wiki-app a[href="#herb-id/item%2520name"]').click();
    await page.waitForFunction(()=>document.querySelector('h1.wiki-title > span')?.textContent.startsWith('Literal '));
    assert.equal(await page.locator('h1.wiki-title > span').textContent(),fixture.library.objects[0].name);await preserved();

    // Fresh document bookmarks: inject synthetic memory before the app's startup router.
    // No storage seeding, Firebase, or replacement router is used.
    await context.addInitScript(f => {
      window.addEventListener('DOMContentLoaded', () => {
        db=f.library;window.__payloads=0;window.qaPersistCalls=0;
        persist=()=>{window.qaPersistCalls++};
      });
    },fixture);
    for(const study of fixture.library.studyObjects){
      const direct=await context.newPage();
      direct.on('pageerror',error=>errors.push(error.message));
      await direct.goto(origin+'/#study/'+encodeURIComponent(study.id));
      assert.equal(await direct.locator('h1.wiki-title > span').textContent(),study.name);
      assert.equal(await direct.evaluate(()=>JSON.stringify(db)),before);
      assert.equal(await direct.evaluate(()=>window.qaPersistCalls),0);
      assert.deepEqual(await direct.evaluate(()=>window.qaWrites),[]);
      assert.equal(await direct.evaluate(()=>window.__payloads),0);
      await direct.close();
    }
    assert.equal(await page.evaluate(()=>typeof firebase),'undefined');assert.equal(await page.evaluate(()=>firestoreDb),null);
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
    console.log(JSON.stringify({result:'PASS',browser:browser.version(),studyIds:fixture.library.studyObjects.length,freshBookmarks:9,malformedOrMissing:7,
      exactSnapshots:true,persistenceCalls:0,storageWrites:0,payloadExecutions:0,errors,externalRequests}));
    await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
