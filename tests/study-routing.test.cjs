'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {studyLibrary} = require('./fixtures/study-library.cjs');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const names = ['isReservedMissingCategory','categoryLinkedHerbs','escapeCoreText','coreAction','bindCoreActions','getDisplayObjName','getPropKeys','hasProp',
  'handleSearchPropKeydown','renderStudyPage','renderHerbPage','renderIndexPage','renderCategoryPage','renderSearchPage','handleRouting'];
const functions = names.map(name => {
  const matches = [...source.matchAll(new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`, 'gm'))];
  assert.equal(matches.length, 1, name);
  return matches[0][0];
}).join('\n');
function run(routes, search = false, fixture = studyLibrary()) {
  const context = vm.createContext(Object.create(null), {codeGeneration: {strings:false, wasm:false}});
  context.inputJSON = JSON.stringify({fixture, routes, search});
  return JSON.parse(new vm.Script(`
    const input=JSON.parse(inputJSON), f=input.fixture, db=f.library;
    const currentLang='sv',indexNameDisplayMode='auto',indexViewMode='alpha',herbSwedishDictionary={},t=(key,params={})=>key.replace(/\\{(\\w+)\\}/g,(token,name)=>Object.hasOwn(params,name)?String(params[name]):token);
    let activeFilterProps=[f.first], persistenceCalls=0, storageWrites=0;
    const localStorage={setItem(){storageWrites++},removeItem(){storageWrites++},clear(){storageWrites++}};
    function persist(){persistenceCalls++}
    const nodes=Object.create(null);
    const document={getElementById(id){return nodes[id]||={innerHTML:'',style:{},value:'',querySelectorAll(){return []},addEventListener(){}}}};
    const window={location:{hash:''},scrollTo(){}};
    ${functions}
    const before=JSON.stringify(db), pages=[];
    if(input.search){renderSearchPage();pages.push(nodes['wiki-app'].innerHTML)}
    for(const route of input.routes){window.location.hash=route;handleRouting(true);pages.push(nodes['wiki-app'].innerHTML)}
    JSON.stringify({before,after:JSON.stringify(db),pages,persistenceCalls,storageWrites,
      unavailable:[typeof fetch,typeof firebase,typeof XMLHttpRequest,typeof require,typeof process]});
  `).runInContext(context,{timeout:1000}));
}
function preserved(r){assert.equal(r.after,r.before);assert.equal(r.persistenceCalls,0);assert.equal(r.storageWrites,0);assert.deepEqual(r.unavailable,Array(5).fill('undefined'))}
for(const study of studyLibrary().library.studyObjects){
  test('exact decode-once study identity: '+JSON.stringify(study.id),()=>{
    const r=run(['#study/'+encodeURIComponent(study.id),'#search','#study/'+encodeURIComponent(study.id)]);preserved(r);
    for(const html of [r.pages[0],r.pages[2]]){
      assert(html.includes(study.name.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')));
      assert(html.includes('&lt;script&gt;'));assert(html.includes('&lt;img'));
      assert.doesNotMatch(html,/<script|<img|onclick=|data-core-action=/);
      assert.equal((html.match(/href="#system\//g)||[]).length,2);
      assert.equal((html.match(/href="#property\//g)||[]).length,1);
      assert(!html.includes('Unrelated'));
    }
  });
}
test('search links encode original IDs and preserve complete synthetic library',()=>{
  const r=run([],true);preserved(r);
  for(const study of studyLibrary().library.studyObjects){assert(r.pages[0].includes(('#study/'+encodeURIComponent(study.id)).replace(/'/g,'&#39;')))}
});
for(const hash of ['#study','#study/','#study/missing','#study/%','#study/%ZZ','#study/%E0%A4','#study/ordinary/extra']){
  test('safe study not-found: '+hash,()=>{const r=run([hash]);preserved(r);assert(r.pages[0].includes('Studieobjekt hittades inte'));assert(!r.pages[0].includes('data-core-action='))});
}
test('ordinary herb navigation remains available between study routes',()=>{
  const r=run(['#study/ordinary','#herb-id/item%2520name','#study/item%20name']);preserved(r);
  assert(r.pages[1].includes('Literal &lt;img'));assert(r.pages[1].includes('Original description'));
  assert(r.pages[2].includes('Study 7 '));
});

for(const mode of ['singular','plural','null plural','no links','no collection']){
  test('read-only legacy relationship shape: '+mode,()=>{
    const fixture=studyLibrary(), study=fixture.library.studyObjects[0];
    if(mode==='singular') delete study.systems;
    if(mode==='plural') delete study.system;
    if(mode==='null plural') study.systems=null;
    if(mode==='no links'){delete study.system;delete study.systems;delete study.props}
    if(mode==='no collection') delete fixture.library.studyObjects;
    const r=run(['#study/ordinary'],false,fixture);preserved(r);
    if(mode==='no collection') assert(r.pages[0].includes('Studieobjekt hittades inte'));
    else assert.equal((r.pages[0].match(/href="#system\//g)||[]).length,mode==='no links'?0:mode==='plural'?2:1);
  });
}
