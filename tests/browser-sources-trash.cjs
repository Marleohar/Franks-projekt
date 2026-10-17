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

    const {library,hostile}=require('./fixtures/sources-trash-library.cjs');
    await page.evaluate(()=>{window.payloads=0;window.calls=0;const original=persist;persist=function(){calls++;return original();};});
    async function reset(){await page.evaluate(data=>{db=data;location.hash='#trash';renderTrashPage();calls=0;qaWrites=[];},library());}
    const state=()=>page.evaluate(()=>({db,calls,writes:qaWrites.length}));
    const action=(name,idx)=>page.locator('[data-core-action="'+name+'"]').nth(idx);
    const unchanged=async before=>assert.deepEqual(await state(),before);
    async function safe(){assert.equal(await page.locator('#wiki-app img,#wiki-app svg,#wiki-app [onerror],#wiki-app [onclick]').count(),0);assert.equal(await page.evaluate(()=>payloads),0);}
    await reset();const initial=await state();await safe();
    await page.evaluate(()=>renderSourcesLibraryPage());await safe();await unchanged(initial);
    for(const text of [hostile,library().sources[0].title])assert.ok((await page.locator('#wiki-app').innerText()).includes(text));
    for(const idx of [0,1,2]){
      await reset();const expected=library(),item=expected.trash.splice(idx,1)[0];
      if(idx===0)expected.objects.push(item.data);else expected[idx===1?'properties':'categories'][item.id]=item.data;
      await action('trashRestore',idx).click();assert.deepEqual(await state(),{db:expected,calls:1,writes:1});await safe();
    }
    for(const idx of [0,1,2]){
      await reset();await page.evaluate(idx=>{const item=db.trash[idx];if(idx===0)db.objects.push({id:item.data.id,keep:1});else Object.defineProperty(db[idx===1?'properties':'categories'],item.id,{value:{keep:1},enumerable:true,configurable:true});},idx);
      const before=await state();await action('trashRestore',idx).click();await unchanged(before);assert.match(dialogs.at(-1).message,/occupied/);
    }
    await reset();const invalidBefore=await state();
    await page.evaluate(()=>{for(const index of [-1,0.5,999,'0',null]){restoreFromTrash(index,trashViewGeneration);permanentDeleteTrash(index,trashViewGeneration);}});
    await unchanged(invalidBefore);
    await reset();let before=await state();await action('trashDelete',0).click();await unchanged(before);
    answers=[true];await action('trashDelete',1).focus();await page.keyboard.press('Enter');const removed=library();removed.trash.splice(1,1);assert.deepEqual(await state(),{db:removed,calls:1,writes:1});
    for(const mutation of ['shift','list','library','record','id','rerender'])for(const name of ['trashRestore','trashDelete']){
      await reset();await page.evaluate(({mutation,name})=>{
        window.saved=document.querySelector('[data-core-action="'+name+'"]');
        if(mutation==='shift')db.trash.shift();if(mutation==='list')db.trash=db.trash.slice();if(mutation==='library')db=structuredClone(db);if(mutation==='record')db.trash[0]=structuredClone(db.trash[0]);if(mutation==='id')db.trash[0].id='changed';if(mutation==='rerender')renderTrashPage();
      },{mutation,name});before=await state();await page.evaluate(()=>saved.click());await unchanged(before);assert.match(dialogs.at(-1).message,/Reopen/);
    }
    await reset();await action('trashRestore',0).focus();await page.keyboard.press('Space');assert.equal((await state()).calls,1);
    for(const width of [1280,320]){
      await page.setViewportSize({width,height:720});await reset();await safe();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'trash-'+width+'.png'),fullPage:true});
      await page.evaluate(()=>renderSourcesLibraryPage());await safe();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'sources-'+width+'.png'),fullPage:true});
    }
    await page.evaluate(()=>{db.sources=[];renderSourcesLibraryPage();});assert.ok((await page.locator('#wiki-app').innerText()).includes('Inga'));
    await page.evaluate(()=>{db.trash=[];renderTrashPage();});assert.ok((await page.locator('#wiki-app').innerText()).includes('tom'));
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);
    console.log(JSON.stringify({status:'PASS',browser:await browser.version(),payloads:await page.evaluate(()=>payloads),errors,externalRequests,completeSnapshots:true,successWrites:1,rejectionCancelRenderWrites:0,keyboard:true,mobile320:true}));
    await context.close();
  }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
