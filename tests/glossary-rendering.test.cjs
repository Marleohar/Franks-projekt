'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {glossaryLibrary}=require('./fixtures/glossary-library.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const names=['escapeCoreText','coreAction','bindCoreActions','getDisplayObjName','renderGlossaryPage','switchGlossaryFilter','updateGlossaryBotanicalName','setHerbBotanicalFromGlossary','promptCreateHerbFromGlossary'];
const functions=names.map(name=>{const m=[...source.matchAll(new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`,'gm'))];assert.equal(m.length,1,name);return m[0][0]}).join('\n');
function run(code){const c=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});c.inputJSON=JSON.stringify(glossaryLibrary());return JSON.parse(new vm.Script(`
const f=JSON.parse(inputJSON),db=f.library,currentLang='sv',indexNameDisplayMode='auto',herbSwedishDictionary={};let glossaryFilterMode='all',writes=0,answers=[];
const edits=[],radios=[],app={innerHTML:'',querySelectorAll(selector){if(selector==='[data-glossary-edit]')return edits;if(selector.includes('gloss_filter'))return radios;return []}};
const document={getElementById(){return app}};function persist(){writes++}function prompt(){return answers.shift()??null}
function t(key, params = {}) { return key.replace(/\\{(\\w+)\\}/g, (token, name) => Object.hasOwn(params, name) ? String(params[name]) : token); }
${functions}
const before=JSON.stringify(db);let result;
${code}
JSON.stringify({result,library:db,writes,unchanged:before===JSON.stringify(db),mode:glossaryFilterMode,html:app.innerHTML});
`).runInContext(c,{timeout:1000}));}
function unchanged(r){assert.equal(r.unchanged,true);assert.equal(r.writes,0);assert.deepEqual(r.library,glossaryLibrary().library)}
test('actual glossary renderer escapes input values/text and preserves grouping, ordering and canonical IDs',()=>{
  const r=run('renderGlossaryPage();');unchanged(r);
  assert.doesNotMatch(r.html,/<img|onerror="|onblur=|onclick=|onchange=/);
  assert(r.html.includes('O&#39;Brien &quot;'));assert(r.html.includes('&lt;img'));assert(r.html.includes('#herb-id/item%2520name'));assert(r.html.includes('#herb-id/item%20name'));
  assert(r.html.includes('#herb-id/'+encodeURIComponent(glossaryLibrary().specialId)));
  assert.equal((r.html.match(/data-glossary-edit="group"/g)||[]).length,2);assert.equal((r.html.match(/data-glossary-edit="herb"/g)||[]).length,2);
  assert(r.html.indexOf('value="A ordinary"')<r.html.indexOf('value="Botanical'));
  assert.equal((r.html.match(/Unassigned O&#39;Brien/g)||[]).length,10);
});
test('actual filter modes retain assigned/unassigned rows and empty-state rendering without writes',()=>{
  const r=run(`const views=[];for(const mode of ['all','with_bot','no_bot']){switchGlossaryFilter(mode);views.push(app.innerHTML)}db.objects=[];switchGlossaryFilter('all');result={views,empty:app.innerHTML};`);
  assert.equal(r.writes,0);assert.deepEqual(r.result.views.map(v=>[(v.match(/data-glossary-edit="group"/g)||[]).length,(v.match(/data-glossary-edit="herb"/g)||[]).length]),[[2,2],[2,0],[0,2]]);assert(r.result.empty.includes('Inga poster'));
});
test('explicit grouped edit includes whitespace variants and changes only that visible group',()=>{
  const f=glossaryLibrary(),value='New '+f.text,expected=structuredClone(f.library);for(const i of [0,1])expected.objects[i].taxonomies['Botanical Name']=value;
  const r=run(`updateGlossaryBotanicalName(f.botanical,${JSON.stringify(value)});`);assert.equal(r.writes,1);assert.deepEqual(r.library,expected);
});
test('group no-op or empty edit preserves original whitespace and all metadata',()=>{
  const r=run(`updateGlossaryBotanicalName(f.botanical,' '+f.botanical+' ');updateGlossaryBotanicalName(f.botanical,'  ');renderGlossaryPage();`);unchanged(r);
});
test('actual blur binding preserves exact group key and literal text rather than HTML entities',()=>{
  const f=glossaryLibrary(),expected=structuredClone(f.library),value='Changed '+f.text;for(const i of [0,1])expected.objects[i].taxonomies['Botanical Name']=value;
  const r=run(`const input={dataset:{glossaryEdit:'group',glossaryArgs:JSON.stringify([f.botanical])},value:${JSON.stringify(value)},addEventListener(type,fn){this[type]=fn}};edits.push(input);renderGlossaryPage();input.blur();`);
  assert.equal(r.writes,1);assert.deepEqual(r.library,expected);assert(r.library.objects[0].taxonomies['Botanical Name'].includes('<img'));
});
test('actual unassigned blur binding preserves exact adversarial ID and unrelated taxonomy fields',()=>{
  const f=glossaryLibrary(),expected=structuredClone(f.library),value='Assigned '+f.text;expected.objects[2].taxonomies['Botanical Name']=value;
  const r=run(`const input={dataset:{glossaryEdit:'herb',glossaryArgs:JSON.stringify([f.specialId])},value:${JSON.stringify(value)},addEventListener(type,fn){this[type]=fn}};edits.push(input);renderGlossaryPage();input.blur();`);assert.equal(r.writes,1);assert.deepEqual(r.library,expected);
});
test('DOM-bound filter changes invoke the actual filter without modifying the library',()=>{
  const r=run(`const radio={value:'no_bot',addEventListener(type,fn){this[type]=fn}};radios.push(radio);renderGlossaryPage();radio.change();`);unchanged(r);assert.equal(r.mode,'no_bot');assert(!r.html.includes('data-glossary-edit="group"'));
});
test('cancelled/blank creation prompts preserve complete library with no persistence',()=>{
  for(const answers of [[null],['   '],['New',null],['New','   ']]){const r=run(`answers=${JSON.stringify(answers)};promptCreateHerbFromGlossary();`);unchanged(r)}
});
test('glossary creation action retains established shape and saves original unescaped characters',()=>{
  const f=glossaryLibrary(),bot='Created '+f.text,name='New herb '+f.text;
  const r=run(`answers=[${JSON.stringify(bot)},${JSON.stringify(name)}];const button={dataset:{coreAction:'glossaryCreate',coreArgs:'[]'},addEventListener(type,fn){this.click=fn}};bindCoreActions({querySelectorAll(){return [button]}});button.click({preventDefault(){}});`);
  assert.equal(r.writes,1);const created=r.library.objects.at(-1);assert.match(created.id,/^herb_\d+$/);assert.deepEqual(created,{id:created.id,name,desc:'',props:{},taxonomies:{'Botanical Name':bot}});const expected=structuredClone(f.library);expected.objects.push(created);assert.deepEqual(r.library,expected);
});
test('blank/missing unassigned edits do not affect other records; taxonomy omission stays supported',()=>{
  const r=run(`setHerbBotanicalFromGlossary(f.specialId,' ');setHerbBotanicalFromGlossary('missing','New');`);unchanged(r);
  const f=glossaryLibrary();delete f.library.objects[2].taxonomies;const expected=structuredClone(f.library);expected.objects[2].taxonomies={'Botanical Name':f.text};
  const added=run(`delete db.objects[2].taxonomies;setHerbBotanicalFromGlossary(f.specialId,f.text);`);assert.equal(added.writes,1);assert.deepEqual(added.library,expected);
});
