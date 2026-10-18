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
    const fixture=formulaProfileLibrary(),records=[];
    const graph=()=>page.evaluate(()=>JSON.stringify(db)).then(JSON.parse);
    const clone=x=>JSON.parse(JSON.stringify(x));
    async function quiet(){await page.waitForTimeout(500);events.length=0;payloads.length=0}
    async function exact(label,before,expected=before,count=0,editorBefore){await page.waitForTimeout(500);const actual=await graph(),counts=Object.fromEntries(['persist','storage','cloud'].map(k=>[k,events.filter(e=>e===k).length])),editorAfter=await ui();records.push({label,before,expected,actual,counts,payloads:structuredClone(payloads),editorBefore,editorAfter});fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'formula-components-snapshots.json'),JSON.stringify(records,null,2));assert.equal(await page.evaluate(()=>window.__payloads||0),0,label+' handler execution');assert.equal(await page.locator('#wiki-app img,#formula-component-body img').count(),0,label+' injected elements');assert.deepEqual(actual,expected,label+' full graph');assert.deepEqual(counts,typeof count==='number'?{persist:count,storage:count,cloud:count}:count,label+' writes');for(const p of payloads)assert.deepEqual(p.graph,expected,label+' payload');if(editorBefore)assert.deepEqual(editorAfter,editorBefore,label+' editor state');}
    async function reset(key=fixture.key,lang='sv',data=fixture.library){await page.evaluate(({json,key,lang})=>{closePopup();db=JSON.parse(json);currentLang=lang;updateUILabels();window.__payloads=0;location.hash='#formula/'+encodeURIComponent(key);handleRouting(true)},{json:JSON.stringify(data),key,lang});await quiet()}
    const action=(kind,index)=>page.locator('[data-core-action="component'+kind+'"]').nth(index||0).click();
    const save=()=>page.locator('#formula-component-save').click(),cancel=()=>page.locator('#formula-component-cancel').click();
    async function select(id){await page.locator('#formula-component-search').fill(id);const buttons=page.locator('#formula-component-results button');for(let i=0;i<await buttons.count();i++){if((await buttons.nth(i).textContent()).endsWith(' — '+id)){await buttons.nth(i).focus();await page.keyboard.press('Enter');return}}throw Error('Missing ID '+id)}
    async function ui(){return page.evaluate(()=>({visible:getComputedStyle(document.getElementById('popup-formula-component')).display,descriptionVisible:getComputedStyle(document.getElementById('popup-editor')).display,focus:document.activeElement.id||document.activeElement.tagName,description:document.getElementById('popup-editor-input').value,fields:['role','qty','unit'].map(k=>document.getElementById('formula-component-'+k)?.value),selection:document.getElementById('formula-component-selection')?.textContent,same:openFormulaComponent.draft===window.expectedComponent,sameDescription:openEditor.session===window.expectedDescription}))}
    async function mark(){await page.evaluate(()=>{window.expectedComponent=openFormulaComponent.draft;window.expectedDescription=openEditor.session});return ui()}
    const editFields=async(role,qty,unit)=>{await page.locator('#formula-component-role').fill(role);await page.locator('#formula-component-qty').fill(qty);await page.locator('#formula-component-unit').fill(unit)};
    // Actual file import before using the chooser: IDs and hostile names come from JSON.
    answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'components.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture.library))});await page.waitForFunction(()=>window.directImportDone);await quiet();
    for(const lang of ['sv','en'])for(const width of [1280,375,320]){
      await page.setViewportSize({width,height:900});await reset(fixture.key,lang);let before=await graph();
      assert.equal(await page.locator('[data-core-action="componentAdd"]').textContent(),lang==='sv'?'Lägg till komponent':'Add component');
      await page.locator('[data-core-action="componentAdd"]').focus();await page.keyboard.press('Enter');assert.equal(await page.evaluate(()=>document.activeElement.id),'formula-component-search');
      await select(fixture.library.objects[0].id);await exact(lang+' '+width+' selection does not save',before);await quiet();
      assert.equal(await page.locator('#formula-component-qty').inputValue(),'1');assert.equal(await page.locator('#formula-component-unit').inputValue(),'g');
      for(const key of ['Tab','Shift+Tab'])for(let i=0;i<12;i++){await page.keyboard.press(key);assert(await page.evaluate(()=>document.getElementById('popup-formula-component').contains(document.activeElement)))}
      await page.evaluate(()=>document.getElementById('btn-menu-text').focus());assert(await page.evaluate(()=>document.getElementById('popup-formula-component').contains(document.activeElement)));
      await editFields(fixture.text,'0','ml % <img>');assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'formula-component-'+lang+'-'+width+'.png'),fullPage:true});
      await page.locator('#formula-component-save').focus();await page.keyboard.press('Enter');let expected=clone(before);expected.formulas[fixture.key].components.push({objId:fixture.library.objects[0].id,role:fixture.text,qty:0,unit:'ml % <img>'});await exact(lang+' '+width+' confirmed add',before,expected,1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'componentAdd');
      await quiet();if(width===1280)await action('Add');else await page.locator('[data-core-action="componentAdd"]').tap();await select(fixture.library.objects[1].id);await save();before=expected;expected=clone(before);expected.formulas[fixture.key].components.push({objId:fixture.library.objects[1].id,role:'',qty:1,unit:'g'});await exact(lang+' '+width+' second ID duplicate display name',before,expected,1);
      await quiet();before=await graph();await action('Edit',0);assert.equal(await page.locator('#formula-component-qty').inputValue(),'0');await editFields('new role','2.25','other unit');await save();expected=clone(before);Object.assign(expected.formulas[fixture.key].components[0],{role:'new role',qty:2.25,unit:'other unit'});await exact(lang+' '+width+' edit exact first row',before,expected,1);
      await quiet();before=await graph();await action('Remove',1);await cancel();await exact(lang+' '+width+' remove Cancel',before);await quiet();await action('Remove',1);await save();expected=clone(before);expected.formulas[fixture.key].components.splice(1,1);await exact(lang+' '+width+' explicitly remove exact second row',before,expected,1);
      await quiet();before=await graph();await action('Add');await page.keyboard.press('Escape');await page.keyboard.press('Escape');await exact(lang+' '+width+' repeated Escape',before);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'componentAdd');
    }
    await reset();let before=await graph();await action('Edit');await save();await exact('unchanged row preserves legacy values',before);
    await quiet();await action('Add');await select(fixture.library.objects[0].id);await page.locator('#formula-component-qty').fill('invalid');await save();await exact('invalid quantity zero writes',before);assert(await page.locator('#popup-formula-component').isVisible());await cancel();
    await quiet();await action('Add');await page.locator('#formula-component-search').fill('NO MATCH');assert.equal(await page.locator('#formula-component-results button').count(),0);await save();await exact('empty results / unselected no implicit creation',before);await cancel();
    await quiet();await action('Add');await select(fixture.library.objects[0].id);await save();let expected=clone(before);expected.formulas[fixture.key].components.push({objId:fixture.library.objects[0].id,role:'',qty:1,unit:'g'});await exact('same object component is not deduplicated',before,expected,1);
    await reset();before=await graph();await action('Edit',2);await page.locator('#formula-component-role').fill('missing reference edit');await save();expected=clone(before);expected.formulas[fixture.key].components[2].role='missing reference edit';await exact('missing object reference editable without repair',before,expected,1);
    await reset();before=await graph();await action('Add');await page.locator('#popup-formula-component').click({position:{x:1,y:1}});await exact('backdrop cancel zero writes',before);
    for(const mutation of ['library','map','formula','array','row','reorder','removed','nested','route','object'])for(const mode of ['Edit','Remove','Add']){
      await reset();await action(mode);if(mode==='Add')await select(fixture.library.objects[0].id);if(mode!=='Remove')await page.locator('#formula-component-role').fill('stale');
      await page.evaluate(({key,mutation})=>{const f=db.formulas[key];if(mutation==='library')db=structuredClone(db);if(mutation==='map')db.formulas={...db.formulas};if(mutation==='formula')db.formulas[key]={...f};if(mutation==='array')f.components=[...f.components];if(mutation==='row')f.components[0]={...f.components[0]};if(mutation==='reorder')f.components.reverse();if(mutation==='removed')f.components.splice(0,1);if(mutation==='nested')f.components[0].metadata.keep=[99];if(mutation==='route')history.replaceState(null,'','#formulas');if(mutation==='object')db.objects[0]={...db.objects[0],name:'newer object'}},{key:fixture.key,mutation});before=await graph();await quiet();await save();await exact(mode+' stale '+mutation,before);
    }
    // Expired component controls cannot alter later row/formula or description sessions.
    const targets=[['component',fixture.key,0],['component',fixture.key,1],['component','One',0],['herb',fixture.library.objects[0].id],['prop','P'],['cat','C'],['system','S'],['formula',fixture.key]];
    for(const target of targets){await reset();await action('Edit');await page.evaluate(()=>{window.oldComponentSave=document.getElementById('formula-component-save').onclick;window.oldComponentCancel=document.getElementById('formula-component-cancel').onclick;window.oldOverlay=document.getElementById('popup-formula-component').onclick});await cancel();if(target[0]==='component')await page.evaluate(t=>{location.hash='#formula/'+encodeURIComponent(t[1]);handleRouting(true);openFormulaComponent(t[1],'edit',t[2])},target);else await page.evaluate(t=>openEditor(...t),target);const editor=await mark();before=await graph();await quiet();await page.evaluate(()=>{oldComponentSave();oldComponentCancel();oldOverlay({target:document.getElementById('popup-formula-component')})});await exact('expired component controls -> '+target,before,before,0,editor);await quiet();expected=clone(before);if(target[0]==='component'){await page.locator('#formula-component-role').fill('current after old component');expected.formulas[target[1]].components[target[2]].role='current after old component';await save()}else{await page.locator('#popup-editor-input').fill('current description');if(target[0]==='herb')expected.objects.find(o=>o.id===target[1]).desc='current description';else expected[{prop:'properties',cat:'categories',system:'systems',formula:'formulas'}[target[0]]][target[1]].desc='current description';await page.locator('#popup-editor .primary').click()}await exact('current native Save after old component -> '+target,before,expected,1);}
    for(const [type,id]of [['herb',fixture.library.objects[0].id],['prop','P'],['cat','C'],['system','S'],['formula',fixture.key]]){await reset();await page.evaluate(({type,id})=>{openEditor(type,id);window.oldDescriptionSave=document.querySelector('#popup-editor .primary').onclick;closePopup()},{type,id});await action('Add');await select(fixture.library.objects[0].id);await page.locator('#formula-component-role').fill('current');const editor=await mark();before=await graph();await quiet();await page.evaluate(()=>oldDescriptionSave());await exact('expired '+type+' description -> component',before,before,0,editor);await quiet();await save();expected=clone(before);expected.formulas[fixture.key].components.push({objId:fixture.library.objects[0].id,role:'current',qty:1,unit:'g'});await exact('component native Save after rejected '+type,before,expected,1);}
    await reset();await action('Edit');await page.evaluate(()=>window.consumedComponentSave=document.getElementById('formula-component-save').onclick);await page.locator('#formula-component-role').fill('once');before=await graph();await save();expected=clone(before);expected.formulas[fixture.key].components[0].role='once';await exact('single use setup',before,expected,1);await quiet();await page.evaluate(()=>{consumedComponentSave();consumedComponentSave()});await exact('consumed repeated saves',expected);
    for(const mode of ['Add','Edit','Remove']){await reset();await action(mode);if(mode==='Add')await select(fixture.library.objects[0].id);if(mode==='Edit')await editFields('changed','99','changed unit');await page.evaluate(mode=>{const d=openFormulaComponent.draft;if(mode==='Edit')Object.defineProperty(d.row,'unit',{value:d.row.unit,writable:false,configurable:false,enumerable:true});else Object.freeze(d.components)},mode);before=await graph();await quiet();await save();await exact(mode+' readonly atomic preflight',before);}
    await reset();await action('Add');await select(fixture.library.objects[0].id);await page.evaluate(()=>db.objects[0]={...db.objects[0]});before=await graph();await quiet();await save();await exact('identical selected object replacement invalidates addition',before);await cancel();
    for(const next of [[fixture.key,'edit',1],[fixture.key,'edit',0],['One','edit',0]]){await reset();await action('Edit');await page.evaluate(()=>window.replacedComponentSave=document.getElementById('formula-component-save').onclick);await page.evaluate(next=>openFormulaComponent(...next),next);const editor=await mark();before=await graph();await quiet();await page.evaluate(()=>replacedComponentSave());await exact('replacement without Cancel '+next,before,before,0,editor);}
    await reset();await page.evaluate(()=>{window.retainedComponentButton=document.querySelector('[data-core-action="componentEdit"]')});await action('Add');const activeEditor=await mark();before=await graph();await quiet();await page.evaluate(()=>retainedComponentButton.click());await exact('retained connected profile action cannot displace current dialog',before,before,0,activeEditor);
    await reset();before=await graph();await page.evaluate(()=>{window.oldComponentButton=document.querySelector('[data-core-action="componentEdit"]');oldComponentButton.remove();oldComponentButton.click()});await exact('detached profile control',before);
    await reset();await action('Add');await page.evaluate(()=>{window.oldComponentSearch=document.getElementById('formula-component-search').oninput;window.oldComponentChoice=document.querySelector('#formula-component-results button').onclick});await cancel();await action('Add');await select(fixture.library.objects[1].id);before=await graph();const chooserState=await mark();await quiet();await page.evaluate(()=>{oldComponentSearch();oldComponentChoice()});await exact('expired search and selection cannot change current chooser',before,before,0,chooserState);await quiet();await save();expected=clone(before);expected.formulas[fixture.key].components.push({objId:fixture.library.objects[1].id,role:'',qty:1,unit:'g'});await exact('current chooser still confirms its exact ID',before,expected,1);
    await reset('__proto__');before=await graph();await action('Add');await select(fixture.library.objects[0].id);await save();expected=clone(before);expected.formulas.__proto__.components.push({objId:fixture.library.objects[0].id,role:'',qty:1,unit:'g'});await exact('literal own __proto__ formula component addition',before,expected,1);assert(await page.evaluate(()=>Object.getPrototypeOf(db.formulas)===Object.prototype));
    await reset('Absent');before=await graph();assert.equal(await page.locator('[data-core-action="componentAdd"]').count(),0);await exact('unsupported component collection preserved',before);
    const legacy=clone(fixture.library);legacy.formulas[fixture.key].components[0].qty={legacy:[0,false]};legacy.formulas[fixture.key].components[0].unit=null;await reset(fixture.key,'en',legacy);before=await graph();await action('Edit');await page.locator('#formula-component-role').fill('legacy preserved');await save();expected=clone(before);expected.formulas[fixture.key].components[0].role='legacy preserved';await exact('unusual unchanged values retained',before,expected,1);
    await quiet();const waitDownload=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const dl=await waitDownload;const file=path.join(process.env.TASK_EVIDENCE,'formula-components-backup.json');await dl.saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),expected);await exact('actual export',expected);await quiet();answers=[false,true];await page.locator('#import-file-input').setInputFiles(file);await page.waitForFunction(()=>window.directImportDone);await exact('actual import',expected,expected,1);await quiet();await page.reload();await exact('actual reload Node-side beforeunload counts',expected,expected,{persist:1,storage:1,cloud:0});
    assert.equal(await page.evaluate(()=>window.__payloads||0),0);assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',checks:records.length,staleCases:30,viewports:[1280,375,320],languages:['sv','en'],errors,externalRequests,browser:await browser.version()}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
