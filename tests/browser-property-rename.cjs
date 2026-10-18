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
    firestoreDb={collection(){return {doc(){return {onSnapshot(){},set(){directQARecord('cloud');return Promise.resolve();}};}};}};isCloudReady=true;
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
    const events=[];const context = await browser.newContext({ serviceWorkers: 'block', hasTouch: true });
    await context.exposeBinding('directQARecord',(_source,type)=>events.push(type));
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
      Storage.prototype.setItem = function(key, value) { window.qaWrites.push(key);window.directQARecord('storage'); return original.call(this, key, value); };
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





    const { propertyRenameLibrary, renamedLibrary } = require('./fixtures/property-rename-library.cjs');
    const original = require('./fixtures/property-rename-reproduction.json');
    const snapshots=[],summary=[],messages=dialogs;
    const encode=value=>JSON.parse(JSON.stringify(value,(k,v)=>v===undefined?{$undefined:true}:v));
    const state=async()=>JSON.parse(await page.evaluate(()=>JSON.stringify(db,(k,v)=>v===undefined?{$undefined:true}:v)));
    const counts=()=>({persist:events.filter(x=>x==='persist').length,storage:events.filter(x=>x==='storage').length,cloud:events.filter(x=>x==='cloud').length});
    async function quiet(){await page.waitForTimeout(500);events.length=0}
    async function exact(label,before,expected,count=0){await page.waitForTimeout(500);const actual=await state(),observed=counts();snapshots.push({label,before,expected,actual,counts:observed});fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'property-rename-snapshots.json'),JSON.stringify(snapshots,null,2));assert.deepEqual(actual,encode(expected),label+' graph');assert.deepEqual(observed,typeof count==='object'?count:{persist:count,storage:count,cloud:count},label+' writes')}
    async function reset(data=propertyRenameLibrary(),key='P',lang='sv'){
      await page.evaluate(({json,key,lang})=>{closePopup();db=JSON.parse(json);currentLang=lang;updateUILabels();activeFilterProps=['unrelated',key];window.prompt=window.auditNativePrompt;location.hash='#property/'+encodeURIComponent(key);handleRouting(true);window.payloads=0},{json:JSON.stringify(data),key,lang});await quiet();
    }
    await page.evaluate(()=>window.auditNativePrompt=window.prompt);
    const originalPrototype=await page.evaluate(()=>Object.getOwnPropertyNames(Object.prototype).map(key=>[key,typeof Object.prototype[key]]));
    async function safe(key){assert.equal(await page.evaluate(()=>window.payloads||0),0);assert.equal(await page.locator('#wiki-app img,#wiki-app [onerror]').count(),0);assert.deepEqual(await page.evaluate(()=>Object.getOwnPropertyNames(Object.prototype).map(key=>[key,typeof Object.prototype[key]])),originalPrototype);assert(await page.evaluate(key=>Object.getPrototypeOf(db.properties)===Object.prototype&&Object.hasOwn(db.properties,key)&&db.objects.every(o=>!o.props||Object.getPrototypeOf(o.props)===Object.prototype),key));}
    const click=()=>page.locator('[data-core-action="renameProperty"]').click();
    async function nativeRename(name){answers=[name];await click();await page.waitForFunction(name=>window.location.hash==='#property/'+encodeURIComponent(name),String(name).trim());}
    // Import actual JSON before exercising any rename, including the exact audit fixture.
    await reset(original);let before=await state();answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'task017-original.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(original))});await page.waitForFunction(()=>window.directImportDone===true);await exact('actual import original Task017 fixture',before,original,1);await quiet();await nativeRename('Repaired');await exact('Task017 original 0/object/study/source reproduction',original,renamedLibrary(original,'P','Repaired'),1);
    const hostile=`Renamed Å % / O'Brien " <img src=x onerror="window.payloads++">`;
    for(const lang of ['sv','en'])for(const width of [1280,375,320]){
      await page.setViewportSize({width,height:900});const fixture=propertyRenameLibrary();await reset(fixture,'P',lang);before=await state();await page.evaluate(()=>{window.oldDefinition=db.properties.P;window.oldValue=db.objects[5].props.P;window.oldRecord=db.objects[5];window.retainedRename=document.querySelector('[data-core-action="renameProperty"]')});await nativeRename(hostile);const expected=renamedLibrary(fixture,'P',hostile);await exact(lang+' '+width+' exact complete rename',before,expected,1);assert(await page.evaluate(key=>db.properties[key]===oldDefinition&&db.objects[5]===oldRecord&&db.objects[5].props[key]===oldValue,hostile));assert.deepEqual(await page.evaluate(()=>activeFilterProps),['unrelated',hostile]);await safe(hostile);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'property-rename-'+lang+'-'+width+'.png'),fullPage:true});await quiet();await page.evaluate(()=>retainedRename.click());await exact(lang+' '+width+' retained consumed DOM action',expected,expected);summary.push({lang,width,graph:true,prototype:true});
    }
    for(const key of ['__proto__','constructor','toString','valueOf','hasOwnProperty'])for(const direction of ['to','from']){
      const old=direction==='to'?'P':key,dest=direction==='to'?key:'Renamed',fixture=propertyRenameLibrary(old);
      await reset(fixture,old);answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'literal-key.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>window.directImportDone===true);await exact(direction+' '+key+' JSON import',fixture,fixture,1);await quiet();await nativeRename(dest);await exact(direction+' '+key+' own literal rename',fixture,renamedLibrary(fixture,old,dest),1);await safe(dest);
    }
    for(const answer of [false,'','   ','P',' P ']){
      const fixture=propertyRenameLibrary();await reset(fixture);answers=[answer];await click();await exact('cancel/invalid/unchanged '+JSON.stringify(answer),fixture,fixture);
    }
    // Cancel leaves the current action reusable, not consumed.
    await reset();answers=[false];await click();await quiet();await nativeRename('Renamed');await exact('cancel then valid retry',propertyRenameLibrary(),renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);
    const conflicts={definition:()=>db.properties.Renamed={},zero:()=>db.objects[0].props.Renamed=0,false:()=>db.objects[0].props.Renamed=false,null:()=>db.objects[0].props.Renamed=null,undefined:()=>Object.defineProperty(db.objects[0].props,'Renamed',{value:undefined,enumerable:true,writable:true,configurable:true}),study:()=>db.studyObjects[0].props.Renamed=false,trash:()=>db.trash[0].data.props.Renamed=0,related:()=>db.properties.After.related=['Renamed'],citation:()=>db.sources[0].tags.push({type:'property',id:'Renamed',pages:'reserved'}),trashDefinition:()=>db.trash.push({type:'property',id:'Renamed',data:{}})};
    for(const [kind,mutate]of Object.entries(conflicts)){
      await reset();await page.evaluate(src=>(0,eval)('('+src+')()'),String(mutate));before=await state();await quiet();answers=['Renamed'];await click();await exact('conflicting destination '+kind,before,before);assert(messages.at(-1).message.includes('finns redan')||messages.at(-1).message.includes('lagrad egenskapsdata'));
    }
    // Native prompt blocks JS. A prompt hook models queued concurrent updates at
    // that boundary, while the real click/transaction/alerts still execute.
    const stale={library:()=>db=structuredClone(db),definition:()=>db.properties.P={...db.properties.P},definitionDelete:()=>delete db.properties.P,mapDelete:()=>delete db.properties,herb:()=>db.objects[0]={...db.objects[0]},props:()=>db.objects[0].props={...db.objects[0].props},nested:()=>db.objects[5].props.P.metadata.keep.push(99),study:()=>db.studyObjects[0]={...db.studyObjects[0]},source:()=>db.sources[0]={...db.sources[0]},tag:()=>db.sources[0].tags[0]={...db.sources[0].tags[0]},pages:()=>db.sources[0].tags[0].pages='newer',related:()=>db.properties.Before.related=[...db.properties.Before.related],trash:()=>db.trash[0].data={...db.trash[0].data},categoryMove:()=>db.properties.P.category='Empty',route:()=>location.hash='#index'};
    for(const [kind,mutate]of Object.entries(stale)){
      await reset();await page.evaluate(src=>{const mutation=(0,eval)('('+src+')');window.prompt=()=>{mutation();window.liveBeforeCommit=JSON.stringify(db,(k,v)=>v===undefined?{$undefined:true}:v);return'Renamed'}},String(mutate));await click();const live=JSON.parse(await page.evaluate(()=>window.liveBeforeCommit));await exact('stale during prompt '+kind,live,live);assert(messages.at(-1).message.includes('Data har ändrats'));
    }
    for(const kind of ['library','definition','detached']){
      await reset();await page.evaluate(kind=>{window.oldNode=document.querySelector('[data-core-action="renameProperty"]');if(kind==='library')db=structuredClone(db);if(kind==='definition')db.properties.P={...db.properties.P};if(kind==='detached')oldNode.remove()},kind);before=await state();await quiet();await page.evaluate(()=>oldNode.click());await exact('retained stale view '+kind,before,before);
    }
    await reset();await page.evaluate(()=>Object.defineProperty(db.sources[0].tags[0],'id',{value:'P',writable:false,configurable:false,enumerable:true}));before=await state();answers=['Renamed'];await click();await exact('late read-only tag rejects atomically',before,before);
    await reset();await page.evaluate(()=>{window.reentrant=null;window.prompt=()=>{window.reentrant=promptRenameProperty('P');return'Renamed'}});await click();await exact('reentrant confirmation only one rename',propertyRenameLibrary(),renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.equal(await page.evaluate(()=>reentrant),false);
    await reset();await page.evaluate(()=>Object.defineProperty(db.objects[0].props,'P',{value:undefined,enumerable:true,writable:true,configurable:true}));before=await state();answers=['Renamed'];await click();await exact('own undefined stays own undefined in memory',before,renamedLibrary(before,'P','Renamed'),1);assert(await page.evaluate(()=>Object.hasOwn(db.objects[0].props,'Renamed')&&db.objects[0].props.Renamed===undefined));
    await reset();before=await state();await page.evaluate(()=>window.prompt=()=>String.fromCharCode(0xd800));await click();await exact('unencodable name rejects before mutation',before,before);
    // Complete JSON-compatible graph roundtrip after successful rename.
    await reset();before=await state();await nativeRename('__proto__');let expected=renamedLibrary(before,'P','__proto__');await exact('roundtrip setup rename',before,expected,1);await quiet();const dl=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const download=await dl;await download.saveAs(path.join(process.env.TASK_EVIDENCE,'property-rename-backup.json'));assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),expected);await exact('export graph and literal key',expected,expected);await quiet();answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'renamed-roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(expected))});await page.waitForFunction(()=>window.directImportDone===true);await exact('import renamed graph exact',expected,expected,1);await quiet();await page.reload();await exact('reload preserves graph external unload counts',expected,expected,{persist:1,storage:1,cloud:0});await safe('__proto__');
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',checks:snapshots.length,summary,errors,externalRequests,browser:await browser.version()}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
