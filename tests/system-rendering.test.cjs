'use strict';
const test=require('node:test'), assert=require('node:assert/strict'), fs=require('node:fs'), vm=require('node:vm');
const {systemLibrary}=require('./fixtures/system-library.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const names=['escapeCoreText','coreAction','bindCoreActions','hasProp','getPropKeys','renderSystemPage','toggleSysCategory','openSysStudyModal','openSysSourceModal','renderSysStudyList','renderSysSourceList','toggleSysStudyLink','toggleSysSourceLink','submitCreateSysStudy','submitCreateSysSource'];
const functions=names.map(n=>{const m=[...source.matchAll(new RegExp(`^function ${n}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`,'gm'))];assert.equal(m.length,1,n);return m[0][0]}).join('\n');
function run(code){const c=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});c.input=JSON.stringify(systemLibrary());return JSON.parse(new vm.Script(`
const f=JSON.parse(input),db=f.library;let activeSystemForAdd='',writes=0;
class Node {constructor(){this.style={};this.children=[];this.value='';this.handlers={};this.checked=false;this.textContent='';}set innerHTML(v){this.html=v;this.children=[];}get innerHTML(){return this.html||'';}appendChild(n){this.children.push(n);}addEventListener(n,fn){this.handlers[n]=fn;}querySelectorAll(){return [];}}
const nodes=Object.create(null),document={getElementById(id){return nodes[id]||=new Node()},createElement(){return new Node()}};
function persist(){writes++}function closePopup(){for(const n of Object.values(nodes))n.style.display='none'}
${functions}
const before=JSON.stringify(db);let result;
${code}
JSON.stringify(result);
`).runInContext(c,{timeout:1000}));}
test('system renderer escapes all adversarial text without writes or record changes',()=>{const r=run(`renderSystemPage(f.system);result={html:nodes['wiki-app'].innerHTML,same:before===JSON.stringify(db),writes};`);assert(r.same);assert.equal(r.writes,0);assert.doesNotMatch(r.html,/<img|onerror="|onclick=/);assert(r.html.includes('&lt;img'));assert.equal((r.html.match(/Long O&#39;Brien/g)||[]).length,20);assert(r.html.includes('Author O&#39;Brien'));assert(r.html.includes('Year O&#39;Brien'));});
test('category expansion toggles independent sections and original symbols',()=>{assert.deepEqual(run(`toggleSysCategory(0);const a=nodes['cat-list-0'].style.display;toggleSysCategory(1);toggleSysCategory(0);result=[a,nodes['cat-list-0'].style.display,nodes['cat-list-1'].style.display,nodes['cat-icon-0'].innerText,writes];`),['none','block','none','\u300a',0]);});
test('actual safe checklists filter, rerender and retain exact IDs without writes',()=>{assert.deepEqual(run(`openSysStudyModal(f.system);const all=nodes['sys-study-checklist'].children.length;nodes['sys-study-filter'].value='ordinary';renderSysStudyList();const one=nodes['sys-study-checklist'].children[0];one.children[0].checked=true;one.children[0].handlers.change();result=[all,nodes['sys-study-checklist'].children.length,db.studyObjects[1].systems,writes,one.children[1].textContent];`),[2,1,['Other system',systemLibrary().system],1,'Ordinary study (Ref)']);});
test('study selection preserves unrelated systems and ignores stale system handlers',()=>{assert.deepEqual(run(`openSysStudyModal(f.system);const box=nodes['sys-study-checklist'].children[0].children[0];box.checked=false;box.handlers.change();const expected=db.studyObjects[0].systems.slice();renderSystemPage(f.other);box.checked=true;box.handlers.change();result=[expected,db.studyObjects[0].systems,writes,nodes['popup-sys-study'].style.display];`),[['Other system'],['Other system'],1,'none']);});
test('source selection retains unrelated tags and repeated adds do not duplicate',()=>{const r=run(`openSysSourceModal(f.system);const box=nodes['sys-source-checklist'].children[0].children[0];box.checked=true;box.handlers.change();box.handlers.change();box.checked=false;box.handlers.change();result={tags:db.sources[0].tags,writes,other:db.sources[1]};`);assert.equal(r.writes,1);assert.deepEqual(r.tags,systemLibrary().library.sources[0].tags.slice(1));assert.deepEqual(r.other,systemLibrary().library.sources[1]);});
test('opening and filtering both modals preserves data and numeric legacy years',()=>{assert.deepEqual(run(`openSysStudyModal(f.system);nodes['sys-study-filter'].value='missing';renderSysStudyList();openSysSourceModal(f.other);nodes['sys-source-filter'].value='ordinary';renderSysSourceList();result=[before===JSON.stringify(db),writes,nodes['sys-source-checklist'].children[0].children[1].textContent,activeSystemForAdd];`),[true,0,'Ordinary source (2024)','Other system']);});
test('creation retains established record shapes and targets explicit system',()=>{const r=run(`openSysStudyModal(f.other);nodes['new-sys-study-name'].value=' New study ';submitCreateSysStudy();openSysSourceModal(f.system);nodes['new-sys-src-title'].value=' New source ';nodes['new-sys-src-year'].value='2026';submitCreateSysSource();result={study:db.studyObjects.at(-1),source:db.sources.at(-1),writes};`);assert.match(r.study.id,/^study_\d+$/);assert.deepEqual({...r.study,id:undefined},{id:undefined,name:'New study',type:'Referens',desc:'',props:{},systems:['Other system']});assert.deepEqual({...r.source,id:undefined},{id:undefined,title:'New source',year:'2026',author:'',tags:[{type:'system',id:systemLibrary().system}]});assert.equal(r.writes,2);});
test('fixed system action dispatcher preserves exact system names and category indices',()=>{assert.deepEqual(run(`const actions=[['systemStudy',[f.system]],['systemSource',[f.other]],['systemCategory',[1]]];const targets=actions.map(([action,args])=>({dataset:{coreAction:action,coreArgs:JSON.stringify(args)},addEventListener(t,fn){this.click=fn}}));bindCoreActions({querySelectorAll(){return targets}});targets[0].click({preventDefault(){}});const first=activeSystemForAdd;targets[1].click({preventDefault(){}});targets[2].click({preventDefault(){}});result=[first,activeSystemForAdd,nodes['cat-list-1'].style.display,writes,before===JSON.stringify(db)];`),[systemLibrary().system,'Other system','none',0,true]);});
test('stale source selection cannot mutate newly active system',()=>{assert.deepEqual(run(`openSysSourceModal(f.system);const box=nodes['sys-source-checklist'].children[0].children[0];renderSystemPage(f.other);box.checked=false;box.handlers.change();result=[before===JSON.stringify(db),writes,nodes['popup-sys-source'].style.display];`),[true,0,'none']);});

// TASK 007B: full-library snapshots for singular/plural legacy compatibility.
const legacyCases = [
  ['singular only', {system:'A'}, {}, {systems:['A']}],
  ['plural only', {systems:['A','B']}, {systems:['B']}, {systems:['B','A']}],
  ['both representations target A', {system:'A',systems:['A','B']}, {systems:['B']}, {systems:['B','A']}],
  ['unrelated singular B and plural A/C', {system:'B',systems:['A','C']}, {system:'B',systems:['C']}, {system:'B',systems:['C','A']}],
  ['singular A with unrelated plural B', {system:'A',systems:['B']}, {systems:['B']}, {systems:['B','A']}],
];
for (const [label,initial,removed,restored] of legacyCases) {
  test(`legacy study ${label}: checkbox and mutation agree; no-op checks preserve all records`,()=>{
    const base=systemLibrary().library;
    const record={...base.studyObjects[0]};delete record.system;delete record.systems;
    const libraryFor=fields=>{const value=structuredClone(base);value.studyObjects[0]={...record,...fields};return value};
    const result=run(`
      db.studyObjects[0]=${JSON.stringify({...record,...initial})};
      openSysStudyModal('A');
      const snapshots=[];
      function snapshot(){snapshots.push({library:JSON.parse(JSON.stringify(db)),writes,checked:nodes['sys-study-checklist'].children[0].children[0].checked});}
      snapshot();
      toggleSysStudyLink(db.studyObjects[0].id,true);renderSysStudyList();snapshot();
      toggleSysStudyLink(db.studyObjects[0].id,false);renderSysStudyList();snapshot();
      toggleSysStudyLink(db.studyObjects[0].id,false);renderSysStudyList();snapshot();
      toggleSysStudyLink(db.studyObjects[0].id,true);renderSysStudyList();snapshot();
      toggleSysStudyLink(db.studyObjects[0].id,true);openSysStudyModal('A');snapshot();
      result=snapshots;
    `);
    assert.deepEqual(result,[
      {library:libraryFor(initial),writes:0,checked:true},
      {library:libraryFor(initial),writes:0,checked:true},
      {library:libraryFor(removed),writes:1,checked:false},
      {library:libraryFor(removed),writes:1,checked:false},
      {library:libraryFor(restored),writes:2,checked:true},
      {library:libraryFor(restored),writes:2,checked:true},
    ]);
  });
}
test('unlinked studies with missing or null arrays do not mutate on no-op removal',()=>{
  for(const fields of [{system:'B'},{system:'B',systems:null},{}]){
    const base=systemLibrary().library;delete base.studyObjects[0].systems;Object.assign(base.studyObjects[0],fields);
    const expected=structuredClone(base);expected.studyObjects[0].systems=['A'];
    const r=run(`db.studyObjects[0]=${JSON.stringify(base.studyObjects[0])};openSysStudyModal('A');const initial=nodes['sys-study-checklist'].children[0].children[0].checked;toggleSysStudyLink(db.studyObjects[0].id,false);const untouched=JSON.parse(JSON.stringify(db)),noOpWrites=writes;toggleSysStudyLink(db.studyObjects[0].id,true);toggleSysStudyLink(db.studyObjects[0].id,true);result={initial,untouched,noOpWrites,library:db,writes};`);
    assert.deepEqual(r,{initial:false,untouched:base,noOpWrites:0,library:expected,writes:1});
  }
});
test('source checkbox state survives filtering, reopening and repeated exact changes',()=>{
  const base=systemLibrary().library,removed=structuredClone(base),restored=structuredClone(base);
  removed.sources[0].tags.shift();restored.sources[0].tags=structuredClone(removed.sources[0].tags);restored.sources[0].tags.push({type:'system',id:systemLibrary().system});
  const r=run(`openSysSourceModal(f.system);const snapshots=[];function shot(){snapshots.push({library:JSON.parse(JSON.stringify(db)),writes,checked:nodes['sys-source-checklist'].children[0].children[0].checked})}shot();toggleSysSourceLink(db.sources[0].id,true);shot();toggleSysSourceLink(db.sources[0].id,false);renderSysSourceList();shot();toggleSysSourceLink(db.sources[0].id,false);shot();toggleSysSourceLink(db.sources[0].id,true);nodes['sys-source-filter'].value='title';renderSysSourceList();shot();toggleSysSourceLink(db.sources[0].id,true);openSysSourceModal(f.system);shot();result=snapshots;`);
  assert.deepEqual(r,[{library:base,writes:0,checked:true},{library:base,writes:0,checked:true},{library:removed,writes:1,checked:false},{library:removed,writes:1,checked:false},{library:restored,writes:2,checked:true},{library:restored,writes:2,checked:true}]);
});
test('absent source tags and missing IDs remain untouched on no-op removals',()=>{
  const base=systemLibrary().library;delete base.sources[0].tags;
  const expected=structuredClone(base);expected.sources[0].tags=[{type:'system',id:systemLibrary().system}];
  const r=run(`delete db.sources[0].tags;openSysSourceModal(f.system);toggleSysSourceLink('missing',true);toggleSysStudyLink('missing',false);toggleSysSourceLink(db.sources[0].id,false);const beforeAdd=JSON.parse(JSON.stringify(db)),noOpWrites=writes;toggleSysSourceLink(db.sources[0].id,true);toggleSysSourceLink(db.sources[0].id,true);result={beforeAdd,noOpWrites,library:db,writes};`);
  assert.deepEqual(r,{beforeAdd:base,noOpWrites:0,library:expected,writes:1});
});
test('both stale checklist callbacks preserve the complete library and perform zero writes',()=>{
  const r=run(`openSysStudyModal(f.system);const study=nodes['sys-study-checklist'].children[0].children[0];openSysSourceModal(f.system);const source=nodes['sys-source-checklist'].children[0].children[0];renderSystemPage(f.other);study.checked=false;source.checked=false;study.handlers.change();source.handlers.change();result={library:db,writes,hidden:[nodes['popup-sys-study'].style.display,nodes['popup-sys-source'].style.display]};`);
  assert.deepEqual(r,{library:systemLibrary().library,writes:0,hidden:['none','none']});
});
