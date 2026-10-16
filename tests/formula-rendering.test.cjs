'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {formulaLibrary}=require('./fixtures/formula-library.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const names=['escapeCoreText','coreAction','bindCoreActions','renderFormulasIndexPage','renderFormulaDetailPage','promptCreateFormula','deleteFormula','handleRouting','openEditor','saveDescription','closePopup'];
const functions=names.map(name=>{const pattern=name==='deleteFormula'?/^function deleteFormula\([^\r\n]*$/gm:new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`,'gm');const m=[...source.matchAll(pattern)];assert.equal(m.length,1,name);return m[0][0]}).join('\n');
function run(code){const c=vm.createContext(Object.create(null),{codeGeneration:{strings:false,wasm:false}});c.inputJSON=JSON.stringify(formulaLibrary());return JSON.parse(new vm.Script(`
const f=JSON.parse(inputJSON),db=f.library,nodes=Object.create(null),window={location:{hash:'#formulas'},scrollTo(){}};
const document={getElementById(id){return nodes[id]||={innerHTML:'',value:'',style:{},focus(){},querySelectorAll(){return []}}},querySelectorAll(){return Object.values(nodes)}};
let writes=0,answers=[],approval=false,editorMode='',editorTargetId='';function persist(){writes++}function prompt(){return answers.shift()??null}function confirm(){return approval}function renderIndexPage(){throw Error('Unexpected route fallback')}
${functions}
const before=JSON.stringify(db);let result;
${code}
JSON.stringify({result,library:db,writes,hash:window.location.hash,unchanged:before===JSON.stringify(db),html:document.getElementById('wiki-app').innerHTML});
`).runInContext(c,{timeout:1000}));}
function unchanged(r){assert.equal(r.writes,0);assert.equal(r.unchanged,true);assert.deepEqual(r.library,formulaLibrary().library)}
test('formula archive safely renders ordered names and array counts; malformed counts fall back without changing records',()=>{
  const r=run('renderFormulasIndexPage();');unchanged(r);assert.doesNotMatch(r.html,/<img|onclick=|onerror="/);assert(r.html.includes('O&#39;Brien &quot; &amp; &amp;amp; &amp;#39;'));
  assert.deepEqual([...r.html.matchAll(/(\d+) komponenter/g)].map(m=>+m[1]),[1,0,2,0,0,0,0]);
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
