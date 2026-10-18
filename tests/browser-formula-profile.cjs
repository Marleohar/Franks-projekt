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
  html=html.replace('</body>',`<script>
    const directPersist=persist;persist=function(...args){directQARecord('persist');return directPersist(...args);};
    firestoreDb={collection(){return {doc(){return {onSnapshot(){},set(value){directQARecord('cloud',JSON.stringify(value));return Promise.resolve();}};}};}};isCloudReady=true;
    const directRead=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.directImportDone=false;this.addEventListener('loadend',()=>window.directImportDone=true,{once:true});return directRead.apply(this,args);};
  </script></body>`);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'franks-rendering-browser-'));
  fs.writeFileSync(path.join(tempDir, 'index.html'), html);
  const origin = 'http://127.0.0.1:8765';
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.QA_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' },
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    const events=[],payloads=[];const context = await browser.newContext({ serviceWorkers: 'block', hasTouch: true });
    await context.exposeBinding('directQARecord',(_source,type,value)=>{events.push(type);if(typeof value==='string'&&value.startsWith('{'))payloads.push({type,graph:JSON.parse(value)})});
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
      Storage.prototype.setItem = function(key, value) { window.qaWrites.push(key);window.directQARecord('storage',value); return original.call(this, key, value); };
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





    const {formulaProfileLibrary}=require('./fixtures/formula-profile-library.cjs');
    const fixture=formulaProfileLibrary(),snapshots=[],summary=[];
    const state=async()=>JSON.parse(await page.evaluate(()=>JSON.stringify(db)));
    const counts=()=>Object.fromEntries(['persist','storage','cloud'].map(k=>[k,events.filter(e=>e===k).length]));
    async function quiet(){await page.waitForTimeout(500);events.length=0;payloads.length=0}
    async function exact(label,before,expected,n=0){await page.waitForTimeout(500);const actual=await state(),observed=counts();snapshots.push({label,before,expected,actual,counts:observed,payloads:structuredClone(payloads)});fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'formula-profile-snapshots.json'),JSON.stringify(snapshots,null,2));assert.deepEqual(actual,expected,label+' graph');for(const payload of payloads)assert.deepEqual(payload.graph,expected,label+' '+payload.type+' serialized graph');assert.deepEqual(observed,typeof n==='number'?{persist:n,storage:n,cloud:n}:n,label+' writes');assert.equal(await page.evaluate(()=>window.__payloads||0),0);assert.equal(await page.locator('#wiki-app img,#wiki-app [data-payload]').count(),0)}
    async function reset(key=fixture.key,lang='sv') {await page.evaluate(({json,key,lang})=>{closePopup();db=JSON.parse(json);currentLang=lang;updateUILabels();window.__payloads=0;location.hash='#formula/'+encodeURIComponent(key);handleRouting(true)}, {json:JSON.stringify(fixture.library),key,lang});await quiet()}
    const edit=()=>page.locator('[data-core-action="formulaEditor"]').click();
    const save=()=>page.locator('#popup-editor .primary').click();
    for(const lang of ['sv','en'])for(const width of [1280,375,320]){
      await page.setViewportSize({width,height:900});await reset(fixture.key,lang);let before=await state();
      assert.equal(await page.locator('.formula-components > li').count(),9);assert.equal(await page.locator('.formula-qty').first().textContent(),'0');assert.equal(await page.locator('.formula-qty').nth(1).textContent(),'0.00');assert.equal(await page.locator('.formula-role').first().textContent(),fixture.text);assert.equal(await page.locator('.formula-unit').first().textContent(),fixture.text);
      assert.equal(await page.locator('.formula-components a').count(),2);assert.deepEqual(await page.locator('.formula-components a').evaluateAll(a=>a.map(n=>n.getAttribute('href'))),['#herb-id/id%2520literal','#herb-id/id%20literal']);
      assert((await page.locator('#wiki-app').textContent()).includes(lang==='en'?'Unavailable object:':'Otillgängligt objekt:'));assert.equal(await page.locator('[data-core-action="formulaEditor"]').textContent(),lang==='en'?'Edit description':'Redigera beskrivning');
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await exact(lang+' '+width+' readonly display',before,before);await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'formula-profile-'+lang+'-'+width+'.png'),fullPage:true});
      await page.locator('.formula-components a').nth(1).click();await page.waitForURL('**/#herb-id/id%20literal');await exact(lang+' '+width+' exact herb ID navigation',before,before);await reset(fixture.key,lang);before=await state();
      await page.locator('[data-core-action="formulaEditor"]').focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#popup-editor-input').inputValue(),' Original description ');assert.equal(await page.evaluate(()=>document.activeElement.id),'popup-editor-input');
      for(let n=0;n<6;n++){await page.keyboard.press('Tab');assert(await page.evaluate(()=>document.getElementById('popup-editor').contains(document.activeElement)))}
      await page.locator('#btn-menu-text').evaluate(e=>e.focus());assert(await page.evaluate(()=>document.getElementById('popup-editor').contains(document.activeElement)));await page.keyboard.press('Escape');assert.equal(await page.locator('#popup-editor').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'formulaEditor');await exact(lang+' '+width+' Escape/focus cancel',before,before);
      if(width===1280)await edit();else await page.locator('[data-core-action="formulaEditor"]').tap();await page.locator('#popup-editor-input').fill('Changed '+lang+' '+width);await save();const expected=structuredClone(before);expected.formulas[fixture.key].desc='Changed '+lang+' '+width;await exact(lang+' '+width+' exact description save',before,expected,1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'formulaEditor');summary.push({lang,width,display:true,keyboard:true,touch:width!==1280});
    }
    for(const key of ['Empty','One','Absent','Legacy','Legacy description','__proto__']){await reset(key);const before=await state();await exact('empty/single/legacy/literal '+key,before,before);await edit();await save();await exact('unchanged '+key,before,before)}
    await reset('One');let sparseBefore=await state();await edit();await page.locator('#popup-editor-input').fill('New sparse description');await save();const sparseExpected=structuredClone(sparseBefore);sparseExpected.formulas.One.desc='New sparse description';await exact('explicit sparse description creation',sparseBefore,sparseExpected,1);
    await reset();let before=await state();await edit();await page.locator('#popup-editor-input').fill('discard');await page.locator('#popup-editor [data-i18n="Avbryt"]').click();await exact('explicit Cancel',before,before);
    await edit();await page.locator('#popup-editor').click({position:{x:1,y:1}});await exact('backdrop Cancel',before,before);
    const stale={library:()=>db=structuredClone(db),map:()=>db.formulas={...db.formulas},formula:()=>{const key=editorTargetId;db.formulas[key]={...db.formulas[key]}},deleted:()=>delete db.formulas[editorTargetId],desc:()=>db.formulas[editorTargetId].desc='newer',nested:()=>db.formulas[editorTargetId].metadata.keep.unknown.push(99),rows:()=>db.formulas[editorTargetId].components=[...db.formulas[editorTargetId].components],row:()=>db.formulas[editorTargetId].components[0]={...db.formulas[editorTargetId].components[0]},readonly:()=>Object.freeze(db.formulas[editorTargetId]),route:()=>history.replaceState(null,'','#formulas')};
    for(const [kind,mutation] of Object.entries(stale)){await reset();await edit();await page.locator('#popup-editor-input').fill('stale');await page.evaluate(src=>(0,eval)('('+src+')()'),String(mutation));before=await state();await save();await exact('stale/readonly '+kind,before,before);assert(dialogs.at(-1).message.includes('Formeln har ändrats'));}
    await reset();before=await state();await page.evaluate(()=>window.oldControl=document.querySelector('[data-core-action="formulaEditor"]'));await edit();await page.evaluate(()=>window.oldSave=document.querySelector('#popup-editor .primary').onclick);await page.locator('#popup-editor-input').fill('saved once');await save();let expected=structuredClone(before);expected.formulas[fixture.key].desc='saved once';await exact('single-use save setup',before,expected,1);await quiet();await page.evaluate(()=>{oldSave();oldControl.click();saveDescription()});await exact('retained and repeated actions',expected,expected);
    await edit();await page.locator('#popup-editor-input').fill('new draft');await page.evaluate(()=>oldSave());await exact('old Save cannot consume new draft',expected,expected);await page.keyboard.press('Escape');
    // Formula Save binding must not disable the other shared profile editors.
    await reset();before=await state();await page.evaluate(()=>{openEditor('formula',Object.keys(db.formulas)[0]);closePopup();openEditor('herb',db.objects[0].id)});await page.locator('#popup-editor-input').fill('Herb description');await save();expected=structuredClone(before);expected.objects[0].desc='Herb description';await exact('shared herb editor remains functional',before,expected,1);
    await reset('__proto__');before=await state();await edit();await page.locator('#popup-editor-input').fill('literal safe');await save();expected=structuredClone(before);expected.formulas.__proto__.desc='literal safe';await exact('own __proto__ edit',before,expected,1);assert(await page.evaluate(()=>Object.getPrototypeOf(db.formulas)===Object.prototype));await quiet();
    const waitDownload=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const dl=await waitDownload;const backup=path.join(process.env.TASK_EVIDENCE,'formula-profile-backup.json');await dl.saveAs(backup);assert.deepEqual(JSON.parse(fs.readFileSync(backup,'utf8')),expected);await exact('actual export exact graph',expected,expected);await quiet();answers=[false,true];await page.locator('#import-file-input').setInputFiles(backup);await page.waitForFunction(()=>window.directImportDone===true);await exact('actual import exact graph',expected,expected,1);await quiet();await page.reload();await exact('real reload outside-page counters',expected,expected,{persist:1,storage:1,cloud:0});
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',checks:snapshots.length,summary,errors,externalRequests,browser:await browser.version()}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
