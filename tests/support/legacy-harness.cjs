'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

// Read as text only: never execute the HTML, SDK tags, configuration, or startup.
const source = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
function extract(pattern, label) {
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Expected exactly one legacy ${label}; review extraction after source changes`);
  return matches[0][0];
}
const declarations = [
  extract(/^const MASTER_STORAGE_KEY = "[^"\r\n]+";/gm, 'storage key'),
  extract(/^let db = \{[\s\S]*?^\};/gm, 'initial state'),
  ...['deduplicateAndSanitizeDB', 'loadAndRecoverAllData', 'ensureDbStructure'].map(name =>
    extract(new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`, 'gm'), name)),
].join('\n');

function createHarness() {
  // Only primitive strings cross into the context. No host functions/objects,
  // require, process, browser globals, Firebase, timers, or network APIs enter it.
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false },
    microtaskMode: 'afterEvaluate',
  });
  const run = code => new vm.Script(code, { filename: 'extracted-legacy-recovery.js' })
    .runInContext(context, { timeout: 1000 });
  run(`
    let storedValue = null;
    const storageReads = [];
    const localStorage = Object.freeze({
      getItem(key) { storageReads.push(key); return storedValue; }
    });
    ${declarations}
  `);
  return {
    deduplicate(library) {
      context.fixtureJSON = JSON.stringify(library);
      return JSON.parse(run('JSON.stringify(deduplicateAndSanitizeDB(JSON.parse(fixtureJSON)))'));
    },
    recover(library) {
      context.fixtureJSON = JSON.stringify(library);
      return JSON.parse(run(`
        storedValue = fixtureJSON;
        loadAndRecoverAllData();
        JSON.stringify({ db, storageReads });
      `));
    },
    isolation() {
      return JSON.parse(run(`JSON.stringify({
        unavailable: [typeof require, typeof process, typeof fetch,
          typeof XMLHttpRequest, typeof WebSocket, typeof firebase,
          typeof document, typeof window, typeof setTimeout],
        storageMethods: Object.keys(localStorage),
        dynamicCodeBlocked: (() => {
          try { Function('return 1')(); return false; }
          catch (error) { return error.name === 'EvalError'; }
        })()
      })`));
    },
  };
}

module.exports = { createHarness };
