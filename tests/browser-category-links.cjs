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



    const fixture={objects:[{id:'h',name:'Kamomill',props:{Legacy:0,False:false,Null:null},taxonomies:{'Botanical Name':'Matricaria'},metadata:{nested:[false,0,null]}},{id:'other',name:'Other',props:{}}],categories:{'Växtdelar':{system:'S',subcategories:[]},'Other Å " <b>':{system:'T',subcategories:[]},Filled:{system:'S',subcategories:[]}},properties:{Legacy:{category:'Filled'},False:{category:'Filled'},Null:{category:'Filled'}},systems:{S:{categories:['Växtdelar','Filled']},T:{categories:['Other Å " <b>']},'Ospecifierade kategorier':{categories:[],desc:'Kategorier som saknar skola.'}},systemOrder:['S','T','Ospecifierade kategorier'],studyObjects:[],sources:[{id:'z',title:'Z'},{id:'a',title:'A'}],trash:[],formulas:{},metadata:{unknown:[0,false,null]}};
    await page.evaluate(()=>{window.calls=0;const original=persist;persist=function(...args){calls++;return original(...args);};const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.importDone=false;this.addEventListener('loadend',()=>window.importDone=true,{once:true});return read.apply(this,args);};});
    const state=()=>page.evaluate(()=>({db,calls,writes:qaWrites.filter(k=>k!=='wiki_lang'&&k!=='wiki_name_mode').length}));
    async function reset(){await page.evaluate(data=>{closePopup();db=data;currentLang='sv';updateUILabels();location.hash='#herb-id/h';renderHerbPage('h');calls=0;qaWrites=[];},structuredClone(fixture));}
    async function clear(){await page.evaluate(()=>{calls=0;qaWrites=[];});}
    async function route(hash){await page.evaluate(hash=>{location.hash=hash;handleRouting(true);},hash);}
    const choose=()=>page.locator('[data-core-action="chooseCategory"]').click();
    const category=name=>page.locator('#assign-category-list button').filter({hasText:name}).click();
    const save=()=>page.locator('#popup-assign-prop').getByRole('button',{name:'Spara kopplingar',exact:true}).click();
    const link=()=>page.locator('#assign-keep-category').check();
    const check=name=>page.locator('#assign-props-checklist label').filter({hasText:name}).locator('input');
    async function remove(name){const index=await page.locator('[data-core-action="unlinkCategory"]').evaluateAll((nodes,name)=>nodes.findIndex(n=>JSON.parse(n.dataset.coreArgs)[1]===name),name);assert.ok(index>=0);await page.locator('[data-core-action="unlinkCategory"]').nth(index).click();}
    async function exact(expected,calls){assert.deepEqual(await state(),{db:expected,calls,writes:calls});}
    const results=[];
    for(const width of [1280,375,320]){
      await page.setViewportSize({width,height:800});await reset();let expected=structuredClone(fixture);
      await choose();await category('Växtdelar');await link();await page.keyboard.press('Escape');await exact(expected,0);
      await choose();await category('Växtdelar');assert.equal(await page.locator('#assign-keep-category').isChecked(),false);await page.locator('#assign-keep-category').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#assign-keep-category').isChecked(),true);assert.equal(await page.locator('#popup-assign-prop .popup-box').evaluate(el=>el.scrollWidth<=el.clientWidth),true);await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'category-link-dialog-'+width+'.png'),fullPage:true});await save();expected.objects[0].categoryLinks=['Växtdelar'];await exact(expected,1);
      assert.ok((await page.locator('#wiki-app').innerText()).includes('inga egenskaper'));
      await route('#sources');await route('#herb-id/h');await exact(expected,1);
      await page.reload();await page.evaluate(()=>{window.calls=0;const original=persist;persist=function(...args){calls++;return original(...args);};const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.importDone=false;this.addEventListener('loadend',()=>window.importDone=true,{once:true});return read.apply(this,args);};});assert.deepEqual(await page.evaluate(()=>db),expected);await clear();
      await choose();await category('Växtdelar');assert.equal(await page.locator('#assign-keep-category').isChecked(),true);await save();await exact(expected,0);
      await choose();await category('Other Å');await link();await save();expected.objects[0].categoryLinks.push('Other Å " <b>');await exact(expected,1);assert.equal(await page.locator('#wiki-app b b,#wiki-app img,#wiki-app script,#wiki-app [onerror]').count(),0);
      await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'empty-categories-sv-'+width+'.png'),fullPage:true});
      await page.evaluate(()=>toggleLanguage());assert.ok((await page.locator('#wiki-app').innerText()).includes('no properties'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'empty-categories-en-'+width+'.png'),fullPage:true});await page.evaluate(()=>toggleLanguage());
      await clear();answers=['Blomma'];await page.evaluate(()=>promptCreatePropertyWithSubcat('Växtdelar'));expected.properties.Blomma={category:'Växtdelar',subcategory:'',desc:'',summary:'',related:[]};await exact(expected,1);await route('#herb-id/h');
      await clear();await choose();await category('Växtdelar');await check('Blomma').check();await save();expected.objects[0].props.Blomma=true;await exact(expected,1);
      await clear();await remove('Växtdelar');await exact(expected,0);assert.ok(dialogs.at(-1).message.includes('tilldelade egenskaper'));
      await choose();await category('Växtdelar');await check('Blomma').uncheck();await save();delete expected.objects[0].props.Blomma;await exact(expected,1);assert.ok((await page.locator('#wiki-app').innerText()).includes('Växtdelar:'));
      await clear();await remove('Växtdelar');expected.objects[0].categoryLinks=['Other Å " <b>'];await exact(expected,1);
      await clear();answers=['Renamed Ö'];await page.evaluate(()=>promptRenameCategory('Other Å " <b>'));expected.categories['Renamed Ö']=expected.categories['Other Å " <b>'];delete expected.categories['Other Å " <b>'];expected.systems.T.categories=['Renamed Ö'];expected.objects[0].categoryLinks=['Renamed Ö'];await exact(expected,1);
      await clear();await page.evaluate(()=>deleteTagWithWarning('category','Renamed Ö'));await exact(expected,0);assert.ok(dialogs.at(-1).message.includes('kopplad till en ört'));
      await route('#herb-id/h');await remove('Renamed Ö');expected.objects[0].categoryLinks=[];await exact(expected,1);
      await clear();answers=[true];await page.evaluate(()=>deleteTagWithWarning('category','Renamed Ö'));const deleted=await state();assert.equal(deleted.calls,1);assert.equal(deleted.writes,1);expected=deleted.db;assert.equal(Object.hasOwn(expected.categories,'Renamed Ö'),false);
      // Reuse the deleted name through the actual create-category workflow, on another herb.
      await route('#herb-id/other');await clear();answers=['Renamed Ö'];await page.evaluate(()=>promptCreateCategoryForHerb());const reused=await state();assert.equal(reused.calls,1);assert.equal(reused.writes,1);assert.deepEqual(reused.db.objects[0].categoryLinks,[]);assert.deepEqual(reused.db.objects[1].categoryLinks,['Renamed Ö']);
      await route('#trash');await clear();await page.locator('[data-core-action="trashRestore"]').click();assert.deepEqual(await state(),{...reused,calls:0,writes:0});assert.ok(dialogs.at(-1).message.includes('upptagen'));
      await route('#herb-id/other');await remove('Renamed Ö');answers=[true];await page.evaluate(()=>deleteTagWithWarning('category','Renamed Ö'));await route('#trash');await clear();await page.locator('[data-core-action="trashRestore"]').first().click();const restored=await state();assert.equal(restored.calls,1);assert.equal(restored.writes,1);assert.deepEqual(restored.db.objects.map(o=>o.categoryLinks),[[],[]]);
      // Stale selected category/links and conflicting property edits reject atomically.
      await reset();await choose();await category('Växtdelar');await link();await page.evaluate(()=>db.objects[0].categoryLinks=['Filled']);const stale=await state();await save();assert.deepEqual(await state(),stale);assert.ok(dialogs.at(-1).message.includes('Data har ändrats'));
      await reset();await choose();await category('Filled');await link();await check('Legacy').uncheck();await page.evaluate(()=>db.objects[0].props.Legacy={dose:99,metadata:{newer:true}});const conflict=await state();await save();assert.deepEqual(await state(),conflict);
      results.push({width,emptyLinkReload:true,lastPropertyRetainsLink:true,rename:true,deleteReuseRestore:true,staleWrites:0});
    }
    // Actual download + file import, legacy and new optional records, including source order.
    await reset();await choose();await category('Växtdelar');await link();await save();const linked=(await state()).db;
    const downloadEvent=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const download=await downloadEvent;await download.saveAs(path.join(process.env.TASK_EVIDENCE,'category-links-backup.json'));assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),linked);
    await clear();answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(linked))});await page.waitForFunction(()=>window.importDone===true);await exact(linked,1);
    await clear();answers=[false,false];await page.locator('#import-file-input').setInputFiles({name:'legacy.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>window.importDone===true);await exact(linked,0);
    for(const invalid of [null,42,false,{},['valid',0]]){const bad=structuredClone(fixture);bad.objects[0].categoryLinks=invalid;await page.locator('#import-file-input').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bad))});await page.waitForFunction(()=>window.importDone===true);await exact(linked,0);assert.ok(dialogs.at(-1).message.includes('Ogiltigt bibliotek'));}
    const navigation=await verifyMissingCategoryNavigation(browser,html,origin);assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',navigation,results,completeSnapshots:true,successCalls:1,successWrites:1,rejectionNoopCancelWrites:0,exportImport:true,errors,externalRequests}));await context.close();
  }finally{if(browser)await browser.close();}
}

// Separate disposable context: counters cross reloads, and the cloud is a local spy only.
async function verifyMissingCategoryNavigation(browser, html, origin) {
  const context=await browser.newContext({serviceWorkers:'block'}),events=[],network=[],errors=[];
  await context.exposeBinding('navigationRecord',(_source,event)=>events.push(event));
  const instrumentation=`<script>
    const navigationPersist=persist;
    persist=function(...args){window.navigationRecord('persist');return navigationPersist(...args);};
    firestoreDb={collection(){return {doc(){return {onSnapshot(){},set(){window.navigationRecord('cloud');return Promise.resolve();}};}};}};
    isCloudReady=true;
    const navigationRead=FileReader.prototype.readAsText;
    FileReader.prototype.readAsText=function(...args){window.navigationImportDone=false;this.addEventListener('loadend',()=>window.navigationImportDone=true,{once:true});return navigationRead.apply(this,args);};
  </script>`;
  const isolated=html.replace('</body>',instrumentation+'</body>');
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){network.push(route.request().url());return route.abort();}return route.fulfill({status:200,contentType:'text/html; charset=utf-8',body:isolated,headers:{'Content-Security-Policy':"default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'"}});});
  await context.addInitScript(()=>{const original=Storage.prototype.setItem;Storage.prototype.setItem=function(...args){window.navigationRecord('storage');return original.apply(this,args);};});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));let answers=[];page.on('dialog',async d=>{const answer=answers.shift();if(answer===true)await d.accept();else await d.dismiss();});await page.goto(origin);
  const names=['Saknad Å kategori 50%','Å ä Ö space %2F','__proto__'],results=[];
  const snapshot=()=>page.evaluate(()=>structuredClone(db));
  async function quiet(){await page.waitForTimeout(450);events.length=0;}
  async function unchanged(expected){await page.waitForTimeout(450);assert.deepEqual(await snapshot(),expected);assert.deepEqual(events,[]);}
  try {
    for(const name of names)for(const trashed of [false,true]){
      const fixture={objects:[{id:'h',name:'Imported',props:{False:false,Null:null},...(trashed?{}:{categoryLinks:[name]})}],categories:{Valid:{system:'S',subcategories:[]}},properties:{One:{category:'Valid'}},systems:{S:{categories:['Valid']},'Ospecifierade kategorier':{categories:[],desc:'Kategorier som saknar skola.'}},systemOrder:['S','Ospecifierade kategorier'],sources:[{id:'z',title:'Z'},{id:'a',title:'A'}],studyObjects:[],formulas:{},trash:trashed?[{type:'object',id:'gone',data:{id:'gone',categoryLinks:[name],unknown:{keep:[false,0]}}}]:[],unknown:{nested:[0,false,null]}};
      // Import the actual JSON rather than merely assigning an in-memory fixture.
      await page.evaluate(()=>{location.hash='#index';handleRouting(true);});answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'dangling-synthetic.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>window.navigationImportDone===true);assert.deepEqual(await snapshot(),fixture);await quiet();
      await page.evaluate(()=>{location.hash='#herb-id/h';handleRouting(true);});await unchanged(fixture);
      if(!trashed){const label=page.locator('span.wiki-row-label[aria-disabled="true"]');assert.equal(await label.textContent(),name+':');assert.equal(await page.locator('a.wiki-row-label').count(),0);await label.click();assert.equal(await page.evaluate(()=>location.hash),'#herb-id/h');await unchanged(fixture);}
      const hash='#category/'+encodeURIComponent(name);await page.evaluate(hash=>{location.hash=hash;},hash);await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent==='Kategorin saknas');await unchanged(fixture);assert.equal(await page.locator('h1.wiki-title > span').innerText(),name);
      // Counters live in Node, so unload writes cannot disappear when the document reloads.
      await page.reload();await page.waitForFunction(()=>document.querySelector('[role="status"]')?.textContent==='Kategorin saknas');await unchanged(fixture);
      if(!trashed){await page.evaluate(()=>{location.hash='#herb-id/h';handleRouting(true);});await page.locator('[data-core-action="unlinkCategory"]').click();const removed=structuredClone(fixture);removed.objects[0].categoryLinks=[];await page.waitForTimeout(450);assert.deepEqual(await snapshot(),removed);assert.deepEqual(events.slice().sort(),['cloud','persist','storage']);}
      // Legitimate existing category navigation remains read-only.
      await quiet();const validBefore=await snapshot();await page.evaluate(()=>{location.hash='#category/Valid';handleRouting(true);});await unchanged(validBefore);assert.equal(await page.locator('[data-core-action="createProperty"]').count(),1);
      results.push({name,trashed,clickBlocked:!trashed,direct:true,reload:true,persistCalls:0,localStorageWrites:0,cloudWrites:0});
    }
    assert.deepEqual(errors,[]);assert.deepEqual(network,[]);return {cases:results,completeSnapshots:true,errors,externalRequests:network};
  } finally {await context.close();}
}

main().catch(error=>{console.error(error);process.exitCode=1;});
