'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { systemLibrary } = require('./fixtures/system-library.cjs');

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
    const fixture = systemLibrary();
    const original = JSON.stringify(fixture.library);
    await page.evaluate(() => { window.__payloads=0; window.qaPersistCalls=0; const old=persist;persist=()=>{window.qaPersistCalls++;return old()}; });
    async function reset(system=fixture.system) {
      await page.evaluate(({f,system})=>{db=f.library;window.location.hash='#system/'+encodeURIComponent(system);handleRouting(true);window.qaPersistCalls=0;window.qaWrites=[];},{f:fixture,system});
      await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent===name,system);
    }
    async function safe() {
      for(const selector of ['#wiki-app','#sys-study-checklist','#sys-source-checklist']) {
        assert.equal(await page.locator(selector).locator('img,svg,script,iframe,object,embed,[data-payload]').count(),0);
        assert.equal(await page.locator(selector).evaluate(e=>[...e.querySelectorAll('*')].flatMap(n=>[...n.attributes]).filter(a=>/^on/i.test(a.name)).length),0);
      }
      assert.equal(await page.evaluate(()=>window.__payloads),0);
    }
    async function state(expected,writes) {
      assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(db))),expected);
      assert.equal(await page.evaluate(()=>window.qaPersistCalls),writes);
      assert.equal(await page.evaluate(()=>window.qaWrites.length),writes);
      await safe();
    }
    await reset();await safe();await state(fixture.library,0);
    const text=await page.locator('#wiki-app').textContent();
    for(const value of [fixture.system,fixture.category,fixture.property,fixture.library.systems[fixture.system].desc,...['name','type'].map(k=>fixture.library.studyObjects[0][k]),...['author','year','title'].map(k=>fixture.library.sources[0][k])])assert(text.includes(value));
    const headings=page.locator('[data-core-action="systemCategory"]');
    await headings.nth(0).click({position:{x:3,y:3}});assert.equal(await page.locator('#cat-list-0').isVisible(),false);assert.equal(await page.locator('#cat-list-1').isVisible(),true);
    await headings.nth(0).click({position:{x:3,y:3}});assert.equal(await page.locator('#cat-list-0').isVisible(),true);
    // Stop-propagation runs before bubbling to the category toggle, while navigation remains native.
    await page.evaluate(()=>{window.qaToggles=0;const old=toggleSysCategory;toggleSysCategory=(...a)=>{window.qaToggles++;return old(...a)}});
    await page.locator('[data-system-category-link]').first().click();
    await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent===name,fixture.category);
    assert.equal(await page.evaluate(()=>window.qaToggles),0);
    await reset();await page.locator('#cat-list-0 a').click();
    await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent===name,fixture.property);
    await reset();
    async function open(kind) {await page.locator(`[data-core-action="system${kind}"]`).click();await safe();}
    await open('Study');assert.equal(await page.locator('#sys-study-checklist input').count(),2);
    await page.locator('#sys-study-filter').fill('ordinary');assert.equal(await page.locator('#sys-study-checklist input').count(),1);
    await state(fixture.library,0);
    await page.locator('#sys-study-checklist input').check();
    let expected=structuredClone(fixture.library);expected.studyObjects[1].systems.push(fixture.system);await state(expected,1);
    await page.locator('#sys-study-filter').fill('');await page.locator('#sys-study-filter').fill('ordinary');
    // Inherited checklists reopen unchecked; use explicit change to exercise removal without changing that UI contract.
    await page.locator('#sys-study-checklist input').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))});
    await state(fixture.library,2);
    await page.locator('#popup-sys-study .popup-header button').click();await state(fixture.library,2);
    await reset();await open('Study');
    await page.locator('#sys-study-filter').fill('study o');
    await page.locator('#sys-study-checklist input').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))});
    expected=structuredClone(fixture.library);expected.studyObjects[0].systems=[fixture.other];await state(expected,1);
    await reset();await open('Source');await page.locator('#sys-source-filter').fill('ordinary');await state(fixture.library,0);
    await page.locator('#sys-source-checklist input').check();expected=structuredClone(fixture.library);expected.sources[1].tags.push({type:'system',id:fixture.system});await state(expected,1);
    await page.locator('#sys-source-checklist input').uncheck();await state(fixture.library,2);
    await page.locator('#sys-source-filter').fill('title');
    await page.locator('#sys-source-checklist input').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))});
    expected=structuredClone(fixture.library);expected.sources[0].tags.shift();await state(expected,3);
    await page.locator('#popup-sys-source .popup-header button').click();
    await reset();await open('Study');
    await page.evaluate(other=>renderSystemPage(other),fixture.other);
    assert.equal(await page.locator('#popup-sys-study').isVisible(),false);
    await open('Study');await page.locator('#sys-study-filter').fill('ordinary');
    await page.locator('#sys-study-checklist input').evaluate(e=>{e.checked=false;e.dispatchEvent(new Event('change',{bubbles:true}))});
    expected=structuredClone(fixture.library);expected.studyObjects[1].systems=[];await state(expected,1);
    await reset();await open('Study');await page.locator('#new-sys-study-name').fill('Synthetic created study');await page.locator('#new-sys-study-type').fill('Synthetic type');
    await page.locator('#popup-sys-study button').filter({hasText:'Skapa'}).click();
    expected=structuredClone(fixture.library);let created=await page.evaluate(()=>JSON.parse(JSON.stringify(db.studyObjects.at(-1))));assert.match(created.id,/^study_\d+$/);assert.deepEqual({...created,id:''},{id:'',name:'Synthetic created study',type:'Synthetic type',desc:'',props:{},systems:[fixture.system]});expected.studyObjects.push(created);await state(expected,1);
    await open('Source');await page.locator('#new-sys-src-title').fill('Synthetic created source');await page.locator('#new-sys-src-year').fill('2026');
    await page.locator('#popup-sys-source button').filter({hasText:'Skapa'}).click();
    created=await page.evaluate(()=>JSON.parse(JSON.stringify(db.sources.at(-1))));assert.match(created.id,/^src_\d+$/);assert.deepEqual({...created,id:''},{id:'',title:'Synthetic created source',year:'2026',author:'',tags:[{type:'system',id:fixture.system}]});expected.sources.push(created);await state(expected,2);
    await reset();await open('Source');await page.locator('#popup-sys-source').click({position:{x:5,y:5}});assert.equal(await page.locator('#popup-sys-source').isVisible(),false);await state(fixture.library,0);
    assert.equal(await page.evaluate(()=>JSON.stringify(db)),original);
    assert.equal(await page.evaluate(()=>typeof firebase),'undefined');assert.equal(await page.evaluate(()=>firestoreDb),null);
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
    await page.screenshot({path:path.join(tempDir,'safe-system-rendering.png'),fullPage:true});
    console.log(JSON.stringify({result:'PASS',browser:browser.version(),payloadExecutions:0,injectedElements:0,unexpectedWrites:0,expectedWritesByScenario:[2,1,3,1,2],finalWrites:0,errors,externalRequests,evidence:tempDir}));
    await context.close();
  } finally { if(browser)await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1});
