'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { formulaLibrary } = require('./fixtures/formula-library.cjs');

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
    const fixture=formulaLibrary();
    await page.evaluate(()=>{window.__payloads=0;window.qaPersistCalls=0;const old=persist;persist=()=>{window.qaPersistCalls++;return old()}});
    async function reset(){await page.evaluate(f=>{db=f.library;window.location.hash='#formulas';handleRouting(true);window.qaPersistCalls=0;window.qaWrites=[];},fixture);await page.locator('[data-core-action="formulaCreate"]').waitFor()}
    async function state(expected,writes){
      assert.deepEqual(await page.evaluate(()=>JSON.parse(JSON.stringify(db))),expected);
      assert.equal(await page.evaluate(()=>window.qaPersistCalls),writes);assert.equal(await page.evaluate(()=>window.qaWrites.length),writes);
      assert.equal(await page.evaluate(()=>window.__payloads),0);assert.equal(await page.locator('#wiki-app').locator('img,svg,script,iframe,object,embed,[data-payload]').count(),0);
      assert.equal(await page.locator('#wiki-app').evaluate(e=>[...e.querySelectorAll('*')].flatMap(n=>[...n.attributes]).filter(a=>/^on/i.test(a.name)).length),0);
    }
    async function archive(){await page.evaluate(()=>window.location.hash='#formulas');await page.locator('[data-core-action="formulaCreate"]').waitFor()}
    async function open(name){await page.locator('#wiki-app ul.wiki-list a').evaluateAll((links,href)=>{const a=links.find(n=>n.getAttribute('href')===href);if(!a)throw Error('missing exact formula link');a.dataset.qaFormula='target'},'#formula/'+encodeURIComponent(name));await page.locator('[data-qa-formula="target"]').click();await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent.endsWith(name),name);assert.equal(await page.evaluate(()=>window.location.hash),'#formula/'+encodeURIComponent(name))}
    await reset();await state(fixture.library,0);
    const rows=await page.locator('#wiki-app ul.wiki-list li').evaluateAll(nodes=>nodes.map(n=>({name:n.querySelector('a').textContent,href:n.querySelector('a').getAttribute('href'),text:n.textContent})));
    assert.deepEqual(rows.map(r=>r.href),Object.keys(fixture.library.formulas).map(n=>'#formula/'+encodeURIComponent(n)));
    assert.deepEqual(rows.map(r=>+r.text.match(/(\d+) komponenter/)[1]),[1,0,2,0,0,0,0]);assert(rows[2].name.endsWith(fixture.special));
    for(const name of ['Formula%20name','Formula name',fixture.special,'Empty description']){
      await open(name);const formula=fixture.library.formulas[name];const paragraph=await page.locator('#wiki-app .wiki-paragraph').textContent();if(formula.desc)assert.equal(paragraph,formula.desc);else assert(paragraph.includes('Ingen beskrivning'));
      assert.deepEqual(await page.locator('[data-core-action="formulaDelete"]').evaluate(n=>JSON.parse(n.dataset.coreArgs)),[name]);
      await page.locator('[data-core-action="formulaDelete"]').click();assert(dialogs.at(-1).message.includes(name));await state(fixture.library,0);await archive();
    }
    await page.evaluate(()=>window.location.hash='#formula/missing');await page.locator('#wiki-app h2').waitFor();assert((await page.locator('#wiki-app').textContent()).includes('Formeln hittades inte'));await state(fixture.library,0);await page.locator('#wiki-app a').click();await page.locator('[data-core-action="formulaCreate"]').waitFor();
    await open(fixture.special);answers=['confirm'];await page.locator('[data-core-action="formulaDelete"]').click();await page.locator('[data-core-action="formulaCreate"]').waitFor();let expected=structuredClone(fixture.library);delete expected.formulas[fixture.special];await state(expected,1);
    await reset();await page.locator('[data-core-action="formulaCreate"]').click();await state(fixture.library,0);
    answers=['   '];await page.locator('[data-core-action="formulaCreate"]').click();await state(fixture.library,0);
    answers=['Formula name'];await page.locator('[data-core-action="formulaCreate"]').click();await page.waitForFunction(()=>window.location.hash==='#formula/Formula%20name'&&!!document.querySelector('[data-core-action="formulaDelete"]'));await state(fixture.library,0);await archive();
    const created='Created '+fixture.special;answers=[created];await page.locator('[data-core-action="formulaCreate"]').click();await page.waitForFunction(name=>document.querySelector('h1.wiki-title > span')?.textContent.endsWith(name),created);assert.equal(await page.evaluate(()=>window.location.hash),'#formula/'+encodeURIComponent(created));expected=structuredClone(fixture.library);expected.formulas[created]={desc:'',components:[]};await state(expected,1);
    await archive();await open(fixture.special);await state(expected,1);
    // No formula detail editor control exists on baseline. Exercise its existing entry point explicitly, then the real Save button.
    assert.equal(await page.locator('[data-core-action="editor"]').count(),0);
    await page.evaluate(name=>openEditor('formula',name),fixture.special);assert.equal(await page.evaluate(()=>editorTargetId),fixture.special);assert.equal(await page.locator('#popup-editor-input').inputValue(),fixture.description);await state(expected,1);
    const edited='Edited '+fixture.special;await page.locator('#popup-editor-input').fill(edited);await page.locator('#popup-editor .primary').click();expected.formulas[fixture.special].desc=edited;await state(expected,2);assert((await page.locator('h1.wiki-title > span').textContent()).endsWith(fixture.special));assert.equal(await page.locator('#wiki-app .wiki-paragraph').textContent(),edited);
    assert.equal(await page.evaluate(()=>typeof firebase),'undefined');assert.equal(await page.evaluate(()=>firestoreDb),null);assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
    await page.screenshot({path:path.join(tempDir,'safe-formula-rendering.png'),fullPage:true});
    console.log(JSON.stringify({result:'PASS',browser:browser.version(),payloadExecutions:0,injectedElements:0,errors,externalRequests,identityCollisions:true,cancelledWrites:0,deletionScenarioWrites:1,creationAndEditorScenarioWrites:2,unexpectedWrites:0,editorOpenedProgrammatically:true,evidence:tempDir}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
