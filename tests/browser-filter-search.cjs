'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { filterLibrary } = require('./fixtures/filter-library.cjs');

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
    const fixture=filterLibrary(),before=JSON.stringify(fixture.library);
    await page.evaluate(f=>{db=f.library;activeFilterProps=[];indexNameDisplayMode='auto';window.__payloads=0;window.qaPersistCalls=0;const old=persist;persist=()=>{window.qaPersistCalls++;return old()};window.location.hash='#search';handleRouting(true);window.qaWrites=[];},fixture);
    async function preserved(){
      assert.equal(await page.evaluate(()=>JSON.stringify(db)),before);
      assert.equal(await page.evaluate(()=>window.qaPersistCalls),0);
      assert.equal(await page.evaluate(()=>window.qaWrites.length),0);
      assert.equal(await page.evaluate(()=>window.__payloads),0);
      assert.equal(await page.locator('#wiki-app').locator('img,iframe,object,embed,script,[data-payload]').count(),0);
      if(await page.locator('#search-prop-input').count()) assert.equal(await page.locator('#wiki-app').evaluate(e=>[...e.querySelectorAll('*')].flatMap(n=>[...n.attributes]).filter(a=>/^on/i.test(a.name)).length),0);
    }
    async function filters(expected){assert.deepEqual(await page.evaluate(()=>activeFilterProps),expected);await preserved()}
    async function back(){await page.evaluate(()=>{window.location.hash='#search'});await page.locator('#search-prop-input').waitFor();await preserved()}
    const input=page.locator('#search-prop-input');
    await filters([]);assert((await page.locator('#wiki-app').textContent()).includes('Skriv och'));
    await input.fill('ALPHA');
    const suggestions=page.locator('#search-prop-dropdown [data-core-action="filterSuggestion"]');
    assert.equal(await suggestions.count(),2);
    assert.deepEqual(await suggestions.first().evaluate(e=>JSON.parse(e.dataset.coreArgs)),[fixture.first]);
    assert((await suggestions.first().textContent()).includes(fixture.category));await preserved();
    await suggestions.first().click();await filters([fixture.first]);
    assert((await page.locator('#wiki-app').textContent()).includes(fixture.first));
    await input.fill(fixture.first.toUpperCase());await input.press('Enter');await filters([fixture.first]);
    await input.fill(fixture.second);await page.locator('[data-core-action="filterAdd"]').click();await filters([fixture.first,fixture.second]);
    const rows=page.locator('#wiki-app ul.wiki-list > li');
    const rowData=await rows.evaluateAll(items=>items.map(e=>({href:e.querySelector('a').getAttribute('href'),text:e.textContent})));
    assert.deepEqual(rowData.map(r=>r.href),['#herb-id/item%2520name','#herb-id/'+encodeURIComponent(fixture.specialId),'#herb-id/item%20name','#study/'+encodeURIComponent(fixture.library.studyObjects[0].id)]);
    assert.deepEqual(rowData.map(r=>r.text.match(/(\d+)% träff/)[1]),['100','100','50','50']);
    assert.deepEqual(rowData.map(r=>r.text.match(/\((\d+)\/(\d+) egenskaper\)/).slice(1)),[['2','2'],['2','2'],['1','2'],['1','2']]);
    assert(rowData[1].text.includes(fixture.longName.trim()));assert(rowData[3].text.includes(fixture.library.studyObjects[0].type));await preserved();
    for(const id of ['item%20name','item name',fixture.specialId]){
      const href='#herb-id/'+encodeURIComponent(id);
      await page.locator('#wiki-app ul.wiki-list a').evaluateAll((links,href)=>{const link=links.find(e=>e.getAttribute('href')===href);if(!link)throw Error('missing exact identity');link.dataset.qaIdentity='target'},href);
      await page.locator('[data-qa-identity="target"]').click();
      await page.waitForFunction(({id,name})=>window.location.hash==='#herb-id/'+encodeURIComponent(id)&&document.querySelector('h1.wiki-title > span')?.textContent===name,{id,name:fixture.library.objects.find(o=>o.id===id).name.trim()});
      assert.equal(await page.locator('h1.wiki-title > span').textContent(),fixture.library.objects.find(o=>o.id===id).name.trim());
      const editor=page.locator('[data-core-action="editor"]');assert.deepEqual(await editor.evaluate(e=>JSON.parse(e.dataset.coreArgs)),['herb',id]);
      await editor.click();assert.equal(await page.evaluate(()=>editorTargetId),id);assert.equal(await page.locator('#popup-editor-input').inputValue(),fixture.library.objects.find(o=>o.id===id).desc);
      await page.locator('#popup-editor .popup-header button').click();
      const deletion=page.locator('[data-core-action="delete"]');assert.deepEqual(await deletion.evaluate(e=>JSON.parse(e.dataset.coreArgs)),['object',id]);await deletion.click(); // dialog handler dismisses.
      await preserved();await back();
    }
    // Study result opens its read-only detail view.
    await page.locator('#wiki-app ul.wiki-list a').last().click();
    assert((await page.evaluate(()=>window.location.hash)).startsWith('#study/'));
    await page.waitForFunction(()=>document.querySelector('h1.wiki-title > span')?.textContent.startsWith('Study '));assert.equal(await page.locator('[data-core-action="delete"]').count(),0);await preserved();await back();
    await input.fill('ALPHA');assert.equal(await suggestions.count(),1);await suggestions.click();await filters([fixture.first,fixture.second,fixture.near]);
    const removes=page.locator('[data-core-action="filterRemove"]');assert.deepEqual(await removes.first().evaluate(e=>JSON.parse(e.dataset.coreArgs)),[fixture.first]);
    await removes.first().click();await filters([fixture.second,fixture.near]);
    await page.locator('[data-core-action="filterReset"]').click();await filters([]);
    await input.fill(fixture.first);await input.press('Enter');await filters([fixture.first]);
    await page.locator('[data-core-action="filterReset"]').click();await input.fill(fixture.absent);await page.locator('[data-core-action="filterAdd"]').click();await filters([fixture.absent]);assert((await page.locator('#wiki-app').textContent()).includes('Inga profiler'));
    await page.locator('[data-core-action="filterReset"]').click();await input.fill('not a property');await page.locator('[data-core-action="filterAdd"]').click();await filters([]);assert(dialogs.some(d=>d.type==='alert'));
    await input.fill('   ');assert.equal(await page.locator('#search-prop-dropdown').isVisible(),false);await preserved();
    assert.equal(await page.evaluate(()=>typeof firebase),'undefined');assert.equal(await page.evaluate(()=>firestoreDb),null);
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
    await page.screenshot({path:path.join(tempDir,'safe-filter-search.png'),fullPage:true});
    console.log(JSON.stringify({result:'PASS',browser:browser.version(),payloadExecutions:0,injectedElements:0,errors,externalRequests,persistenceCalls:0,storageWrites:0,storedRecordsUnchanged:true,canonicalCollisionIds:true,studyRouteVerified:true,evidence:tempDir}));
    await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
