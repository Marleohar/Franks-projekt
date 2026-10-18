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




    const hostile=`O'Brien " Å % <img src=x onerror="window.payloads++"> $& {0}`;
    const fixture={objects:[{id:'first%2F',name:'Kamomill Ω',desc:hostile,props:{Zero:0,Data:{dose:2,metadata:{nested:[false,0]}},False:false,Null:null},taxonomies:{'Botanical Name':'Latin Å'},categoryLinks:['Empty','Växtdelar'],unknown:{keep:1}},{id:'first/',name:'Kamomill Ω',desc:'Different duplicate',props:{False:false,Null:null},taxonomies:{},unknown:{keep:2}},{id:'herb_test_2',name:'Legacy',props:{}}],categories:{'Växtdelar':{system:'S',subcategories:['Blommor']},Empty:{system:'T',subcategories:[]}},properties:{Blomma:{category:'Växtdelar',subcategory:'Blommor'},Leaf:{category:'Växtdelar'},Zero:{category:'Växtdelar'},Data:{category:'Växtdelar'},LostProperty:{category:'Missing'},[hostile]:{category:'Växtdelar'}},systems:{S:{categories:['Växtdelar']},T:{categories:['Empty']},'Ospecifierade kategorier':{categories:[],desc:'Kategorier som saknar skola.'}},systemOrder:['S','T','Ospecifierade kategorier'],sources:[{id:'z',title:'Z'},{id:'a',title:'A'}],studyObjects:[],formulas:{},trash:[{type:'object',id:'herb_test',name:'Gone',data:{id:'herb_test_1',name:'Gone'}}],unknown:{graph:[false,0,null]}};
    const snapshots=[],summary=[];let lang='sv';
    const state=()=>page.evaluate(()=>structuredClone(db));
    const counts=()=>({persist:events.filter(x=>x==='persist').length,storage:events.filter(x=>x==='storage').length,cloud:events.filter(x=>x==='cloud').length});
    async function quiet(){await page.waitForTimeout(500);events.length=0;}
    async function exact(label,expected,count=0){await page.waitForTimeout(500);const actual=await state(),observed=counts();snapshots.push({label,expected,actual,counts:observed});assert.deepEqual(actual,expected,label+' graph');assert.deepEqual(observed,typeof count==='object'?count:{persist:count,storage:count,cloud:count},label+' writes');}
    async function reset(hash){await page.evaluate(({data,hash,lang})=>{closePopup();db=data;currentLang=lang;updateUILabels();location.hash=hash;handleRouting(true);window.payloads=0;Object.defineProperty(crypto,'randomUUID',{value:()=> 'test',configurable:true});},{data:structuredClone(fixture),hash,lang});await quiet();}
    async function route(hash){await page.evaluate(hash=>{location.hash=hash;handleRouting(true);},hash);}
    async function action(name,args){const nodes=page.locator('[data-core-action="'+name+'"]');const i=await nodes.evaluateAll((nodes,args)=>nodes.findIndex(n=>JSON.stringify(JSON.parse(n.dataset.coreArgs))===JSON.stringify(args)),args);assert.ok(i>=0,name+' exists');await nodes.nth(i).click();}
    async function choose(key){const nodes=page.locator('#direct-link-results input');const i=await nodes.evaluateAll((nodes,key)=>nodes.findIndex(n=>n.dataset.linkKey===key),key);assert.ok(i>=0,'candidate '+key);await nodes.nth(i).check();}
    const confirm=()=>page.locator('#direct-link-confirm').click();
    async function create(name){await page.locator('#direct-link-create').click();await page.locator('#direct-link-name').fill(name);}
    async function safe(){assert.equal(await page.evaluate(()=>window.payloads),0);assert.equal(await page.locator('#wiki-app img,#popup-direct-link img,#popup-direct-link script,#popup-direct-link [onerror]').count(),0);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);}
    for(lang of ['sv','en'])for(const width of [1280,375,320]){
      await page.setViewportSize({width,height:800});const label=lang+' '+width;
      await reset('#property/Blomma');let expected=structuredClone(fixture);
      await action('connectHerb',['Blomma']);assert.equal(await page.evaluate(()=>document.activeElement.id),'direct-link-search');await page.locator('#direct-link-search').fill('Kamomill');assert.equal(await page.locator('#direct-link-results input').count(),2);assert.ok((await page.locator('#direct-link-results').innerText()).includes('first%2F'));assert.ok((await page.locator('#direct-link-results').innerText()).includes('first/'));
      for(const key of ['Tab','Shift+Tab'])for(let i=0;i<10;i++){await page.keyboard.press(key);assert.equal(await page.locator('#popup-direct-link').evaluate(el=>el.contains(document.activeElement)),true);}
      await page.evaluate(()=>document.getElementById('btn-menu-text').focus());assert.equal(await page.locator('#popup-direct-link').evaluate(el=>el.contains(document.activeElement)),true);
      await page.locator('#direct-link-results input').nth(1).focus();await page.keyboard.press('Space');await exact(label+' selection no auto-save',expected);assert.equal(await page.locator('#popup-direct-link .popup-box').evaluate(el=>el.scrollWidth<=el.clientWidth),true);await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'herb-chooser-'+lang+'-'+width+'.png'),fullPage:true});
      await page.evaluate(()=>window.retainedConfirm=document.getElementById('direct-link-confirm').onclick);await page.locator('#direct-link-confirm').focus();await page.keyboard.press('Enter');expected.objects[1].props.Blomma=true;await exact(label+' property existing duplicate-name ID',expected,1);assert.equal(await page.locator('a[href="#herb-id/first%2F"]').count(),1);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'connectHerb');
      await quiet();await page.evaluate(()=>retainedConfirm());await exact(label+' repeated saved confirmation',expected);
      await reset('#property/Blomma');expected=structuredClone(fixture);await action('connectHerb',['Blomma']);await create('   ');await confirm();await exact(label+' invalid creation',expected);await page.locator('#direct-link-name').fill(hostile);await confirm();expected.objects.push({id:'herb_test_3',name:hostile,desc:'',props:{Blomma:true},taxonomies:{}});await exact(label+' property create atomic collision-free',expected,1);await safe();
      await reset('#category/'+encodeURIComponent('Växtdelar'));expected=structuredClone(fixture);assert.equal(await page.locator('[data-core-action="connectHerb"]').count(),5);await action('connectHerb',['Blomma']);await choose('first%2F');await confirm();expected.objects[0].props.Blomma=true;await exact(label+' category exact subcategory property',expected,1);assert.ok((await page.locator('#subcat-'+encodeURIComponent('Blommor')).innerText()).includes('Kamomill Ω'));
      await reset('#category/'+encodeURIComponent('Växtdelar'));expected=structuredClone(fixture);await action('connectHerb',['Leaf']);await create('Kamomill Ω');await page.locator('#direct-link-confirm').tap();expected.objects.push({id:'herb_test_3',name:'Kamomill Ω',desc:'',props:{Leaf:true},taxonomies:{}});await exact(label+' category new herb exact property',expected,1);
      await reset('#herb-id/'+encodeURIComponent('first%2F'));expected=structuredClone(fixture);await action('directProperty',['first%2F']);await page.locator('#direct-link-search').fill('Missing');assert.equal(await page.locator('#direct-link-results input:disabled').count(),1);await page.locator('#direct-link-search').fill('Blomma');assert.ok((await page.locator('#direct-link-results').innerText()).includes('Växtdelar — S'));await choose('Blomma');await safe();await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'property-chooser-'+lang+'-'+width+'.png'),fullPage:true});await confirm();expected.objects[0].props.Blomma=true;await exact(label+' direct property keeps explicit ordered links',expected,1);await safe();await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'direct-profile-'+lang+'-'+width+'.png'),fullPage:true});
      await quiet();await action('assign',['first%2F','Växtdelar']);await page.locator('#assign-props-checklist label').filter({hasText:'Blomma'}).locator('input').uncheck();await page.locator('#popup-assign-prop').getByRole('button',{name:lang==='sv'?'Spara kopplingar':'Save assignments',exact:true}).click();delete expected.objects[0].props.Blomma;await exact(label+' removal retains explicit category',expected,1);
      await reset('#herb-id/herb_test_2');expected=structuredClone(fixture);await action('directProperty',['herb_test_2']);await choose('Blomma');await confirm();expected.objects[2].props.Blomma=true;await exact(label+' legacy property membership no categoryLinks',expected,1);assert.equal(Object.hasOwn((await state()).objects[2],'categoryLinks'),false);
      await quiet();await action('assign',['herb_test_2','Växtdelar']);await page.locator('#assign-props-checklist label').filter({hasText:'Blomma'}).locator('input').uncheck();await page.locator('#popup-assign-prop').getByRole('button',{name:lang==='sv'?'Spara kopplingar':'Save assignments',exact:true}).click();delete expected.objects[2].props.Blomma;await exact(label+' legacy final removal invents no explicit category',expected,1);
      for(const property of ['Zero','Data']){await reset('#property/'+property);await action('connectHerb',[property]);await choose('first%2F');await confirm();await exact(label+' preserve already linked '+property,fixture);}
      await reset('#property/Blomma');await action('connectHerb',['Blomma']);await choose('first/');await page.keyboard.press('Escape');await exact(label+' Escape cancellation',fixture);assert.equal(await page.evaluate(()=>document.activeElement.dataset.coreAction),'connectHerb');
      await action('connectHerb',['Blomma']);await create(hostile);await page.locator('#popup-direct-link').click({position:{x:2,y:2}});await exact(label+' backdrop cancels creation',fixture);await safe();summary.push({lang,width,entryPoints:3,keyboard:true,exactSnapshots:true});
    }
    // Stale and retained-control probes use live in-place mutations and complete graph checks.
    lang='sv';await page.setViewportSize({width:1280,height:800});
    for(const kind of ['library','herb-delete','herb-replace','herb-rename','property-delete','property-replace','property-rename','property-move','category-delete','category-replace','category-system','route','route-back','value','links','create-stale']){
      await reset('#property/Blomma');await action('connectHerb',['Blomma']);if(kind==='create-stale')await create('New');else await choose('first/');
      await page.evaluate(kind=>{if(kind==='library')db=structuredClone(db);if(kind==='herb-delete')db.objects.splice(1,1);if(kind==='herb-replace')db.objects[1]={...db.objects[1]};if(kind==='herb-rename')db.objects[1].name='New';if(kind==='property-delete')delete db.properties.Blomma;if(kind==='property-replace')db.properties.Blomma={category:'Växtdelar'};if(kind==='property-rename'){db.properties.Renamed=db.properties.Blomma;delete db.properties.Blomma;}if(kind==='property-move'||kind==='create-stale')db.properties.Blomma.category='Empty';if(kind==='category-delete')delete db.categories['Växtdelar'];if(kind==='category-replace')db.categories['Växtdelar']={system:'S'};if(kind==='category-system')db.categories['Växtdelar'].system='T';if(kind==='route'||kind==='route-back')location.hash='#index';if(kind==='value')db.objects[1].props.Blomma=null;if(kind==='links')db.objects[1].categoryLinks=['Empty'];},kind);
      if(kind==='route-back'){await page.waitForTimeout(30);await route('#property/Blomma');}const live=await state();await quiet();await confirm();await exact('stale '+kind,live);assert.ok(dialogs.at(-1).message.includes('Data har ändrats'));
    }

    for(const kind of ['herb-replace','herb-delete','herb-rename','property-replace','property-move','category-delete','category-replace','value']){
      await reset('#herb-id/'+encodeURIComponent('first%2F'));await action('directProperty',['first%2F']);await choose('Blomma');await page.evaluate(kind=>{if(kind==='herb-replace')db.objects[0]={...db.objects[0]};if(kind==='herb-delete')db.objects.splice(0,1);if(kind==='herb-rename')db.objects[0].name='Renamed';if(kind==='property-replace')db.properties.Blomma={category:'Växtdelar'};if(kind==='property-move')db.properties.Blomma.category='Empty';if(kind==='category-delete')delete db.categories['Växtdelar'];if(kind==='category-replace')db.categories['Växtdelar']={system:'S'};if(kind==='value')db.objects[0].props.Blomma=false;},kind);const live=await state();await quiet();await confirm();await exact('herb-side stale '+kind,live);assert.ok(dialogs.at(-1).message.includes('Data har ändrats'));
    }
    await reset('#property/Blomma');await action('connectHerb',['Blomma']);await page.evaluate(()=>{window.oldRadio=document.querySelector('#direct-link-results input').onchange;window.oldConfirm=document.getElementById('direct-link-confirm').onclick;});await page.keyboard.press('Escape');await action('connectHerb',['Blomma']);await page.evaluate(()=>{oldRadio();oldConfirm();});assert.equal(await page.locator('#direct-link-confirm').isDisabled(),true);await exact('retained callbacks cannot affect new draft',fixture);await page.keyboard.press('Escape');
    await reset('#herb-id/herb_test_2');await action('directProperty',['herb_test_2']);await choose(hostile);await confirm();let expected=structuredClone(fixture);Object.defineProperty(expected.objects[2].props,hostile,{value:true,enumerable:true,writable:true,configurable:true});await exact('hostile property literal assignment',expected,1);await safe();
    await quiet();const downloadEvent=page.waitForEvent('download');await page.evaluate(()=>downloadBackupFile());const download=await downloadEvent;await download.saveAs(path.join(process.env.TASK_EVIDENCE,'direct-link-backup.json'));assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),expected);await exact('export graph exact',expected);
    answers=[false,true];await page.locator('#import-file-input').setInputFiles({name:'synthetic-direct.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(expected))});await page.waitForFunction(()=>window.directImportDone===true);await exact('import graph exact one save',expected,1);
    await quiet();await page.reload();await exact('reload preserves graph and inherited unload local save',expected,{persist:1,storage:1,cloud:0});
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);fs.writeFileSync(path.join(process.env.TASK_EVIDENCE,'direct-link-snapshots.json'),JSON.stringify(snapshots,null,2));console.log(JSON.stringify({status:'PASS',browser:await browser.version(),summary,checks:snapshots.length,staleCases:24,externalRequests,errors}));await context.close();
  }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
