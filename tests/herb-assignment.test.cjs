const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname,'../index.html'),'utf8');
const submit = source.match(/^function submitAssignProps\(\) \{[\s\S]*?^\}/m)[0];
for (const [label, props, initial, selected, expected, writes] of [
  ['no-op preserves exact values',{a:{dose:2},b:false},['a'],['a'],{a:{dose:2},b:false},0],
  ['new selection preserves false',{b:false},[],['a'],{a:true,b:false},1],
  ['explicit false selection',{b:false},[],['b'],{b:true},1],
  ['removal preserves unrelated metadata',{a:0,b:false},['a'],[],{b:false},1],
  ['multiple selections use one write',{},[],['a','b'],{a:true,b:true},1]
]) test(label,()=>{
  const context={input:{props,initial,selected},result:null};
  vm.runInNewContext(`
    const activeAssignEntity={id:'herb',props:input.props,metadata:{keep:1}};
    const assignCategoryRecord={}, record={category:'cat'};
    const db={objects:[activeAssignEntity],categories:{cat:assignCategoryRecord},properties:{a:record,b:record}};
    const assignLibrary=db, activeAssignCategory='cat';
    const assignPropertyRecords=new Map(Object.entries(db.properties));
    const assignInitialProps=new Set(input.initial),pendingSelectedProps=new Set(input.selected);
    let writes=0;
    function hasProp(o,p){return o.props[p]!==undefined&&o.props[p]!==null&&o.props[p]!==false;}
    function persist(){writes++;} function closePopup(){} function renderHerbPage(){}
    const window={location:{hash:'#herb-id/herb'}};
    ${submit}
    submitAssignProps();result={entity:activeAssignEntity,writes};`,context);
  assert.deepEqual(JSON.parse(JSON.stringify(context.result)),{entity:{id:'herb',props:expected,metadata:{keep:1}},writes});
});
