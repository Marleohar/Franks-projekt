const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const submit = source.match(/^function submitAssignProps\(\) \{[\s\S]*?^\}/m)[0];
const productionHelpers = ['snapshotAssignValues','equalAssignValue'].map(name => source.match(new RegExp('^function '+name+'\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}', 'm'))[0]).join('\n');
for (const [label, props, initial, selected, expected, writes] of [
  ['no-op preserves exact values',{a:{dose:2},b:false},['a'],['a'],{a:{dose:2},b:false},0],
  ['new selection preserves false',{b:false},[],['a'],{a:true,b:false},1],
  ['explicit false selection',{b:false},[],['b'],{b:true},1],
  ['removal preserves unrelated metadata',{a:0,b:false},['a'],[],{b:false},1],
  ['multiple selections use one write',{},[],['a','b'],{a:true,b:true},1]
]) test(label,()=>{
  const context={input:{props,initial,selected},structuredClone,result:null};
  vm.runInNewContext(`
    const activeAssignEntity={id:'herb',props:input.props,metadata:{keep:1}};
    const assignCategoryRecord={}, record={category:'cat'};
    const db={objects:[activeAssignEntity],categories:{cat:assignCategoryRecord},properties:{a:record,b:record}};
    const assignLibrary=db, activeAssignCategory='cat';
    const assignPropertyRecords=new Map(Object.entries(db.properties));
    const assignInitialProps=new Set(input.initial),pendingSelectedProps=new Set(input.selected);
    ${productionHelpers}
    const assignValueSnapshot=snapshotAssignValues(activeAssignEntity,assignPropertyRecords);
    function rejectAssignDraft(){throw new Error('Unexpected stale draft');}
    let writes=0;
    function hasProp(o,p){return o.props[p]!==undefined&&o.props[p]!==null&&o.props[p]!==false;}
    function persist(){writes++;} function closePopup(){} function renderHerbPage(){}
    const document={activeElement:null};const window={location:{hash:'#herb-id/herb'}};
    ${submit}
    submitAssignProps();result={entity:activeAssignEntity,writes};`,context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)),{entity:{id:'herb',props:expected,metadata:{keep:1}},writes});
});


for (const kind of ['string-object','false-null','nested-object','nested-array','missing-null','missing-false','present-missing','valid','unchanged']) test('value snapshot: '+kind,()=>{
  const context={kind,structuredClone,result:null};
  vm.runInNewContext(`
    ${productionHelpers}
    const activeAssignEntity={id:'herb',props:{a:'old',b:false,c:{nested:{dose:2}},d:[{dose:2}]},metadata:{keep:1}};
    const record={category:'cat'},assignCategoryRecord={};
    const db={objects:[activeAssignEntity,{id:'other',props:{keep:5}}],categories:{cat:assignCategoryRecord},properties:{a:record,b:record,c:record,d:record,missing:record},systems:{keep:1},sources:[{keep:2}],unknown:{keep:[3]}};
    const assignLibrary=db,activeAssignCategory='cat',assignPropertyRecords=new Map(Object.entries(db.properties));
    const assignValueSnapshot=snapshotAssignValues(activeAssignEntity,assignPropertyRecords);
    const assignInitialProps=new Set(['a','c','d']),pendingSelectedProps=new Set(assignInitialProps);
    if(kind==='string-object'){pendingSelectedProps.delete('a');activeAssignEntity.props.a={dose:99,metadata:{newer:true}};}
    if(kind==='false-null'){pendingSelectedProps.add('b');activeAssignEntity.props.b=null;}
    if(kind==='nested-object'){pendingSelectedProps.delete('c');activeAssignEntity.props.c.nested.dose=99;}
    if(kind==='nested-array'){pendingSelectedProps.delete('d');activeAssignEntity.props.d[0].dose=99;}
    if(kind==='missing-null'){pendingSelectedProps.add('missing');activeAssignEntity.props.missing=null;}
    if(kind==='missing-false'){pendingSelectedProps.add('missing');activeAssignEntity.props.missing=false;}
    if(kind==='present-missing'){pendingSelectedProps.add('b');delete activeAssignEntity.props.b;}
    if(kind==='valid')pendingSelectedProps.add('missing');
    const before=structuredClone(db);let writes=0,rejected=0;
    function rejectAssignDraft(){rejected++;}function persist(){writes++;}function closePopup(){}function renderHerbPage(){}
    function hasProp(o,p){return o.props[p]!==undefined&&o.props[p]!==null&&o.props[p]!==false;}
    const window={location:{hash:'#index'}};
    ${submit}
    submitAssignProps();result={before,after:db,writes,rejected};`,context);
  const result=JSON.parse(JSON.stringify(context.result));
  if(kind==='valid'){result.before.objects[0].props.missing=true;assert.equal(result.writes,1);assert.equal(result.rejected,0);}
  else {assert.equal(result.writes,0);assert.equal(result.rejected,kind==='unchanged'?0:1);}
  assert.deepEqual(result.after,result.before);
});
