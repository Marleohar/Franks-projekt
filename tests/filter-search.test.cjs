'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {filterLibrary}=require('./fixtures/filter-library.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const names=['escapeCoreText','coreAction','bindCoreActions','getDisplayObjName','getPropKeys','hasProp','renderSearchPage','handleSearchPropInput','selectSearchPropSuggestion','handleSearchPropKeydown','addTypedSearchProp','removeFilterProp','resetSearch'];
const functions=names.map(name=>{const matches=[...source.matchAll(new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`,'gm'))];assert.equal(matches.length,1,name);return matches[0][0]}).join('\n');
function run(code){
  const context=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});
  context.input=JSON.stringify(filterLibrary());
  return JSON.parse(new vm.Script(`
    const f=JSON.parse(input),db=f.library,currentLang='sv',indexNameDisplayMode='auto',herbSwedishDictionary={};
    let activeFilterProps=[],writes=0;const alerts=[];
    const nodes=Object.create(null);
    const document={getElementById(id){return nodes[id]||={innerHTML:'',value:'',style:{},handlers:{},addEventListener(type,fn){this.handlers[type]=fn},querySelectorAll(){return []}}}};
    function persist(){writes++;throw new Error('Unexpected filter write')}
    function alert(message){alerts.push(message)}
    ${functions}
    const before=JSON.stringify(db);let result;
    ${code}
    JSON.stringify({result,filters:activeFilterProps,library:db,writes,alerts,unchanged:before===JSON.stringify(db)});
  `).runInContext(context,{timeout:1000}));
}
function preserved(result){assert.equal(result.writes,0);assert.equal(result.unchanged,true);assert.deepEqual(result.library,filterLibrary().library)}
test('filter renderer preserves match counts, percentages, stable descending order and complete records',()=>{
  const r=run(`activeFilterProps=[f.first,f.second];renderSearchPage();result=nodes['wiki-app'].innerHTML;`);preserved(r);
  assert.deepEqual(r.filters,[filterLibrary().first,filterLibrary().second]);
  const counts=[...r.result.matchAll(/(\d+)% match<\/b> \((\d+)\/(\d+) /g)].map(m=>m.slice(1));
  assert.deepEqual(counts,[['100','2','2'],['100','2','2'],['50','1','2'],['50','1','2']]);
  const links=[...r.result.matchAll(/<a href="([^\"]+)" class="wiki-link" style="font-weight:700;">/g)].map(m=>m[1]);
  const f=filterLibrary();assert.deepEqual(links,['#herb-id/item%2520name','#herb-id/'+encodeURIComponent(f.specialId).replace(/'/g,'&#39;'),'#herb-id/item%20name',run(`result=escapeCoreText('#study/'+f.library.studyObjects[0].id);`).result]);
  assert.doesNotMatch(r.result,/<img|onerror="|onclick=|oninput=|onkeydown=/);
  assert.equal((r.result.match(/Long /g)||[]).length,20);assert(r.result.includes('&lt;img'));assert(r.result.includes('Type &lt;img'));
});
test('case-insensitive suggestions safely render near-duplicate names and original categories',()=>{
  const r=run(`renderSearchPage();handleSearchPropInput('ALPHA');result={html:nodes['search-prop-dropdown'].innerHTML,display:nodes['search-prop-dropdown'].style.display};`);preserved(r);
  assert.equal(r.result.display,'block');assert.equal((r.result.html.match(/data-core-action="filterSuggestion"/g)||[]).length,2);
  assert(r.result.html.includes('O&#39;Brien &quot;'));assert(r.result.html.includes('Category &lt;img'));assert.doesNotMatch(r.result.html,/<img|onclick=/);
});
test('real selection and remove/reset functions preserve exact special-character filters',()=>{
  const r=run(`renderSearchPage();selectSearchPropSuggestion(f.first);selectSearchPropSuggestion(f.near);selectSearchPropSuggestion(f.first);const selected=activeFilterProps.slice();removeFilterProp(f.first);const removed=activeFilterProps.slice();resetSearch();result={selected,removed};`);preserved(r);
  const f=filterLibrary();assert.deepEqual(r.result,{selected:[f.first,f.near],removed:[f.near]});assert.deepEqual(r.filters,[]);
});
test('actual Enter and add-button paths resolve original property casing without duplicate filters',()=>{
  const r=run(`renderSearchPage();nodes['search-prop-input'].value=f.first.toUpperCase();let prevented=0;handleSearchPropKeydown({key:'Enter',preventDefault(){prevented++}});nodes['search-prop-input'].value=f.first;addTypedSearchProp();nodes['search-prop-input'].value=f.second;nodes['search-prop-input'].handlers.keydown({key:'Escape',preventDefault(){throw Error('wrong key')}});addTypedSearchProp();result={prevented};`);preserved(r);
  assert.equal(r.result.prevented,1);assert.deepEqual(r.filters,[filterLibrary().first,filterLibrary().second]);
});
test('empty filters, missing properties, no results and empty suggestions retain existing behavior',()=>{
  const r=run(`renderSearchPage();const empty=nodes['wiki-app'].innerHTML;nodes['search-prop-input'].value='missing';addTypedSearchProp();selectSearchPropSuggestion(f.absent);const none=nodes['wiki-app'].innerHTML;handleSearchPropInput('   ');const blank=nodes['search-prop-dropdown'].innerHTML;handleSearchPropInput('not present');result={empty,none,blank,dropdown:nodes['search-prop-dropdown'].innerHTML};`);preserved(r);
  assert(r.result.empty.includes('Matchade profiler (0)'));assert(r.result.empty.includes('Skriv och'));assert(r.result.none.includes('Inga profiler'));assert.equal(r.result.blank,'');assert.equal(r.result.dropdown,'');assert.equal(r.alerts.length,1);
});
test('suggestions omit selected properties, preserve insertion order and retain six-result limit',()=>{
  const r=run(`for(let i=0;i<8;i++)db.properties['Limit '+i]={category:'Ordinary'};const original=JSON.stringify(db);handleSearchPropInput('LIMIT');const initial=nodes['search-prop-dropdown'].innerHTML;selectSearchPropSuggestion('Limit 0');handleSearchPropInput('limit');result={initial,filtered:nodes['search-prop-dropdown'].innerHTML,same:original===JSON.stringify(db)};`);
  assert.equal(r.writes,0);assert.equal(r.result.same,true);assert.equal((r.result.initial.match(/class="suggest-item"/g)||[]).length,6);assert(!r.result.filtered.includes('<b>Limit 0</b>'));assert(r.result.filtered.indexOf('Limit 1')<r.result.filtered.indexOf('Limit 2'));
});
test('actual DOM action dispatcher forwards filter arguments and input listeners handle typing',()=>{
  const r=run(`renderSearchPage();nodes['search-prop-input'].value='ALPHA';nodes['search-prop-input'].handlers.input();const suggestion=nodes['search-prop-dropdown'].innerHTML;const actions=[['filterSuggestion',[f.first]],['filterAdd',[]],['filterRemove',[f.first]],['filterReset',[]]];const states=[];for(const [name,args] of actions){const node={dataset:{coreAction:name,coreArgs:JSON.stringify(args)},addEventListener(type,fn){this.click=fn}};bindCoreActions({querySelectorAll(){return [node]}});nodes['search-prop-input'].value=f.second;node.click({preventDefault(){}});states.push(activeFilterProps.slice())}result={states,suggestion};`);preserved(r);
  const f=filterLibrary();assert.deepEqual(r.result.states,[[f.first],[f.first,f.second],[f.second],[]]);assert(r.result.suggestion.includes('filterSuggestion'));
});
test('three active filters retain rounded percentages and descending order',()=>{
  const r=run(`activeFilterProps=[f.first,f.second,f.near];renderSearchPage();result=nodes['wiki-app'].innerHTML;`);preserved(r);
  assert.deepEqual([...r.result.matchAll(/(\d+)% match<\/b> \((\d+)\/(\d+) /g)].map(m=>m.slice(1)),[['67','2','3'],['67','2','3'],['33','1','3'],['33','1','3']]);
});
