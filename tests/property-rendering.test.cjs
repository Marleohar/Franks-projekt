'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { render } = require('./support/rendering-harness.cjs');
const { propertyLibrary } = require('./fixtures/property-library.cjs');

test('actual property renderer escapes every adversarial field and preserves relationships/references', () => {
  const fixture = propertyLibrary();
  const before = JSON.stringify(fixture.library);
  const result = render(fixture.library, 'property', fixture.property);
  assert.equal(JSON.stringify(result.library), before);
  assert.doesNotMatch(result.html, /<script|data-payload="yes"|onload="window/);
  assert.match(result.html, /&lt;svg/);
  assert.match(result.html, /&lt;script&gt;/);
  assert.match(result.html, /O&#39;Brien &quot; &amp;/);
  assert.equal((result.html.match(/<svg /g) || []).length, 1); // trusted icon only
  assert.match(result.html, /viewBox="0 0 24 24"/);
  assert.ok(result.html.includes('#herb-id/item%2520name'));
  assert.ok(result.html.includes('#herb-id/item%20name'));
  for (const label of ['Summary', 'Related', 'Category', 'System', 'Study', 'Type', 'Title', 'Author', 'Year', 'Pages']) assert.ok(result.html.includes(label));
  assert.ok(result.html.includes('Åäö 🐉'));
  assert.equal((result.html.match(/Long O&#39;Brien/g) || []).length, 12);
  assert.doesNotMatch(result.html, /onclick=/);
  for (const action of ['renameProperty', 'delete', 'propertySummary', 'editor', 'connectHerb', 'relatedProperty', 'addPropertySource', 'propertySource']) {
    assert.ok(result.html.includes(`data-core-action="${action}"`), action);
  }
});

test('actual property renderer preserves numeric legacy years and ordinary long text', () => {
  const fixture = propertyLibrary();
  fixture.library.sources[0].year = 2024;
  const result = render(fixture.library, 'property', fixture.property);
  assert.ok(result.html.includes('(2024)'));
  assert.deepEqual(result.library, fixture.library);
});

test('actual dispatcher forwards original property action arguments without evaluating text', () => {
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const binder = source.match(/^function bindCoreActions\(root\) \{[\s\S]*?^\}/m)[0];
  const fixture = propertyLibrary();
  const cases = [
    ['renameProperty', [fixture.property]], ['delete', ['property', fixture.property]],
    ['propertySummary', [fixture.property]], ['editor', ['prop', fixture.property]],
    ['connectHerb', [fixture.property]], ['relatedProperty', [fixture.property]],
    ['addPropertySource', [fixture.property]], ['propertySource', [fixture.property, fixture.sourceId, fixture.pages]],
  ];
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  context.inputJSON = JSON.stringify(cases);
  const result = JSON.parse(new vm.Script(`
    const cases=JSON.parse(inputJSON), calls=[]; let payloads=0;
    const record=(name,args)=>calls.push([name,args]);
    function promptRenameProperty(...args){record('renameProperty',args);}
    function deleteTagWithWarning(...args){record('delete',args);}
    function promptEditPropertySummary(...args){record('propertySummary',args);}
    function openEditor(...args){record('editor',args);}
    function openConnectHerbsToPropertyPopup(...args){record('connectHerb',args);}
    function openRelatedPropertiesTwoWayPopup(...args){record('relatedProperty',args);}
    function openAddSourceToPropertyDirect(...args){record('addPropertySource',args);}
    function openEditPropSourceModal(...args){record('propertySource',args);}
    ${binder}
    const nodes=cases.map(([action,args])=>({dataset:{coreAction:action,coreArgs:JSON.stringify(args)},addEventListener(type,fn){this.click=fn;}}));
    bindCoreActions({querySelectorAll(){return nodes;}});
    nodes.forEach(node=>node.click({preventDefault(){}}));
    JSON.stringify({calls,payloads});
  `).runInContext(context, { timeout: 1000 }));
  assert.deepEqual(result.calls, cases);
  assert.equal(result.payloads, 0);
});
