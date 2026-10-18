'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {formulaLibrary}=require('./fixtures/formula-library.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const names=['formulaComponentText','renderFormulaComponents','getDisplayObjName','equalAssignValue','escapeCoreText','coreAction','bindCoreActions','renderFormulasIndexPage','renderFormulaDetailPage','promptCreateFormula','deleteFormula','handleRouting','openEditor','saveDescription','closePopup','releaseAssignmentDialog','showAssignmentDialog'];
const functions=names.map(name=>{const pattern=name==='deleteFormula'?/^function deleteFormula\([^\r\n]*$/gm:new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`,'gm');const m=[...source.matchAll(pattern)];assert.equal(m.length,1,name);return m[0][0]}).join('\n');
function run(code){const c=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});c.structuredClone=structuredClone;c.inputJSON=JSON.stringify(formulaLibrary());return JSON.parse(new vm.Script(`
const f=JSON.parse(inputJSON),nodes=Object.create(null);let db=f.library;const window={location:{hash:'#formulas'},scrollTo(){}};
const document={getElementById(id){return nodes[id]||={innerHTML:'',value:'',style:{},focus(){},querySelectorAll(){return []}}},addEventListener(){},removeEventListener(){},querySelector(){return null},querySelectorAll(){return Object.values(nodes)}};
const currentLang="sv";const indexNameDisplayMode="swedish",herbSwedishDictionary={},herbEnglishDictionary={};
let directLinkDraft=null,assignModal=null,assignModalReturn=null;let writes=0,answers=[],approval=false,editorMode='',editorTargetId='';function alert(){}function persist(){writes++}function prompt(){return answers.shift()??null}function confirm(){return approval}function renderIndexPage(){throw Error('Unexpected route fallback')}
function assignmentKeydown(){}function containAssignmentFocus(){}
function t(key, params = {}) { return key.replace(/\\{(\\w+)\\}/g, (token, name) => Object.hasOwn(params, name) ? String(params[name]) : token); }
${functions}
const before=JSON.stringify(db);let result;
${code}
JSON.stringify({result,library:db,writes,hash:window.location.hash,unchanged:before===JSON.stringify(db),html:document.getElementById('wiki-app').innerHTML});
`).runInContext(c,{timeout:1000}));}
function unchanged(r){assert.equal(r.writes,0);assert.equal(r.unchanged,true);assert.deepEqual(r.library,formulaLibrary().library)}
test('formula archive safely renders ordered names and array counts; malformed counts fall back without changing records',()=>{
  const r=run('renderFormulasIndexPage();');unchanged(r);assert.doesNotMatch(r.html,/<img|onclick=|onerror="/);assert(r.html.includes('O&#39;Brien &quot; &amp; &amp;amp; &amp;#39;'));
  assert.deepEqual([...r.html.matchAll(/(\d+) komponent(?:er)?/g)].map(m=>+m[1]),[1,0,2,0,0,0,0]);
  assert.deepEqual([...r.html.matchAll(/href="#formula\/([^\"]+)"/g)].map(m=>decodeURIComponent(m[1])),Object.keys(formulaLibrary().library.formulas));
});
test('formula detail safely displays full long text and literal entities without encoding stored values',()=>{
  const r=run('renderFormulaDetailPage(f.special);');unchanged(r);assert.doesNotMatch(r.html,/<img|onclick=|onerror="/);assert.equal((r.html.match(/Long description/g)||[]).length,20);assert(r.html.includes('data-core-action="formulaDelete"'));assert(r.html.includes('&amp;amp;'));
});
test('actual router resolves distinct percent/space and adversarial formula keys exactly once',()=>{
  for(const key of ['Formula%20name','Formula name',formulaLibrary().special]){const r=run(`window.location.hash='#formula/'+encodeURIComponent(${JSON.stringify(key)});handleRouting(true);`);unchanged(r);assert.equal(r.hash,'#formula/'+encodeURIComponent(key));assert(r.html.includes(run(`result=escapeCoreText(${JSON.stringify(formulaLibrary().library.formulas[key].desc)});`).result));}
});
test('empty archive, absent collection, missing detail and empty description retain established messages',()=>{
  for(const code of ['db.formulas={};renderFormulasIndexPage();','delete db.formulas;renderFormulasIndexPage();']){const r=run(code);assert.equal(r.writes,0);assert(r.html.includes('Inga formler'))}
  const missing=run("renderFormulaDetailPage('missing');");unchanged(missing);assert(missing.html.includes('Formeln hittades inte'));
  const empty=run("renderFormulaDetailPage('Empty description');");unchanged(empty);assert(empty.html.includes('Ingen beskrivning'));
});
test('actual create dispatcher preserves cancelled/blank prompts and existing formulas without writes',()=>{
  for(const value of [null,'   ','Formula name']){const r=run(`answers=[${JSON.stringify(value)}];const button={dataset:{coreAction:'formulaCreate',coreArgs:'[]'},addEventListener(type,fn){this.click=fn}};bindCoreActions({querySelectorAll(){return [button]}});button.click({preventDefault(){}});`);unchanged(r);if(value==='Formula name')assert.equal(r.hash,'#formula/Formula%20name')}
});
test('new formula creation preserves exact intended key/shape and all unrelated records',()=>{
  const key='Created '+formulaLibrary().special,r=run(`answers=[${JSON.stringify(key)}];promptCreateFormula();`),expected=structuredClone(formulaLibrary().library);expected.formulas[key]={desc:'',components:[]};assert.equal(r.writes,1);assert.deepEqual(r.library,expected);assert.equal(r.hash,'#formula/'+encodeURIComponent(key));
});
test('delete dispatcher forwards exact original key; cancellation preserves and confirmation removes only intended formula',()=>{
  const f=formulaLibrary();for(const approval of [false,true]){const r=run(`approval=${approval};const button={dataset:{coreAction:'formulaDelete',coreArgs:JSON.stringify([f.special])},addEventListener(type,fn){this.click=fn}};bindCoreActions({querySelectorAll(){return [button]}});button.click({preventDefault(){}});`);if(!approval)unchanged(r);else{const expected=structuredClone(f.library);delete expected.formulas[f.special];assert.deepEqual(r.library,expected);assert.equal(r.writes,1);assert.equal(r.hash,'#formulas')}}
});
test('existing formula description editor receives exact key/text and saves only that record',()=>{
  const f=formulaLibrary(),value='Updated '+f.special;
  const r=run(`openEditor('formula',f.special);const opened={target:editorTargetId,value:document.getElementById('popup-editor-input').value};document.getElementById('popup-editor-input').value=${JSON.stringify(value)};saveDescription();result=opened;`);const expected=structuredClone(f.library);expected.formulas[f.special].desc=value;assert.deepEqual(r.result,{target:f.special,value:f.description});assert.deepEqual(r.library,expected);assert.equal(r.writes,1);
});
test('formula editor opening/closing is read-only; reserved inherited keys retain pre-existing creation behavior',()=>{
  const r=run(`openEditor('formula',f.special);closePopup();`);unchanged(r);
  const reserved=run("answers=['constructor'];promptCreateFormula();result=Object.hasOwn(db.formulas,'constructor');");unchanged(reserved);assert.equal(reserved.result,false);assert.equal(reserved.hash,'#formula/constructor');
});

// TASK019: additions preserve all pre-existing creation/deletion/security assertions above.
for(const components of [[],[{objId:'ordinary',role:'literal',qty:0,unit:'g'}],[null,42,'legacy',{},[]],{unknown:[1]},null])test('component shapes remain read-only '+JSON.stringify(components),()=>{
 const r=run(`db.formulas[f.special].components=${JSON.stringify(components)};result=JSON.parse(JSON.stringify(db));renderFormulaDetailPage(f.special);`);
 assert.equal(r.writes,0);assert.deepEqual(r.library,r.result);assert(r.html.includes('formulaEditor'));
 if(Array.isArray(components)&&components[0]?.qty===0){assert(r.html.includes('formula-qty" style="margin:0;">0<'));assert(r.html.includes('#herb-id/ordinary'));}
});
test('hostile component fields and missing identities render literal text, never markup',()=>{
 const r=run(`db.formulas[f.special].components=[{objId:f.payload,role:f.payload,qty:0,unit:f.payload},{objId:'ordinary',role:'exact',qty:'0.00',unit:'g'}];result=JSON.parse(JSON.stringify(db));renderFormulaDetailPage(f.special);`);
 assert.deepEqual(r.library,r.result);assert.equal(r.writes,0);assert.doesNotMatch(r.html,/<img|onclick=|onerror="/);assert(r.html.includes('0.00'));assert(r.html.includes('Otillgängligt objekt'));
});
for(const kind of ['cancel','unchanged','repeat','whitespace','absent'])test('formula editor no-op '+kind,()=>{
 const setup=kind==='whitespace'?"db.formulas[f.special].desc='  keep whitespace  ';":kind==='absent'?"delete db.formulas[f.special].desc;":'';
 const action=kind==='cancel'?"document.getElementById('popup-editor-input').value='discard';closePopup();saveDescription();":"saveDescription();saveDescription();";
 const r=run(`${setup}result=JSON.parse(JSON.stringify(db));openEditor('formula',f.special);${action}`);assert.deepEqual(r.library,r.result);assert.equal(r.writes,0);
});
for(const mutation of [
 "db=structuredClone(db)","db.formulas={...db.formulas}","db.formulas[f.special]={...db.formulas[f.special]}","delete db.formulas[f.special]", "db.formulas=null",
 "db.formulas[f.special].desc='newer'","db.formulas[f.special].unknown.keep=true","db.formulas[f.special].components.push({objId:'newer'})",
 "db.formulas[f.special].components=[...db.formulas[f.special].components]","db.formulas[f.special].components[0]={...db.formulas[f.special].components[0]}",
 "window.location.hash='#index'","editorTargetId='One'","Object.freeze(db.formulas[f.special])"
])test('formula stale/readonly save rejects '+mutation,()=>{
 const r=run(`openEditor('formula',f.special);document.getElementById('popup-editor-input').value='conflicting';${mutation};result=JSON.parse(JSON.stringify(db));saveDescription();saveDescription();`);assert.deepEqual(r.library,r.result);assert.equal(r.writes,0);
});
test('approved formula change preserves component/value identities and all metadata with one save',()=>{
 const r=run(`const record=db.formulas[f.special],rows=record.components,first=rows[0];openEditor('formula',f.special);document.getElementById('popup-editor-input').value=' changed ';saveDescription();saveDescription();result={record:record===db.formulas[f.special],rows:rows===record.components,first:first===rows[0]};`);
 const expected=structuredClone(formulaLibrary().library);expected.formulas[formulaLibrary().special].desc='changed';assert.deepEqual(r.library,expected);assert.equal(r.writes,1);assert.deepEqual(r.result,{record:true,rows:true,first:true});
});
for(const name of ['__proto__','constructor','toString','valueOf','hasOwnProperty'])test('own literal formula key '+name,()=>{
 const r=run(`Object.defineProperty(db.formulas,${JSON.stringify(name)},{value:{desc:'before',components:[],metadata:{keep:false}},enumerable:true,writable:true,configurable:true});openEditor('formula',${JSON.stringify(name)});document.getElementById('popup-editor-input').value='after';saveDescription();result=Object.getPrototypeOf(db.formulas)===Object.prototype;`);assert.equal(r.result,true);assert.equal(r.library.formulas[name].desc,'after');assert.equal(r.writes,1);
});

for(const desc of [0,false,null,{legacy:[0,false]},['legacy']])test('unchanged non-text legacy description is not normalized '+JSON.stringify(desc),()=>{
 const r=run(`db.formulas[f.special].desc=${JSON.stringify(desc)};result=JSON.parse(JSON.stringify(db));openEditor('formula',f.special);saveDescription();`);assert.deepEqual(r.library,r.result);assert.equal(r.writes,0);
});

test('sparse formula gets only an explicitly saved description',()=>{
 const r=run(`delete db.formulas[f.special].desc;openEditor('formula',f.special);document.getElementById('popup-editor-input').value='new description';saveDescription();`);const expected=structuredClone(formulaLibrary().library);expected.formulas[formulaLibrary().special].desc='new description';assert.deepEqual(r.library,expected);assert.equal(r.writes,1);
});
test('nonextensible sparse formula rejects before adding description',()=>{
 const r=run(`delete db.formulas[f.special].desc;Object.preventExtensions(db.formulas[f.special]);result=JSON.parse(JSON.stringify(db));openEditor('formula',f.special);document.getElementById('popup-editor-input').value='blocked';saveDescription();`);assert.deepEqual(r.library,r.result);assert.equal(r.writes,0);
});
