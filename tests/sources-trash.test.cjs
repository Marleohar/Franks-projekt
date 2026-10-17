const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {library,hostile}=require('./fixtures/sources-trash-library.cjs');
const source=fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const names=['escapeCoreText','coreAction','bindCoreActions','renderSourcesLibraryPage','renderTrashPage','currentTrashTarget','restoreFromTrash','validateTrashRestoreData','validateImportLibrary','permanentDeleteTrash','deleteTagWithWarning','getPropKeys','hasProp','setProp','getDisplayObjName'];
const functions=names.map(name=>source.match(new RegExp('^function '+name+'\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}','m'))[0]).join('\n');
function run(code){const context={input:library(),result:null};vm.runInNewContext(`
const db=input,before=JSON.stringify(db),nodes={};let trashView=null,trashViewGeneration=0,writes=0,answer=false,alerts=[],onConfirm=()=>{};
const currentLang='sv',herbSwedishDictionary={},window={location:{hash:'#trash'}};
const document={getElementById(id){return nodes[id]||={innerHTML:'',querySelectorAll(){return []}}}};
function persist(){writes++;}function alert(message){alerts.push(message);}function confirm(){onConfirm();return answer;}
function t(key, params = {}) { return key.replace(/\\{(\\w+)\\}/g, (token, name) => Object.hasOwn(params, name) ? String(params[name]) : token); }
${functions}
renderTrashPage();${code}
result={db,writes,alerts,html:document.getElementById('wiki-app').innerHTML,before:JSON.parse(before)};`,context);return JSON.parse(JSON.stringify(context.result));}
test('source fields and trash names/types encoded without writes',()=>{for(const code of ['renderSourcesLibraryPage();','']){const r=run(code);assert.deepEqual(r.db,r.before);assert.equal(r.writes,0);assert.doesNotMatch(r.html,/<img|<svg|onclick=/);assert.match(r.html,/&lt;/);assert.ok(r.html.includes('O&#39;Brien'));}});
test('empty source and trash messages retained',()=>{assert.match(run('db.sources=[];renderSourcesLibraryPage();').html,/Inga/);assert.match(run('db.trash=[];renderTrashPage();').html,/tom/);});
for(const [idx,type] of [[0,'object'],[1,'property'],[2,'category']])test('restore exact '+type,()=>{const r=run(`restoreFromTrash(${idx},trashViewGeneration);`),expected=library(),item=expected.trash.splice(idx,1)[0];if(type==='object')expected.objects.push(item.data);else expected[type==='property'?'properties':'categories'][item.id]=item.data;assert.deepEqual(r.db,expected);assert.equal(r.writes,1);});
for(const [idx,type] of [[0,'object'],[1,'property'],[2,'category']])test('occupied '+type+' aborts unchanged',()=>{const setup=type==='object'?"db.objects.push({id:'restored',keep:1});":`db.${type==='property'?'properties':'categories'}[db.trash[${idx}].id]={keep:1};`;const r=run(`${setup}const snapshot=JSON.stringify(db);restoreFromTrash(${idx},trashViewGeneration);if(JSON.stringify(db)!==snapshot)throw Error('changed');`);assert.equal(r.writes,0);assert.match(r.alerts[0],/occupied/);});
for(const mutation of ['db.trash.reverse()','db.trash=db.trash.slice()','db.trash[0]={...db.trash[0]}','db.trash[0].data={...db.trash[0].data}','db.trash[0].data.id="different"','renderTrashPage()'])for(const action of ['restoreFromTrash','permanentDeleteTrash'])test('reject stale '+action+' '+mutation,()=>{const r=run(`const generation=trashViewGeneration;${mutation};const snapshot=JSON.stringify(db);answer=true;${action}(0,generation);if(JSON.stringify(db)!==snapshot)throw Error('changed');`);assert.equal(r.writes,0);assert.match(r.alerts[0],/Reopen/);});
for(const idx of ['-1','0.5','999','"0"','null'])test('invalid index '+idx,()=>{const r=run(`answer=true;restoreFromTrash(${idx},trashViewGeneration);permanentDeleteTrash(${idx},trashViewGeneration);`);assert.deepEqual(r.db,r.before);assert.equal(r.writes,0);});
test('cancel delete zero writes',()=>{const r=run('permanentDeleteTrash(0,trashViewGeneration);');assert.deepEqual(r.db,r.before);assert.equal(r.writes,0);});
test('confirmed delete only intended record',()=>{const r=run('answer=true;permanentDeleteTrash(1,trashViewGeneration);'),expected=library();expected.trash.splice(1,1);assert.deepEqual(r.db,expected);assert.equal(r.writes,1);});
test('revalidate after confirmation changes list',()=>{const r=run('answer=true;onConfirm=()=>db.trash.reverse();permanentDeleteTrash(0,trashViewGeneration);');const expected=library();expected.trash.reverse();assert.deepEqual(r.db,expected);assert.equal(r.writes,0);});
test('unknown type cannot restore but can be permanently deleted',()=>{const r=run('restoreFromTrash(3,trashViewGeneration);');assert.deepEqual(r.db,r.before);assert.equal(r.writes,0);});
test('legacy property deletion removes herb values; restore does not reconstruct links',()=>{const r=run("answer=true;deleteTagWithWarning('property','Keep');renderTrashPage();restoreFromTrash(4,trashViewGeneration);");const expected=library();delete expected.objects[0].props.Keep;assert.deepEqual(r.db,expected);assert.equal(r.writes,2);});
test('legacy category deletion retains system/property references',()=>{const r=run("answer=true;deleteTagWithWarning('category','LiveCategory');");const expected=library();expected.trash.push({...r.db.trash.at(-1)});delete expected.categories.LiveCategory;assert.deepEqual(r.db,expected);assert.equal(r.writes,1);});

test('numeric publication year retains display without writes',()=>{const r=run('db.sources[0].year=2026;renderSourcesLibraryPage();');assert.match(r.html,/2026/);assert.equal(r.writes,0);});
test('reserved property key restored as own data without prototype change',()=>{const r=run("db.trash[1].id='__proto__';renderTrashPage();restoreFromTrash(1,trashViewGeneration);");assert.equal(r.writes,1);assert.ok(Object.hasOwn(r.db.properties,'__proto__'));assert.deepEqual(r.db.properties.__proto__,library().trash[1].data);});
test('occupied false-valued property key is still occupied',()=>{const r=run('db.properties[db.trash[1].id]=false;const snapshot=JSON.stringify(db);restoreFromTrash(1,trashViewGeneration);if(JSON.stringify(db)!==snapshot)throw Error("changed");');assert.equal(r.writes,0);assert.match(r.alerts[0],/occupied/);});
test('unknown legacy type permanently deletes only selected entry',()=>{const r=run('answer=true;permanentDeleteTrash(3,trashViewGeneration);'),expected=library();expected.trash.splice(3,1);assert.deepEqual(r.db,expected);assert.equal(r.writes,1);});

const invalidPayloads = [42,'invalid',[],null,false];
for (const type of ['property','category']) {
  const fields=type==='property'?['desc','summary','category','subcategory']:['desc','system'];
  const arrayField=type==='property'?'related':'subcategories';
  const cases=[...invalidPayloads,...fields.map(field=>({[field]:42})),{[arrayField]:'invalid'},{[arrayField]:[1]},{[arrayField]:['valid',null]}];
  for(const [index,data] of cases.entries())test(type+' rejects invalid payload '+index,()=>{
    const idx=type==='property'?1:2;
    const r=run(`db.trash[${idx}].data=${JSON.stringify(data)};renderTrashPage();const snapshot=JSON.stringify(db);restoreFromTrash(${idx},trashViewGeneration);if(JSON.stringify(db)!==snapshot)throw Error('mutated');`);
    assert.equal(r.writes,0);assert.match(r.alerts[0],/data format is invalid/);assert.deepEqual(r.db.trash[idx].data,data);
    const deleted=run(`db.trash[${idx}].data=${JSON.stringify(data)};renderTrashPage();answer=true;permanentDeleteTrash(${idx},trashViewGeneration);`);
    const expected=library();expected.trash.splice(idx,1);assert.deepEqual(deleted.db,expected);assert.equal(deleted.writes,1);
  });
  for(const [index,data] of [{},{metadata:{nested:[null,false,0,{keep:'all'}]}},{desc:null,[arrayField]:null},{desc:'text',[arrayField]:['one','two']}].entries())test(type+' accepts sparse/metadata '+index,()=>{
    const idx=type==='property'?1:2,collection=type==='property'?'properties':'categories';
    const r=run(`db.trash[${idx}].data=${JSON.stringify(data)};renderTrashPage();restoreFromTrash(${idx},trashViewGeneration);`);
    const expected=library(),item=expected.trash.splice(idx,1)[0];expected[collection][item.id]=data;assert.deepEqual(r.db,expected);assert.equal(r.writes,1);
  });
}

for(const mode of ['default','event','restore'])test('persistence normalization opt-in '+mode,()=>{
  const persistFunction=source.match(/^function persist\([^\r\n]*\) \{[\s\S]*?^\}/m)[0];
  const context={mode,result:null};
  vm.runInNewContext(`const db={keep:1},firestoreDb=null,MASTER_STORAGE_KEY='synthetic';let ensured=0,writes=0;const localStorage={setItem(){writes++;}};function ensureDbStructure(){ensured++;}${persistFunction}\npersist(mode==='restore'?true:mode==='event'?{type:'beforeunload'}:undefined);result={ensured,writes};`,context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)),{ensured:mode==='restore'?0:1,writes:1});
});
