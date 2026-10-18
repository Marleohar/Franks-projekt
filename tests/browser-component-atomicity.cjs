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





    const fixture=require('./fixtures/component-atomicity-library.cjs').componentAtomicityLibrary(),records=[];
    const originalFour=[
      {name:'original hidden protected tail',index:0,setup:"Object.defineProperty(a,'2',{enumerable:false,configurable:false})"},
      {name:'original hidden readonly middle',index:0,setup:"Object.defineProperty(a,'1',{enumerable:false,writable:false})"},
      {name:'original hidden tail remove middle',index:1,setup:"Object.defineProperty(a,'2',{enumerable:false,configurable:false})"},
      {name:'original sparse protected tail',index:0,setup:"a[3]=a[2];delete a[1];Object.defineProperty(a,'3',{enumerable:false,configurable:false})"}
    ];
    const layouts=[...originalFour,
      ...['writable','configurable'].flatMap(flag=>[0,1,2].map(i=>({name:flag+' index '+i,index:1,setup:"Object.defineProperty(a,'"+i+"',{ "+flag+":false })"}))),
      {name:'hidden ordinary index',index:1,setup:"Object.defineProperty(a,'1',{enumerable:false})"},
      {name:'sparse middle',index:0,setup:'delete a[1]'},
      {name:'sparse tail',index:0,setup:'delete a[2]'},
      {name:'undefined own slot',index:0,setup:'a[1]=undefined'},
      {name:'frozen',index:0,setup:'Object.freeze(a)'},
      {name:'sealed',index:0,setup:'Object.seal(a)'},
      {name:'nonextensible',index:0,setup:'Object.preventExtensions(a)'},
      {name:'readonly length',index:0,setup:"Object.defineProperty(a,'length',{writable:false})"},
      {name:'inherited readonly hole',index:0,setup:"const p=Object.create(Array.prototype);Object.defineProperty(p,'1',{value:second,writable:false});delete a[1];Object.setPrototypeOf(a,p)"},
      {name:'inherited getter setter hole',index:0,setup:"const p=Object.create(Array.prototype);Object.defineProperty(p,'1',{get(){window.atomicCalls++;return second},set(){window.atomicCalls++}});delete a[1];Object.setPrototypeOf(a,p)"},
      {name:'inherited future index',index:0,setup:"const p=Object.create(Array.prototype);Object.defineProperty(p,'4',{value:'reserved',writable:false});Object.setPrototypeOf(a,p)"},
      {name:'global inherited indexed accessor',index:0,setup:"Object.defineProperty(Array.prototype,'1000',{get(){window.atomicCalls++;return first},set(){window.atomicCalls++},configurable:true})"},
      {name:'own indexed accessor',index:0,setup:"Object.defineProperty(a,'1',{get(){window.atomicCalls++;return second},configurable:true,enumerable:true})"},
      {name:'custom iterator',index:0,setup:"Object.defineProperty(a,Symbol.iterator,{value:function*(){window.atomicCalls++;yield first},configurable:true})"},
      {name:'constructor species getter',index:0,setup:"Object.defineProperty(a,'constructor',{get(){window.atomicCalls++;return {}},configurable:true})"}
    ];
    const graph=()=>page.evaluate(()=>JSON.stringify(db)).then(JSON.parse);
    async function quiet(){await page.waitForTimeout(500);events.length=0;payloads.length=0}
    async function snapshot(){return page.evaluate(()=>{
      const a=db.formulas.F.components;
      const describe=o=>Reflect.ownKeys(o).map(key=>{const d=Object.getOwnPropertyDescriptor(o,key);return {key:String(key),value:typeof d.value==='function'?'[function]':d.value,getter:!!d.get,setter:!!d.set,writable:d.writable,enumerable:d.enumerable,configurable:d.configurable}});
      const inherited=[];for(let proto=Object.getPrototypeOf(a);proto;proto=Object.getPrototypeOf(proto))inherited.push(describe(proto).filter(d=>/^\d+$/.test(d.key)));return {own:describe(a),inherited,rows:a.length};
    })}
    async function exact(label,before,count=0,descriptors,expected=before){await page.waitForTimeout(500);const actual=await graph(),observed=Object.fromEntries(['persist','storage','cloud'].map(k=>[k,events.filter(e=>e===k).length]));const after=descriptors?await snapshot():undefined;records.push({label,before,expected,actual,counts:observed,payloads:structuredClone(payloads),descriptorsBefore:descriptors,descriptorsAfter:after});fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'component-atomicity-snapshots.json'),JSON.stringify(records,null,2));assert.deepEqual(actual,expected,label+' graph');assert.deepEqual(observed,typeof count==='number'?{persist:count,storage:count,cloud:count}:count,label+' counts');for(const p of payloads)assert.deepEqual(p.graph,expected,label+' serialized payload');if(descriptors)assert.deepEqual(after,descriptors,label+' descriptors');}
    async function reset(){await page.evaluate(json=>{closePopup();db=JSON.parse(json);location.hash='#formula/F';window.atomicCalls=0;renderFormulaDetailPage('F')},JSON.stringify(fixture));await quiet()}
    const button=(mode,index=0)=>page.locator('[data-core-action="component'+mode+'"]').nth(index);
    async function open(mode,index){await button(mode,mode==='Add'?0:index).click();if(mode==='Add'){await page.locator('#formula-component-search').fill('h%20key');await page.locator('#formula-component-results button').first().click()}if(mode==='Edit'){await page.locator('#formula-component-role').fill('unconfirmed');await page.locator('#formula-component-qty').fill('99');await page.locator('#formula-component-unit').fill('ml')}}
    async function configure(setup){await page.evaluate(src=>{const a=db.formulas.F.components,first=a[0],second=a[1];(0,eval)('(a,first,second)=>{'+src+'}')(a,first,second)},setup)}
    answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'atomicity.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>window.directImportDone);await quiet();
    for(const item of layouts)for(const mode of ['Add','Remove']){
      await reset();await open(mode,item.index);await configure(item.setup);const before=await graph(),descriptors=await snapshot();await page.evaluate(()=>{window.expectedArray=db.formulas.F.components;window.expectedDescriptors=Object.getOwnPropertyDescriptors(expectedArray);window.expectedPrototype=Object.getPrototypeOf(expectedArray);window.callsBefore=window.atomicCalls});await quiet();const retained=await page.locator('#formula-component-save').elementHandle();await page.locator('#formula-component-save').click();assert(await page.evaluate(()=>window.atomicCalls===window.callsBefore),'confirmation invoked an accessor');await exact(mode+' rejects '+item.name,before,0,descriptors);assert(await page.evaluate(()=>db.formulas.F.components===expectedArray&&Object.getPrototypeOf(expectedArray)===expectedPrototype&&Reflect.ownKeys(expectedDescriptors).every(k=>{const d=Object.getOwnPropertyDescriptor(expectedArray,k),b=expectedDescriptors[k];return d&&d.value===b.value&&d.get===b.get&&d.set===b.set})));await quiet();await retained.evaluate(el=>{el.onclick();el.onclick()});await exact(mode+' repeated callback '+item.name,before,0,descriptors);
      // Snapshot/export instrumentation can read accessor values; confirmation itself must not invoke getters/setters.
      const downloadWait=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const dl=await downloadWait;const file=path.join(process.env.TASK_EVIDENCE,'atomic-'+mode+'-'+layouts.indexOf(item)+'.json');await dl.saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),before);await quiet();await exact(mode+' pre-reload original graph '+item.name,before,0,descriptors);await quiet();await page.reload();await exact(mode+' reload original graph '+item.name,before,{persist:1,storage:1,cloud:0});
      if(originalFour.includes(item)&&mode==='Remove'){await quiet();answers=[false,true];await page.locator('#import-file-input').setInputFiles(file);await page.waitForFunction(()=>window.directImportDone);await exact('original reproduction import '+item.name,before,1);}
    }
    // Layouts already present before opening expose a safe non-destructive state.
    for(const item of originalFour){await reset();await configure(item.setup);const before=await graph(),descriptors=await snapshot();await quiet();await page.evaluate(()=>renderFormulaDetailPage('F'));assert.equal(await page.locator('[data-core-action="componentAdd"],[data-core-action="componentEdit"],[data-core-action="componentRemove"]').count(),0);await page.evaluate(index=>openFormulaComponent('F','remove',index),item.index);assert(!(await page.locator('#popup-formula-component').isVisible()));await exact('preexisting unsupported '+item.name,before,0,descriptors);}
    for(const mode of ['Add','Edit','Remove']){await reset();await page.evaluate(()=>Object.defineProperty(db.formulas.F.components,'unknownMetadata',{value:{keep:[0,false,null]},writable:false,configurable:false}));await open(mode,0);const before=await graph(),expected=structuredClone(before);if(mode==='Add')expected.formulas.F.components.push({objId:'h%20key',role:'unconfirmed',qty:99,unit:'ml'});else if(mode==='Edit')Object.assign(expected.formulas.F.components[0],{role:'unconfirmed',qty:99,unit:'ml'});else expected.formulas.F.components.splice(0,1);
      // Add has explicit defaults unless entered; keep this expected record literal.
      if(mode==='Add')Object.assign(expected.formulas.F.components.at(-1),{role:'',qty:1,unit:'g'});
      await page.evaluate(()=>{window.expectedArray=db.formulas.F.components;window.expectedRows=[...expectedArray];window.expectedMetadata=expectedArray.unknownMetadata});await quiet();await page.locator('#formula-component-save').click();await exact('ordinary '+mode+' identity and metadata',before,1,undefined,expected);assert(await page.evaluate(mode=>db.formulas.F.components===expectedArray&&expectedArray.unknownMetadata===expectedMetadata&&Object.getOwnPropertyDescriptor(expectedArray,'unknownMetadata').writable===false&&(mode==='Remove'?expectedArray[0]===expectedRows[1]:expectedArray[0]===expectedRows[0]&&expectedArray[1]===expectedRows[1]),mode));}
    for(const setup of ["Object.freeze(row)","Object.defineProperty(row,'unit',{value:row.unit,writable:false,configurable:false})","delete row.role;Object.preventExtensions(row)"]){await reset();await open('Edit',0);await page.evaluate(src=>{const row=db.formulas.F.components[0];(0,eval)('(row)=>{'+src+'}')(row)},setup);const before=await graph(),descriptors=await snapshot();await quiet();await page.locator('#formula-component-save').click();await exact('protected row atomic rejection '+setup,before,0,descriptors);}
    // A cancelled old control never closes or consumes a newer ordinary component or description session.
    for(const next of ['component','description']){await reset();await open('Remove',0);await page.evaluate(()=>{window.oldAtomicSave=document.getElementById('formula-component-save').onclick;window.oldAtomicCancel=document.getElementById('formula-component-cancel').onclick});await page.keyboard.press('Escape');if(next==='component')await open('Edit',1);else await page.locator('[data-core-action="formulaEditor"]').click();const before=await graph();await page.evaluate(next=>{window.expectedSession=next==='component'?openFormulaComponent.draft:openEditor.session},next);await quiet();await page.evaluate(()=>{oldAtomicSave();oldAtomicCancel()});await exact('expired atomic controls -> '+next,before);if(next==='component'){await page.locator('#formula-component-save').click();const expected=structuredClone(before);Object.assign(expected.formulas.F.components[1],{role:'unconfirmed',qty:99,unit:'ml'});await exact('new component remains authorized',before,1,undefined,expected)}else{await page.locator('#popup-editor-input').fill('authorized description');await page.locator('#popup-editor .primary').click();const expected=structuredClone(before);expected.formulas.F.desc='authorized description';await exact('new description remains authorized',before,1,undefined,expected)}}
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',checks:records.length,layouts:layouts.length,originalFailures:4,errors,externalRequests,browser:await browser.version()}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
