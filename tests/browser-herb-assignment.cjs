'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');


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
    const fixture = { objects: [{id:'herb', name:'Synthetic herb', props:{}, extra:{keep:1}}],
      trash:[], formulas:{}, categories: {'Unused \u00c5 <b>"': {system:'System',subcategories:[]}, Empty:{system:'System',subcategories:[]}},
      systems: {'Ospecifierade kategorier':{categories:[],desc:'Kategorier som saknar skola.'},System:{categories:['Unused \u00c5 <b>"', 'Empty']}}, systemOrder:['System','Ospecifierade kategorier'],
      properties: {One:{category:'Unused \u00c5 <b>"'}, Two:{category:'Unused \u00c5 <b>"'}, Three:{category:'Unused \u00c5 <b>"'}},
      sources:[], studyObjects:[], metadata:{keep:['all']} };
    await page.evaluate(() => { window.qaPersistCalls=0; const original=persist; persist=function(){ window.qaPersistCalls++; return original(); }; });
    async function reset(props={}) {
      await page.evaluate(data => { db=data; window.location.hash='#herb-id/herb'; renderHerbPage('herb'); qaPersistCalls=0; qaWrites=[]; }, {...structuredClone(fixture), objects:[{...fixture.objects[0],props}]});
    }
    async function state() { return page.evaluate(() => ({db, calls:qaPersistCalls,writes:qaWrites.length})); }
    const choose=()=>page.locator('[data-core-action="chooseCategory"]').click();
    const category=()=>page.locator('#assign-category-list button').filter({hasText:'Unused'}).click();
    const save=()=>page.getByRole('button',{name:'Spara kopplingar',exact:true}).click();
    const cancel=()=>page.locator('#popup-assign-prop').getByRole('button',{name:'Avbryt',exact:true}).click();
    const check=name=>page.locator('#assign-props-checklist label').filter({hasText:name}).locator('input');
    await reset(); await choose();
    assert.equal(await page.locator('#assign-category-list button').count(),2);
    assert.ok((await page.locator('#assign-category-list').innerText()).includes('Unused \u00c5 <b>"'));
    assert.equal(await page.locator('#assign-category-list b').count(),0);
    await page.locator('#assign-category-filter').fill('Empty');
    await page.locator('#assign-category-list button').click();
    assert.ok((await page.locator('#assign-props-checklist').innerText()).includes('Inga egenskaper'));
    await save(); assert.deepEqual(await state(),{db:fixture,calls:0,writes:0});
    await choose(); await category(); await check('One').check(); await cancel();
    assert.deepEqual(await state(),{db:fixture,calls:0,writes:0});
    await choose(); await category(); assert.equal(await check('One').isChecked(),false); await save();
    assert.deepEqual(await state(),{db:fixture,calls:0,writes:0});
    await choose(); await category(); await check('One').check(); await check('Two').check(); await save();
    const assigned=structuredClone(fixture); assigned.objects[0].props={One:true,Two:true};
    assert.deepEqual(await state(),{db:assigned,calls:1,writes:1});
    await page.screenshot({path:path.join(__dirname,'herb-assignment.png'),fullPage:true});
    await page.reload();
    await page.evaluate(() => { const original=persist; persist=function(){ window.qaPersistCalls++; return original(); }; });
    assert.deepEqual(await page.evaluate(()=>db),assigned);
    await page.locator('[data-core-action="assign"]').click();
    assert.equal(await check('One').isChecked(),true); await save();
    for (const value of [0, 'dose', {amount:2,metadata:['preserved']}, ['legacy']]) {
      await reset({One:value,Two:false}); await choose(); await category(); await save();
      const expected=structuredClone(fixture); expected.objects[0].props={One:value,Two:false};
      assert.deepEqual(await state(),{db:expected,calls:0,writes:0});
      await choose(); await category(); await check('Three').check(); await save();
      expected.objects[0].props.Three=true;
      assert.deepEqual(await state(),{db:expected,calls:1,writes:1});
    }
    await reset({One:'dose',Two:false}); await choose(); await category(); await check('One').uncheck(); await save();
    const removed=structuredClone(fixture); removed.objects[0].props={Two:false};
    assert.deepEqual(await state(),{db:removed,calls:1,writes:1});
    for (const mutation of ['herb','category','property','library','moved']) {
      await reset(); await choose(); await category(); await check('One').check();
      await page.evaluate(kind=>{
        if(kind==='herb') db.objects=[];
        if(kind==='category') delete db.categories['Unused \u00c5 <b>"'];
        if(kind==='property') delete db.properties.One;
        if(kind==='library') db=JSON.parse(JSON.stringify(db));
        if(kind==='moved') db.properties.One.category='Empty';
      },mutation);
      const before=await state(); await save(); assert.deepEqual(await state(),before);
    }
    await reset(); await choose(); await category(); await check('One').check();
    await page.evaluate(()=>db.objects[0].name='Renamed'); await save();
    assert.equal((await state()).db.objects[0].props.One,true);
    assert.deepEqual(errors,[]); assert.deepEqual(externalRequests,[]);
    console.log(JSON.stringify({status:'PASS', scenarios: 'empty herb/category, search, hostile names, multi-assign, cancel/reopen, no-op, exact snapshots and independent storage writes, non-Boolean and false preservation, removal, reload, existing editor, stale references, renamed herb', errors,externalRequests}));
    await context.close();
  } finally { if (browser) await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
