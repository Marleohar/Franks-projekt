'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { glossaryLibrary } = require('./fixtures/glossary-library.cjs');

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
    const fixture=glossaryLibrary();
    await page.evaluate(()=>{window.__payloads=0;window.qaPersistCalls=0;const old=persist;persist=()=>{window.qaPersistCalls++;return old()}});
    async function reset(){await page.evaluate(f=>{db=f.library;glossaryFilterMode='all';indexNameDisplayMode='auto';window.location.hash='#glossary';handleRouting(true);window.qaPersistCalls=0;window.qaWrites=[];},fixture);await page.locator('.glossary-table').waitFor()}
    async function state(expected,writes){
      assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(db))),expected);
      assert.equal(await page.evaluate(()=>window.qaPersistCalls),writes);assert.equal(await page.evaluate(()=>window.qaWrites.length),writes);
      assert.equal(await page.evaluate(()=>window.__payloads),0);
      assert.equal(await page.locator('#wiki-app').locator('img,svg,script,iframe,object,embed,[data-payload]').count(),0);
      if(await page.locator('.glossary-table').count())assert.equal(await page.locator('#wiki-app').evaluate(e=>[...e.querySelectorAll('*')].flatMap(n=>[...n.attributes]).filter(a=>/^on/i.test(a.name)).length),0);
    }
    await reset();await state(fixture.library,0);
    assert.equal(await page.locator('[data-glossary-edit="group"]').count(),2);assert.equal(await page.locator('[data-glossary-edit="herb"]').count(),2);
    assert.deepEqual(await page.locator('[data-glossary-edit="group"]').evaluateAll(nodes=>nodes.map(n=>n.value)),['A ordinary',fixture.botanical]);
    for(const object of fixture.library.objects)assert((await page.locator('.glossary-table').textContent()).includes(object.name));
    await page.locator('input[name="gloss_filter"][value="with_bot"]').check();assert.equal(await page.locator('[data-glossary-edit="herb"]').count(),0);await state(fixture.library,0);
    await page.locator('input[name="gloss_filter"][value="no_bot"]').check();assert.equal(await page.locator('[data-glossary-edit="group"]').count(),0);await state(fixture.library,0);
    await page.locator('input[name="gloss_filter"][value="all"]').check();await state(fixture.library,0);
    // Actual focus and blur: leaving an unchanged visible group must preserve raw legacy whitespace.
    const grouped=page.locator('[data-glossary-edit="group"]').nth(1);
    assert.deepEqual(await grouped.evaluate(n=>JSON.parse(n.dataset.glossaryArgs)),[fixture.botanical]);
    await grouped.focus();await page.locator('h1.wiki-title > span').click();await state(fixture.library,0);
    const newBot='Edited '+fixture.text;
    await grouped.fill(newBot);await page.locator('h1.wiki-title > span').click();
    let expected=structuredClone(fixture.library);for(const i of [0,1])expected.objects[i].taxonomies['Botanical Name']=newBot;await state(expected,1);
    const unassigned=page.locator('[data-glossary-edit="herb"]').first();assert.deepEqual(await unassigned.evaluate(n=>JSON.parse(n.dataset.glossaryArgs)),[fixture.specialId]);
    const assigned='Assigned '+fixture.text;await unassigned.fill(assigned);await page.locator('h1.wiki-title > span').click();expected.objects[2].taxonomies['Botanical Name']=assigned;await state(expected,2);
    assert((await page.locator('[data-glossary-edit="group"]').evaluateAll(nodes=>nodes.map(n=>n.value))).includes(assigned));
    await reset();
    for(const id of ['item%20name','item name',fixture.specialId]){
      await page.locator('.glossary-table a').evaluateAll((links,href)=>{const a=links.find(n=>n.getAttribute('href')===href);if(!a)throw Error('missing canonical link');a.dataset.qaTarget='yes'},'#herb-id/'+encodeURIComponent(id));
      await page.locator('[data-qa-target="yes"]').click();
      const object=fixture.library.objects.find(o=>o.id===id);
      await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent===name,object.name);
      assert.equal(await page.evaluate(()=>window.location.hash),'#herb-id/'+encodeURIComponent(id));
      const editor=page.locator('[data-core-action="editor"]');assert.deepEqual(await editor.evaluate(n=>JSON.parse(n.dataset.coreArgs)),['herb',id]);await editor.click();assert.equal(await page.evaluate(()=>editorTargetId),id);assert.equal(await page.locator('#popup-editor-input').inputValue(),object.desc);await page.locator('#popup-editor .popup-header button').click();
      const deletion=page.locator('[data-core-action="delete"]');assert.deepEqual(await deletion.evaluate(n=>JSON.parse(n.dataset.coreArgs)),['object',id]);await deletion.click();await state(fixture.library,0);
      await page.evaluate(()=>window.location.hash='#glossary');await page.locator('.glossary-table').waitFor();await state(fixture.library,0);
    }
    // Dismiss the first and then the second creation prompt, followed by a successful synthetic creation.
    await page.locator('[data-core-action="glossaryCreate"]').click();await state(fixture.library,0);
    answers=['Cancelled botanical',false];await page.locator('[data-core-action="glossaryCreate"]').click();await state(fixture.library,0);
    const bot='Created '+fixture.text,name='Created herb '+fixture.text;
    answers=[bot,name];await page.locator('[data-core-action="glossaryCreate"]').click();
    const created=await page.evaluate(()=>JSON.parse(JSON.stringify(db.objects.at(-1))));assert.match(created.id,/^herb_\d+$/);assert.deepEqual(created,{id:created.id,name,desc:'',props:{},taxonomies:{'Botanical Name':bot}});
    expected=structuredClone(fixture.library);expected.objects.push(created);await state(expected,1);
    assert.equal(await page.evaluate(()=>typeof firebase),'undefined');assert.equal(await page.evaluate(()=>firestoreDb),null);assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
    await page.screenshot({path:path.join(tempDir,'safe-glossary-rendering.png'),fullPage:true});
    console.log(JSON.stringify({result:'PASS',browser:browser.version(),payloadExecutions:0,injectedElements:0,errors,externalRequests,realBlurTransitions:true,canonicalCollisionIds:true,cancellationWrites:0,editScenarioWrites:2,creationScenarioWrites:1,unexpectedWrites:0,evidence:tempDir}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
