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





    const keys=['constructor','toString','__proto__','valueOf','hasOwnProperty'];
    const fixture=JSON.parse(JSON.stringify({objects:[{id:'one%2F',name:'Same Å',props:{Keep:false,Null:null},categoryLinks:['Empty'],taxonomies:{custom:'keep'},metadata:{a:[0,false]}},{id:'two/',name:'Same Å',props:{}}],categories:{C:{system:'S',subcategories:['Sub']},Empty:{system:'S',subcategories:[]}},properties:Object.fromEntries(keys.map(k=>[k,{category:'C',subcategory:'Sub'}])),systems:{S:{categories:['C','Empty']},'Ospecifierade kategorier':{categories:[],desc:'Kategorier som saknar skola.'}},systemOrder:['S','Ospecifierade kategorier'],sources:[],trash:[],formulas:{},studyObjects:[],metadata:{keep:[false,null,0]}}));
    const snapshots=[];const state=async()=>JSON.parse(await page.evaluate(()=>JSON.stringify(db)));
    async function quiet(){await page.waitForTimeout(500);events.length=0}
    async function exact(label,before,expected,n=0){await page.waitForTimeout(500);const actual=await state(),counts={persist:events.filter(x=>x==='persist').length,storage:events.filter(x=>x==='storage').length,cloud:events.filter(x=>x==='cloud').length};snapshots.push({label,before,expected,actual,counts});fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'property-key-snapshots.json'),JSON.stringify(snapshots,null,2));assert.deepEqual(actual,expected,label);assert.deepEqual(counts,typeof n==='number'?{persist:n,storage:n,cloud:n}:n,label+' writes');assert(await page.evaluate(()=>db.objects.every(o=>!o.props||Object.getPrototypeOf(o.props)===Object.prototype)&&Object.getPrototypeOf({})===Object.prototype),'prototype integrity')}
    await page.evaluate(()=>{db={objects:[],categories:{},properties:{},systems:{},sources:[],trash:[]};location.hash='#index';handleRouting(true)});await quiet();answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'literal-property-keys.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(fixture))});await page.waitForFunction(()=>window.directImportDone===true);await exact('actual JSON import',null,fixture,1);
    const library=await state();
    async function reset(hash,lang='sv'){await page.evaluate(({libraryJSON,hash,lang})=>{closePopup();db=JSON.parse(libraryJSON);currentLang=lang;updateUILabels();location.hash=hash;handleRouting(true)},{libraryJSON:JSON.stringify(library),hash,lang});await quiet()}
    async function action(name,args){const nodes=page.locator('[data-core-action="'+name+'"]');const i=await nodes.evaluateAll((nodes,args)=>nodes.findIndex(n=>n.dataset.coreArgs===JSON.stringify(args)),args);assert(i>=0,name);await nodes.nth(i).click()}
    async function choose(key){const nodes=page.locator('#direct-link-results input');const i=await nodes.evaluateAll((nodes,key)=>nodes.findIndex(n=>n.dataset.linkKey===key),key);assert(i>=0,key);await nodes.nth(i).check()}
    const confirm=()=>page.locator('#direct-link-confirm').click();
    for(const key of keys){
      for(const pathName of ['herb','property','category','new-property','new-category']){
        const category=pathName.includes('category'),newHerb=pathName.startsWith('new');await reset(pathName==='herb'?'#herb-id/one%252F':category?'#category/C':'#property/'+encodeURIComponent(key));const before=await state();
        await action(pathName==='herb'?'directProperty':'connectHerb',[pathName==='herb'?'one%2F':key]);
        if(newHerb){await page.locator('#direct-link-create').click();await page.locator('#direct-link-name').fill('New '+key)}else await choose(pathName==='herb'?key:'one%2F');
        await exact(key+' '+pathName+' draft',before,before);await quiet();await confirm();const expected=structuredClone(before);if(newHerb){const actual=await state(),created=actual.objects.at(-1);assert(created.id&&!before.objects.some(o=>o.id===created.id));expected.objects.push({id:created.id,name:'New '+key,desc:'',props:JSON.parse(JSON.stringify({[key]:true})),taxonomies:{}})}else Object.defineProperty(expected.objects[0].props,key,{value:true,enumerable:true});await exact(key+' '+pathName+' saved',before,expected,1);assert(await page.evaluate(({key,newHerb})=>Object.hasOwn(db.objects[newHerb?db.objects.length-1:0].props,key),{key,newHerb}));
      }
      for(const value of [0,{nested:[false,null,{dose:99}]},false,null]){
        await reset('#property/'+encodeURIComponent(key));await page.evaluate(({key,value})=>{db.objects[0].props=JSON.parse(JSON.stringify({...db.objects[0].props,[key]:value}))},{key,value});const before=await state();await action('connectHerb',[key]);await choose('one%2F');await confirm();const expected=structuredClone(before),assigned=value!==false&&value!==null;if(!assigned)Object.defineProperty(expected.objects[0].props,key,{value:true,enumerable:true,writable:true,configurable:true});await exact(key+' stored '+JSON.stringify(value),before,expected,assigned?0:1);
      }
      await reset('#herb-id/one%252F');let before=await state();await action('chooseCategory',['one%2F']);await page.locator('#assign-category-list button').filter({hasText:/^C /}).click();const row=page.locator('#assign-props-checklist label').filter({has:page.getByText(key,{exact:true})}).locator('input');await row.check();await page.locator('#popup-assign-prop').getByRole('button',{name:'Spara kopplingar',exact:true}).click();let expected=structuredClone(before);Object.defineProperty(expected.objects[0].props,key,{value:true,enumerable:true,configurable:true});await exact(key+' category-first add',before,expected,1);await quiet();await action('assign',['one%2F','C']);await row.uncheck();await page.locator('#popup-assign-prop').getByRole('button',{name:'Spara kopplingar',exact:true}).click();await exact(key+' category-first remove keeps links',expected,before,1);
      await reset('#property/'+encodeURIComponent(key));before=await state();await action('connectHerb',[key]);await choose('one%2F');await page.evaluate(()=>window.oldKeyConfirm=document.getElementById('direct-link-confirm').onclick);await page.keyboard.press('Escape');await page.evaluate(()=>oldKeyConfirm());await exact(key+' cancel retained',before,before);
      await action('connectHerb',[key]);await choose('one%2F');await page.evaluate(key=>Object.defineProperty(db.objects[0].props,key,{value:null,enumerable:true,writable:true,configurable:true}),key);before=await state();await quiet();await confirm();await exact(key+' stale own-null',before,before);
    }
    for(const lang of ['sv','en'])for(const width of [1280,375,320]){await page.setViewportSize({width,height:800});await reset('#herb-id/one%252F',lang);const before=await state();await action('directProperty',['one%2F']);assert.equal(await page.evaluate(()=>document.activeElement.id),'direct-link-search');await page.locator('#direct-link-search').fill('constructor');await choose('constructor');for(const direction of ['Tab','Shift+Tab'])for(let i=0;i<8;i++){await page.keyboard.press(direction);assert(await page.locator('#popup-direct-link').evaluate(el=>el.contains(document.activeElement)))}assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'property-key-'+lang+'-'+width+'.png'),fullPage:true});await page.keyboard.press('Escape');await exact(lang+' '+width+' keyboard cancel',before,before);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'directProperty')}
    await reset('#herb-id/one%252F');await page.evaluate(keys=>{for(const key of keys)Object.defineProperty(db.objects[0].props,key,{value:{nested:[0,false,null]},enumerable:true,writable:true,configurable:true})},keys);const expected=await state();await quiet();await page.evaluate(()=>persist(true));await exact('all literal own keys save',expected,expected,1);await quiet();const dl=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const download=await dl;await download.saveAs(path.join(process.env.TASK_EVIDENCE,'property-key-backup.json'));assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),expected);await exact('all literal keys export',expected,expected);await quiet();answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'roundtrip-property-keys.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(expected))});await page.waitForFunction(()=>window.directImportDone===true);await exact('all literal keys import roundtrip',expected,expected,1);await quiet();await page.reload();await exact('all literal keys reload',expected,expected,{persist:1,storage:1,cloud:0});assert(await page.evaluate(keys=>keys.every(k=>Object.hasOwn(db.objects[0].props,k)),keys));
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',checks:snapshots.length,keys,errors,externalRequests,browser:await browser.version()}));await context.close();
  }finally{if(browser)await browser.close()}
}
main().catch(error=>{console.error(error);process.exitCode=1});
