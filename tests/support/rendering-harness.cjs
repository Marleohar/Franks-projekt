'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../../index.html'), 'utf8');
const names = ['escapeCoreText', 'coreAction', 'bindCoreActions', 'getDisplayObjName', 'getPropKeys',
  'hasProp', 'renderIndexPage', 'handleGlobalSearch', 'renderHerbPage', 'renderCategoryPage'];
const functions = names.map(name => {
  const matches = [...source.matchAll(new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`, 'gm'))];
  assert.equal(matches.length, 1, name);
  return matches[0][0];
}).join('\n');
function render(library, action, value, native = false) {
  const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
  context.inputJSON = JSON.stringify({ library, action, value, native });
  return JSON.parse(new vm.Script(`
    const input = JSON.parse(inputJSON), db = input.library;
    const currentLang = 'sv', indexViewMode = input.native ? 'native_system' : 'alpha', indexNameDisplayMode = 'auto';
    const herbSwedishDictionary = {}, t = key => key;
    const nodes = Object.create(null);
    const document = { getElementById(id) { return nodes[id] ||= { innerHTML: '', style: {}, querySelectorAll() { return []; } }; } };
    function persist() { throw new Error('Unexpected rendering write'); }
    ${functions}
    if (input.action === 'index') renderIndexPage();
    else if (input.action === 'search') handleGlobalSearch(input.value);
    else if (input.action === 'herb') renderHerbPage(input.value);
    else if (input.action === 'category') renderCategoryPage(input.value);
    JSON.stringify({ html: document.getElementById(input.action === 'search' ? 'global-search-dropdown' : 'wiki-app').innerHTML, library: db });
  `).runInContext(context, { timeout: 1000 }));
}
module.exports = { render };
