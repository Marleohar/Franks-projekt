const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const { propertyRenameLibrary, renamedLibrary } = require('./fixtures/property-rename-library.cjs');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
const names = ['propertyRenameTargets','createPropertyRenameDraft','renamedPropertyKey','commitPropertyRename','promptRenameProperty','equalAssignValue','persist','cleanForFirestore','bindCoreActions'];
const code = names.map(name => source.match(new RegExp('^function '+name+'\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}', 'm'))[0]).join('\n');
const encode = value => JSON.parse(JSON.stringify(value, (key, value) => value === undefined ? { $undefined: true } : value));
function run(body, oldName = 'P', library = propertyRenameLibrary(oldName)) {
  const context = { json: JSON.stringify(library), oldName, structuredClone };
  vm.runInNewContext(`
    let db=JSON.parse(json),cloudSaveTimeout,calls=0,storage=[],cloud=[],alerts=[],activeFilterProps=['unrelated',oldName];
    const MASTER_STORAGE_KEY='synthetic',isCloudReady=true,window={location:{hash:'#property/'+encodeURIComponent(oldName)}};
    const localStorage={setItem(key,value){storage.push(JSON.parse(value))}},firestoreDb={collection(){return {doc(){return {set(value){cloud.push(structuredClone(value));return Promise.resolve()}}}}}};
    function setTimeout(fn){fn();return 1}function clearTimeout(){}function updateCloudIndicator(){}function ensureDbStructure(){throw Error('Unexpected normalization')}
    function t(k){return k}function alert(message){alerts.push(message)}let answer='Renamed',promptHook=()=>{};function prompt(){promptHook();return answer}
    ${code}
    const originalPersist=persist;persist=function(...args){calls++;return originalPersist(...args)};
    const snapshot=()=>structuredClone(db);let before=snapshot(),result,checks={};
    ${body}
    output={before,after:db,result,calls,storage,cloud,alerts,checks,filter:activeFilterProps,hash:window.location.hash};
  `, context, { timeout: 2000 });
  return encode(context.output);
}
function exact(r, expected, count) {
  assert.deepEqual(r.after, encode(expected));assert.equal(r.calls,count);assert.equal(r.storage.length,count);assert.equal(r.cloud.length,count);
  if(count){const json=JSON.parse(JSON.stringify(expected));assert.deepEqual(r.storage[0],json);assert.deepEqual(r.cloud[0],json);}
}
test('TASK017 original 0/object/study/source failure is corrected without normalization',()=>{const r=run("const draft=createPropertyRenameDraft(oldName);result=commitPropertyRename(draft,answer)");exact(r,renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.equal(r.result.status,'saved');});
for(const name of ['constructor','toString','__proto__','valueOf','hasOwnProperty',`Å / % ' " <img onerror=1>`])for(const direction of ['from','to']) {
  const oldName=direction==='from'?name:'P', destination=direction==='from'?'Renamed':name;
  test('literal own property rename '+direction+' '+name,()=>{const r=run(`const draft=createPropertyRenameDraft(oldName),definition=db.properties[oldName],value=db.objects[5].props[oldName];result=commitPropertyRename(draft,${JSON.stringify(destination)});checks={definition:db.properties[${JSON.stringify(destination)}]===definition,value:db.objects[5].props[${JSON.stringify(destination)}]===value,own:db.objects.every(o=>!o.props||!Object.hasOwn(o.props,oldName)),prototypes:db.objects.filter(o=>o.props).every(o=>Object.getPrototypeOf(o.props)===Object.prototype)};`,oldName);exact(r,renamedLibrary(propertyRenameLibrary(oldName),oldName,destination),1);assert.deepEqual(r.checks,{definition:true,value:true,own:true,prototypes:true});});
}
test('replacement retains key slots, record identity, sparse fields and asymmetric list order',()=>{const r=run("const order=Object.keys(db.properties),value=db.objects[4].props[oldName],record=db.objects[4];result=commitPropertyRename(createPropertyRenameDraft(oldName),answer);checks={order:Object.keys(db.properties),propsOrder:Object.keys(record.props),sameValue:record.props.Renamed===value,sameRecord:db.objects[4]===record,sparse:!Object.hasOwn(db.properties.Sparse,'related'),noInverse:!db.properties.Renamed.related.includes('Asymmetric')}");exact(r,renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.deepEqual(r.checks,{order:['Before','Renamed','After','Asymmetric','Sparse'],propsOrder:['Before','Renamed','After'],sameValue:true,sameRecord:true,sparse:true,noInverse:true});});
test('own undefined moves as an own undefined value in memory',()=>{const r=run("Object.defineProperty(db.objects[0].props,oldName,{value:undefined,enumerable:true,writable:true,configurable:true});before=snapshot();result=commitPropertyRename(createPropertyRenameDraft(oldName),answer);checks={own:Object.hasOwn(db.objects[0].props,'Renamed'),undefined:db.objects[0].props.Renamed===undefined};");const e=renamedLibrary(propertyRenameLibrary(),'P','Renamed');e.objects[0].props.Renamed=undefined;assert.deepEqual(r.after,encode(e));assert.deepEqual(r.checks,{own:true,undefined:true});assert.equal(r.calls,1);assert.equal(Object.hasOwn(r.storage[0].objects[0].props,'Renamed'),false);assert.equal(r.cloud[0].objects[0].props.Renamed,'');});
for(const value of [null,'','  ','P',' P ',42,false,undefined,'\ud800'])test('cancel/invalid/unchanged input '+String(value),()=>{const expr=value===undefined?'undefined':JSON.stringify(value);const r=run(`result=commitPropertyRename(createPropertyRenameDraft(oldName),${expr});`);exact(r,r.before,0);});
for(const mutation of [
 "db.properties.Renamed={}",
 ...[0,false,null,undefined,{other:99}].map(value=>`Object.defineProperty(db.objects[0].props,'Renamed',{value:${value===undefined?'undefined':JSON.stringify(value)},enumerable:true})`),
 "db.studyObjects[0].props.Renamed=false",
 "db.trash[0].data.props.Renamed=null",
 "db.trash[1].data.props.Renamed=0",
 "db.sources[0].tags.push({type:'property',id:'Renamed',pages:'reserved'})",
 "db.properties.After.related=['Renamed']",
 "db.trash.push({type:'property',id:'Renamed',data:{}})"
])test('destination conflict rejects entire graph '+mutation,()=>{const r=run(`${mutation};before=snapshot();result=commitPropertyRename(createPropertyRenameDraft(oldName),answer);`);exact(r,r.before,0);assert(['existing','conflict'].includes(r.result.status));});
for(const mutation of [
 "db=structuredClone(db)","db.properties={...db.properties}","db.properties=null","delete db.properties","delete db.properties[oldName]","db.properties[oldName]={...db.properties[oldName]}","db.properties[oldName].metadata.values.push(99)",
 "db.objects=[...db.objects]","db.objects[0]={...db.objects[0]}","db.objects[0].props={...db.objects[0].props}","db.objects[5].props[oldName].metadata.keep.push(99)","delete db.objects[1].props[oldName]","db.objects.reverse()",
 "db.studyObjects[0]={...db.studyObjects[0]}","db.sources[0]={...db.sources[0]}","db.sources[0].tags=[...db.sources[0].tags]","db.sources[0].tags[0]={...db.sources[0].tags[0]}","db.sources[0].tags[0].pages='newer'",
 "db.trash[0]={...db.trash[0]}","db.trash[0].data={...db.trash[0].data}","db.trash[2].data.related.reverse()","window.location.hash='#index'"
])test('stale identity/value rejection '+mutation,()=>{const r=run(`const draft=createPropertyRenameDraft(oldName);${mutation};before=snapshot();result=commitPropertyRename(draft,answer);`);exact(r,r.before,0);assert.equal(r.result.status,'stale');});
test('readonly late tag write rejects before any definition/assignment mutation',()=>{const r=run("Object.defineProperty(db.sources[0].tags[0],'id',{value:oldName,writable:false,configurable:false,enumerable:true});before=snapshot();result=commitPropertyRename(createPropertyRenameDraft(oldName),answer);");exact(r,r.before,0);assert.equal(r.result.status,'stale');});
test('already consumed transaction cannot repeat',()=>{const r=run("const draft=createPropertyRenameDraft(oldName);commitPropertyRename(draft,answer);result=commitPropertyRename(draft,'Again');");exact(r,renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.equal(r.result.status,'inactive');});
test('prompt operation updates only typed filter names and routes exactly once',()=>{const r=run("result=promptRenameProperty(oldName)");exact(r,renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.equal(r.hash,'#property/Renamed');assert.deepEqual(r.filter,['unrelated','Renamed']);});
test('reentrant prompt call is inactive',()=>{const r=run("promptHook=()=>{checks.reentrant=promptRenameProperty(oldName)};result=promptRenameProperty(oldName)");exact(r,renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.equal(r.checks.reentrant,false);});
for(const mutation of ["db=structuredClone(db)","db.properties[oldName]={...db.properties[oldName]}","window.location.hash='#index'","node.isConnected=false"])
 test('retained DOM action rejects '+mutation,()=>{const r=run(`const node={dataset:{coreAction:'renameProperty',coreArgs:JSON.stringify([oldName])},isConnected:true,addEventListener(type,fn){this.click=fn}};bindCoreActions({querySelectorAll(){return[node]}});${mutation};before=snapshot();node.click({preventDefault(){}});`);exact(r,r.before,0);assert.equal(r.alerts.length,1);});
test('cancelled prompt can be retried, successful retained node cannot repeat',()=>{const r=run("const node={dataset:{coreAction:'renameProperty',coreArgs:JSON.stringify([oldName])},isConnected:true,addEventListener(type,fn){this.click=fn}};bindCoreActions({querySelectorAll(){return[node]}});answer=null;node.click({preventDefault(){}});answer='Renamed';node.click({preventDefault(){}});node.click({preventDefault(){}});");exact(r,renamedLibrary(propertyRenameLibrary(),'P','Renamed'),1);assert.equal(r.alerts.length,1);});

for(const value of [null,undefined,42,[],false])test('invalid original definition is never renamed '+String(value),()=>{const r=run(`db.properties[oldName]=${value===undefined?'undefined':JSON.stringify(value)};before=snapshot();result=createPropertyRenameDraft(oldName);`);exact(r,r.before,0);assert.equal(r.result,null);});
test('sparse original definition remains sparse',()=>{const r=run("result=commitPropertyRename(createPropertyRenameDraft('Sparse'),'Sparse renamed');");const e=propertyRenameLibrary();e.properties['Sparse renamed']=e.properties.Sparse;delete e.properties.Sparse;exact(r,e,1);assert.deepEqual(r.after.properties['Sparse renamed'],{});});

const task017Fixture=require('./fixtures/property-rename-reproduction.json');
test('exact TASK017 reproduction graph is repaired',()=>{const r=run("result=commitPropertyRename(createPropertyRenameDraft(oldName),answer)",'P',task017Fixture);exact(r,renamedLibrary(task017Fixture,'P','Renamed'),1);});

test('missing library cannot open a rename draft',()=>{const r=run("db=null;before=snapshot();result=createPropertyRenameDraft(oldName);");exact(r,null,0);assert.equal(r.result,null);});
