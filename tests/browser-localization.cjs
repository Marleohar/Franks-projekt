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


    const attack=`O'Brien " $& {0} Åäö <img src=x onerror="window.payloads++">`;
    const fixture={objects:[{id:'h',name:'Spara',desc:attack,props:{'Återställ':{dose:2}},taxonomies:{'Botanical Name':'Planta'},unknown:{keep:[1]}}],categories:{'Källor':{system:'Papperskorg',subcategories:[]},Empty:{system:'Papperskorg',subcategories:[]}},properties:{'Återställ':{category:'Källor',summary:attack,desc:attack,related:[]},[attack]:{category:'Källor'}},systems:{'Papperskorg':{categories:['Källor','Empty'],desc:attack},'Ospecifierade kategorier':{categories:[],desc:'Kategorier som saknar skola.'}},systemOrder:['Papperskorg','Ospecifierade kategorier'],sources:[{id:'s',title:'Lägg till källa',author:attack,year:2026,tags:[{type:'property',id:'Återställ',pages:'1'},{type:'system',id:'Papperskorg'}],unknown:{keep:[2]}}],studyObjects:[{id:'study',name:'Svenska',type:'User type',desc:attack,props:{'Återställ':true},systems:['Papperskorg']}],formulas:{'Radera':{desc:attack,components:[]}},trash:[{type:'property',id:'Lost',name:attack,data:{category:'Källor'},unknown:{keep:[3]}}],unknown:{nested:[true,false,0]}};
    const messages={sv:{assign:'Lägg till befintlig kategori / egenskap',save:'Spara kopplingar',cancel:'Avbryt',conflict:'Data har ändrats.',invalid:'dataformatet är ogiltigt',collision:'redan upptagen',stale:'Öppna papperskorgen igen',json:'Ogiltig JSON',preview:'Importen ERSÄTTER',backup:'Spara en säkerhetskopia'},en:{assign:'Add existing category / property',save:'Save assignments',cancel:'Cancel',conflict:'Data changed.',invalid:'data format is invalid',collision:'already occupied',stale:'Reopen Trash',json:'Invalid JSON',preview:'Import REPLACES',backup:'Save a backup'}};
    await page.evaluate(()=>{window.payloads=0;window.calls=0;const original=persist;persist=function(...args){calls++;return original(...args);};const read=FileReader.prototype.readAsText;FileReader.prototype.readAsText=function(...args){window.importDone=false;this.addEventListener('loadend',()=>window.importDone=true,{once:true});return read.apply(this,args);};});
    const state=()=>page.evaluate(()=>({db,calls,libraryWrites:qaWrites.filter(k=>k!== 'wiki_lang'&&k!=='wiki_name_mode').length}));
    async function reset(lang){await page.evaluate(({fixture,lang})=>{closePopup();db=fixture;currentLang=lang;localStorage.setItem('wiki_lang',lang);updateUILabels();location.hash='#index';handleRouting(true);calls=0;qaWrites=[];}, {fixture:structuredClone(fixture),lang});}
    async function route(hash){await page.evaluate(hash=>{location.hash=hash;handleRouting(true);},hash);}
    async function safe(){assert.equal(await page.locator('#wiki-app img,#wiki-app script,#wiki-app [onerror]').count(),0);assert.equal(await page.evaluate(()=>payloads),0);assert.equal(await page.locator('#wiki-app').evaluate(el=>[...el.querySelectorAll('*')].some(node=>[...node.attributes].some(a=>/^on/i.test(a.name)&&a.value.includes('payloads')))),false);}
    async function file(text,answersForImport=[]){answers=[...answersForImport];await page.locator('#import-file-input').setInputFiles({name:'quoted-Å.json',mimeType:'application/json',buffer:Buffer.from(text)});await page.waitForFunction(()=>window.importDone===true);assert.equal(answers.length,0);}
    const results=[];
    for(const lang of ['sv','en']){
      const m=messages[lang];await reset(lang);const initial=await state();
      const routes=[['#index',lang==='sv'?'Ört- och objektindex':'Herb & Object Index'],['#glossary',lang==='sv'?'Synonymer och ordlista':'Synonyms & Glossary'],['#search',lang==='sv'?'Filtersök profil':'Profile filter search'],['#herb-id/h','Spara'],['#category/'+encodeURIComponent('Källor'),'Källor'],['#property/'+encodeURIComponent('Återställ'),'Återställ'],['#system/'+encodeURIComponent('Papperskorg'),'Papperskorg'],['#study/study','Svenska'],['#formulas',lang==='sv'?'Formelarkiv':'Formula library'],['#formula/'+encodeURIComponent('Radera'),'⚗ Radera'],['#sources',lang==='sv'?'Källbibliotek':'Sources Library'],['#trash',lang==='sv'?'Papperskorg':'Trash']];
      for(const [hash,title] of routes){await route(hash);assert.equal((await page.locator('h1.wiki-title > span').innerText()).trim(),title);await safe();assert.deepEqual(await state(),initial);}

      // Static and dynamically populated dialogs use the active language without saving.
      await page.evaluate(()=>openSysStudyModal('Papperskorg'));assert.ok((await page.locator('#popup-sys-study').innerText()).includes(lang==='sv'?'Eller skapa nytt studieobjekt:':'Or create a study object:'));await page.evaluate(()=>closePopup());
      await page.evaluate(()=>openSysSourceModal('Papperskorg'));assert.ok((await page.locator('#popup-sys-source').innerText()).includes(lang==='sv'?'Eller skapa ny källa:':'Or create a source:'));await page.evaluate(()=>closePopup());
      await page.evaluate(()=>openEditor('herb','h'));assert.equal(await page.locator('#popup-editor-input').getAttribute('placeholder'),lang==='sv'?'Skriv beskrivning här...':'Write a description here...');assert.equal(await page.locator('#popup-editor-input').inputValue(),attack);await page.evaluate(()=>closePopup());
      await page.evaluate(()=>openEditPropSourceModal('Återställ','s','1'));assert.ok((await page.locator('#popup-edit-prop-source').innerText()).includes(lang==='sv'?'Ta bort koppling':'Remove link'));await page.evaluate(()=>closePopup());assert.deepEqual(await state(),initial);
      // Open header search refreshes its type badges immediately on a round trip.
      await page.evaluate(()=>openHeaderSearch());await page.locator('#global-search-input').fill('Återställ');assert.ok((await page.locator('#global-search-dropdown').textContent()).includes(lang==='sv'?'Egenskap':'Property'));await page.evaluate(()=>toggleLanguage());assert.ok((await page.locator('#global-search-dropdown').textContent()).includes(lang==='sv'?'Property':'Egenskap'));await page.evaluate(()=>toggleLanguage());await page.evaluate(()=>closeHeaderSearch());assert.deepEqual(await state(),initial);
      await route('#sources');assert.ok((await page.locator('#wiki-app').innerText()).includes('Lägg till källa'));assert.ok((await page.locator('#wiki-app').innerText()).includes(attack));
      await route('#index');const options=await page.locator('#wiki-app select').nth(1).locator('option').allTextContents();assert.ok(options.includes(lang==='sv'?'Automatiskt (Språk)':'Automatic (language)'));
      await page.locator('#btn-menu-text').click();assert.ok((await page.locator('#popup-nav-menu').innerText()).includes(lang==='sv'?'Källor':'Sources'));await page.evaluate(()=>closePopup());
      await route('#search');await page.locator('#search-prop-input').fill('Återställ');await page.keyboard.press('Enter');assert.ok((await page.locator('#wiki-app').innerText()).includes(lang==='sv'?'Aktiva egenskaper:':'Active properties:'));await safe();assert.deepEqual(await state(),initial);
      await page.evaluate(()=>activeFilterProps=[]);
      await route('#herb-id/h');await page.locator('[data-core-action="chooseCategory"]').click();assert.equal(await page.locator('#assign-category-title').innerText(),m.assign);assert.equal(await page.locator('#assign-category-filter').getAttribute('placeholder'),lang==='sv'?'Sök kategori...':'Search categories...');
      await page.locator('#assign-category-list button').filter({hasText:'Källor'}).click();assert.equal(await page.locator('#assign-prop-modal-title').innerText(),lang==='sv'?'Koppla [Källor]':'Assign [Källor]');
      const check=page.locator('#assign-props-checklist label').filter({hasText:attack}).locator('input');await check.check();
      const hashBefore=await page.evaluate(()=>location.hash);await page.evaluate(()=>toggleLanguage());assert.equal(await page.locator('#popup-assign-prop').isVisible(),false);assert.equal(await page.evaluate(()=>location.hash),hashBefore);assert.deepEqual(await state(),initial);await page.evaluate(()=>toggleLanguage());assert.deepEqual(await state(),initial);
      await page.evaluate(()=>{openAssignPropsModal('h','Källor');pendingSelectedProps.delete('Återställ');db.objects[0].props['Återställ']={newer:true};});const changed=await state();await page.locator('#popup-assign-prop').getByRole('button',{name:m.save,exact:true}).click();assert.ok(dialogs.at(-1).message.includes(m.conflict));assert.deepEqual(await state(),changed);
      await reset(lang);await route('#trash');await page.evaluate(()=>{db.trash[0].data=42;renderTrashPage();});let before=await state();await page.locator('[data-core-action="trashRestore"]').click();assert.ok(dialogs.at(-1).message.includes(m.invalid));assert.deepEqual(await state(),before);
      await reset(lang);await route('#trash');await page.evaluate(()=>{db.properties.Lost={keep:1};});before=await state();await page.locator('[data-core-action="trashRestore"]').click();assert.ok(dialogs.at(-1).message.includes(m.collision));assert.deepEqual(await state(),before);
      await reset(lang);await route('#trash');await page.evaluate(()=>{window.saved=document.querySelector('[data-core-action="trashDelete"]');db.trash=db.trash.slice();});before=await state();await page.evaluate(()=>saved.click());assert.ok(dialogs.at(-1).message.includes(m.stale));assert.deepEqual(await state(),before);
      await reset(lang);before=await state();await file('{bad');assert.ok(dialogs.at(-1).message.includes(m.json));assert.deepEqual(await state(),before);
      await file(JSON.stringify({...fixture,objects:[{id:'bad',name:42}]}));assert.ok(dialogs.at(-1).message.includes(lang==='sv'?'förväntar':'expected'));assert.deepEqual(await state(),before);
      const begin=dialogs.length;const downloadEvent=page.waitForEvent('download');await file(JSON.stringify(fixture),[true,false]);const download=await downloadEvent;await download.saveAs(path.join(process.env.TASK_EVIDENCE,'backup-'+lang+'.json'));assert.deepEqual(JSON.parse(fs.readFileSync(await download.path(),'utf8')),fixture);assert.ok(dialogs.slice(begin).some(d=>d.message.includes(m.backup)));assert.ok(dialogs.slice(begin).some(d=>d.message.includes(m.preview)));assert.deepEqual(await state(),before);
      await page.evaluate(()=>handleAlphaBarClick('$&'));assert.ok(dialogs.at(-1).message.includes('$&'));assert.deepEqual(await state(),before);
      await page.evaluate(()=>promptCreateHerb());assert.equal(dialogs.at(-1).message,lang==='sv'?'Ange örtens namn:':'Enter herb name:');assert.deepEqual(await state(),before);

      answers=[attack];await page.evaluate(()=>promptRenameProperty('Återställ'));assert.equal(dialogs.at(-1).message,lang==='sv'?'Egenskapen finns redan.':'The property already exists.');assert.deepEqual(await state(),before);
      answers=['Källor'];await page.evaluate(()=>promptCreateCategoryForHerb());assert.equal(dialogs.at(-1).message,lang==='sv'?'Kategorin finns redan.':'The category already exists.');assert.deepEqual(await state(),before);
      await page.evaluate(()=>deleteFormula('Radera'));assert.equal(dialogs.at(-1).message,lang==='sv'?"Radera formeln 'Radera'?":"Delete formula 'Radera'?");assert.deepEqual(await state(),before);

      // Error and success branches keep the same confirmation order in both languages.
      await page.evaluate(()=>{window.originalDownload=downloadBackupFile;downloadBackupFile=()=>{throw Error('synthetic export failure');};});
      await file(JSON.stringify(fixture),[true]);assert.ok(dialogs.at(-1).message.includes(lang==='sv'?'Exporten kunde inte startas':'Export could not start'));assert.deepEqual(await state(),before);await page.evaluate(()=>downloadBackupFile=originalDownload);
      await file(JSON.stringify(fixture),[false,true]);assert.ok(dialogs.at(-1).message.includes(lang==='sv'?'Biblioteket har ersatts i minnet':'The library was replaced in memory'));assert.deepEqual(await state(),{db:fixture,calls:1,libraryWrites:1});
      await reset(lang);
      // All name modes remain presentation-only, including the existing explicit taxonomy fields.
      await page.evaluate(()=>{db.objects[0].taxonomies['Swedish Name']='Svenskt värde';db.objects[0].taxonomies['English Name']='English value';});
      const namesBefore=await state();const expectedNames={auto:lang==='sv'?'Svenskt värde':'English value',sv_bot:'Svenskt värde (Planta)',en_bot:'English value (Planta)',botanical:'Planta',swedish:'Svenskt värde',english:'English value'};
      for(const [mode,expected] of Object.entries(expectedNames)){await route('#index');await page.locator('#wiki-app select').nth(1).selectOption(mode);assert.equal(await page.locator('#wiki-app ul.wiki-list a').first().textContent(),expected);assert.deepEqual(await state(),namesBefore);}
      await page.evaluate(()=>switchIndexNameDisplay('auto'));await reset(lang);
      for(const width of [1280,320]){await page.setViewportSize({width,height:720});
        for(const [hash] of routes){await route(hash);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,lang+' '+width+' '+hash);}
        for(const [modal,open] of [['popup-sys-study',()=>openSysStudyModal('Papperskorg')],['popup-sys-source',()=>openSysSourceModal('Papperskorg')],['popup-editor',()=>openEditor('herb','h')],['popup-edit-prop-source',()=>openEditPropSourceModal('?terst?ll','s','1')]]){
          await page.evaluate('('+open.toString()+')()');
          assert.equal(await page.locator('#'+modal+' .popup-box').evaluate(el=>el.scrollWidth<=el.clientWidth),true,lang+' '+width+' '+modal);
          await page.evaluate(()=>closePopup());
        }
        await route('#index');assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'index-'+lang+'-'+width+'.png'),fullPage:true});await route('#herb-id/h');await page.locator('[data-core-action="chooseCategory"]').click();assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);await page.screenshot({path:path.join(process.env.TASK_EVIDENCE,'assignment-'+lang+'-'+width+'.png'),fullPage:true});await page.keyboard.press('Escape');}
      results.push({lang,routes:routes.length,preserved:true,libraryWrites:0});
    }
    await reset('en');await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'en');assert.equal(await page.locator('#btn-menu-text').innerText(),'☰ Menu');assert.equal(await page.locator('[data-i18n="Exportera JSON"]').innerText(),'Export JSON');
    assert.deepEqual(errors,[]);assert.deepEqual(externalRequests,[]);console.log(JSON.stringify({status:'PASS',browser:await browser.version(),results,preferenceReload:true,payloads:await page.evaluate(()=>window.payloads||0),errors,externalRequests}));await context.close();
  }finally{if(browser)await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
