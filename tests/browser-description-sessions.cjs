'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');


async function main() {
  let html = fs.readFileSync(process.env.DESCRIPTION_SESSION_SOURCE || path.join(__dirname, '../index.html'), 'utf8');
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
    const fixture=formulaProfileLibrary(),baseline=process.env.DESCRIPTION_SESSION_BASELINE==='1',records=[];
    const targets=[['herb',fixture.library.objects[0].id],['prop','P'],['cat','C'],['system','S'],['formula',fixture.key]];
    const state=async()=>JSON.parse(await page.evaluate(()=>JSON.stringify(db)));
    async function quiet(){await page.waitForTimeout(500);events.length=0;payloads.length=0}
    async function ui(){return page.evaluate(()=>({mode:editorMode,id:editorTargetId,visible:getComputedStyle(document.getElementById('popup-editor')).display!=='none',text:document.getElementById('popup-editor-input').value,active:document.activeElement.id||document.activeElement.dataset.coreAction||document.activeElement.tagName,session:!!openEditor.session,formulaDraft:!!openEditor.formulaDraft,sameSession:openEditor.session===window.expectedSession,sameFormulaDraft:openEditor.formulaDraft===window.expectedFormulaDraft}))}
    async function mark(){await page.evaluate(()=>{window.expectedSession=openEditor.session;window.expectedFormulaDraft=openEditor.formulaDraft});return ui()}
    async function exact(label,before,expected,count,uiBefore=null,stay=false){await page.waitForTimeout(500);const actual=await state(),observed=Object.fromEntries(['persist','storage','cloud'].map(k=>[k,events.filter(e=>e===k).length])),uiAfter=await ui();records.push({label,before,expected,actual,counts:observed,uiBefore,uiAfter,payloads:structuredClone(payloads),expectedCounts:{persist:count,storage:count,cloud:count},requiredCounts:baseline?{persist:0,storage:0,cloud:0}:{persist:count,storage:count,cloud:count}});fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'description-session-snapshots.json'),JSON.stringify(records,null,2));assert.deepEqual(actual,expected,label+' graph');assert.deepEqual(observed,{persist:count,storage:count,cloud:count},label+' writes');for(const p of payloads)assert.deepEqual(p.graph,expected,label+' '+p.type+' payload');if(stay)assert.deepEqual(uiAfter,uiBefore,label+' active editor/draft/focus');assert.equal(await page.evaluate(()=>window.__payloads||0),0)}
    async function reset(){await page.evaluate(f=>{closePopup();db=JSON.parse(f);window.__payloads=0;location.hash='#formula/'+encodeURIComponent(Object.keys(db.formulas)[0]);handleRouting(true)},JSON.stringify(fixture.library));await quiet()}
    async function open(type,id){await page.evaluate(({type,id})=>{closePopup();const route={herb:'herb-id',prop:'property',cat:'category',system:'system',formula:'formula'}[type];location.hash='#'+route+'/'+encodeURIComponent(id);handleRouting(true)}, {type,id});if(type==='formula')await page.locator('[data-core-action="formulaEditor"]').click();else await page.evaluate(({type,id})=>openEditor(type,id),{type,id});assert(await page.locator('#popup-editor').isVisible());}
    const input=()=>page.locator('#popup-editor-input'),save=()=>page.locator('#popup-editor .primary').click(),cancel=()=>page.locator('#popup-editor [data-i18n="Avbryt"]').click();
    const edited=(before,type,id,text)=>{const next=structuredClone(before);if(type==='herb')next.objects.find(o=>o.id===id).desc=text;else next[{prop:'properties',cat:'categories',system:'systems',formula:'formulas'}[type]][id].desc=text;return next};
    if(baseline){
      for(const [type,id]of targets.slice(0,4)){await reset();await open(type,id);await page.evaluate(()=>window.retainedSave=document.querySelector('#popup-editor .primary').onclick);await input().fill('cancelled '+type);await cancel();await open('formula',fixture.key);await input().fill('UNCONFIRMED '+type);const before=await state(),uiBefore=await mark();await quiet();await page.evaluate(()=>retainedSave());await exact('Q19-1 rejected HEAD '+type,before,edited(before,'formula',fixture.key,'UNCONFIRMED '+type),1,uiBefore);assert(!(await page.locator('#popup-editor').isVisible()));}
      console.log(JSON.stringify({status:'REPRODUCED',cases:records.length,errors,externalRequests,browser:await browser.version()}));
    }else{
      const pairs=targets.flatMap(origin=>targets.map(target=>({origin,target}))).concat(targets.map((origin,i)=>({origin,target:[origin[0],[fixture.library.objects[1].id,'Before','Empty','T','One'][i]],differentRecord:true})));
      for(const {origin:[from,fromId],target:[to,toId],differentRecord}of pairs){
        const label=from+' -> '+to+(differentRecord?' other record':'');await reset();await open(from,fromId);await page.evaluate(()=>window.retainedSave=document.querySelector('#popup-editor .primary').onclick);const original=await state();await input().fill('discard '+label);await cancel();await page.evaluate(()=>closePopup());await exact(label+' Cancel repeat',original,original,0);
        await open(to,toId);await input().fill('approved '+label);const before=await state(),uiBefore=await mark();await quiet();await page.evaluate(()=>retainedSave());await exact(label+' retained callback rejected',before,before,0,uiBefore,true);
        await quiet();await page.evaluate(()=>window.currentSave=document.querySelector('#popup-editor .primary').onclick);await save();const expected=edited(before,to,toId,'approved '+label);await exact(label+' current native Save',before,expected,1);assert(!(await page.locator('#popup-editor').isVisible()));await quiet();await page.evaluate(()=>{retainedSave();currentSave();saveDescription();closePopup();closePopup()});await exact(label+' repeated callbacks/Cancel',expected,expected,0);
      }
      for(const [from,fromId,to,toId]of [['herb',fixture.library.objects[0].id,'formula',fixture.key],['formula',fixture.key,'herb',fixture.library.objects[0].id],['herb',fixture.library.objects[0].id,'herb',fixture.library.objects[1].id]]){
        await reset();await open(from,fromId);await page.evaluate(()=>{window.retainedSave=document.querySelector('#popup-editor .primary').onclick;window.replacedSession=openEditor.session});await page.evaluate(({to,toId})=>openEditor(to,toId),{to,toId});assert.equal(await page.evaluate(()=>replacedSession.used),false);await input().fill('replacement current');const before=await state(),uiBefore=await mark();await quiet();await page.evaluate(()=>retainedSave());await exact(from+' -> '+to+' replaced without Cancel',before,before,0,uiBefore,true);await quiet();await save();await exact(from+' -> '+to+' replacement native Save',before,edited(before,to,toId,'replacement current'),1);
      }
      const mutations=['library','collection','record','delete','desc','nested','route'];
      for(const [type,id]of targets)for(const mutation of mutations){await reset();await open(type,id);await input().fill('stale');await page.evaluate(({type,id,mutation})=>{const key={herb:'objects',prop:'properties',cat:'categories',system:'systems',formula:'formulas'}[type],collection=db[key],record=type==='herb'?collection.find(o=>o.id===id):collection[id];if(mutation==='library')db=structuredClone(db);if(mutation==='collection')db[key]=type==='herb'?[...collection]:{...collection};if(mutation==='record'){if(type==='herb')collection[collection.indexOf(record)]={...record};else Object.defineProperty(collection,id,{value:{...record},enumerable:true,writable:true,configurable:true})}if(mutation==='delete'){if(type==='herb')collection.splice(collection.indexOf(record),1);else delete collection[id]}if(mutation==='desc')record.desc='newer';if(mutation==='nested')record.unknownChanged={keep:[1,false]};if(mutation==='route')history.replaceState(null,'','#formulas')},{type,id,mutation});const before=await state();await quiet();await save();await exact(type+' stale '+mutation,before,before,0);}
      await reset();await open('formula',fixture.key);await input().fill('current draft');let before=await state(),uiBefore=await mark();await quiet();await page.evaluate(()=>{saveDescription();saveDescription({})});await exact('unscoped/invalid invocation has no authority',before,before,0,uiBefore,true);await quiet();await save();await exact('current native Save remains authorized',before,edited(before,'formula',fixture.key,'current draft'),1);
      assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',checks:records.length,sessionPairs:pairs.length,replacementSessions:3,staleCases:targets.length*mutations.length,errors,externalRequests,browser:await browser.version()}));
    }
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
