'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');
const vm = require('node:vm');

const source = readFileSync(resolve(__dirname, '../../index.html'), 'utf8');
function extract(pattern, name) {
  const matches = [...source.matchAll(pattern)];
  assert.equal(matches.length, 1, `Review source extraction for ${name}`);
  return matches[0][0];
}
const declarations = [
  extract(/^let db = \{[\s\S]*?^\};/gm, 'db'),
  ...['deduplicateAndSanitizeDB', 'ensureDbStructure', 'validateImportLibrary',
    'summarizeImportLibrary', 'downloadBackupFile', 'importBackupFile',
    'getDisplayObjName', 'getPropKeys', 'hasProp', 'renderIndexPage',
    'handleRouting', 'renderCategoryPage'].map(name =>
    extract(new RegExp(`^function ${name}\\([^\\r\\n]*\\) \\{[\\s\\S]*?^\\}`, 'gm'), name)),
].join('\n');

function runImport(current, text, options = {}) {
  const context = vm.createContext(Object.create(null), {
    codeGeneration: { strings: false, wasm: false }, microtaskMode: 'afterEvaluate',
  });
  // Primitive JSON only; all fakes and callbacks are constructed inside the VM.
  context.inputJSON = JSON.stringify({ current, text, options });
  const script = new vm.Script(`
    const input = JSON.parse(inputJSON);
    const trace = [];
    const alerts = [];
    const prompts = [];
    const downloads = [];
    const answers = [...(input.options.answers || [false, true])];
    let persisted = null;
    let persistCalls = 0;
    let routed = 0;
    let routeFailure = null;
    let renderCalls = 0;
    let blobValue;
    const currentLang = 'sv';
    const indexViewMode = 'alpha';
    const indexNameDisplayMode = 'auto';
    const herbSwedishDictionary = {};
    const t = key => key;
    const app = { innerHTML: '' };
    const window = { location: { hash: input.options.route || '#index' }, scrollTo() {} };
    const confirm = message => {
      trace.push({ action: 'confirm', db: JSON.parse(JSON.stringify(db)) });
      prompts.push(message);
      if (!answers.length) throw new Error('Unexpected confirmation');
      return answers.shift();
    };
    const alert = message => alerts.push(message);
    function persist() {
      trace.push({ action: 'persist' });
      persistCalls++;
      if (input.options.failPersist) throw new Error('Synthetic persistence failure');
      persisted = JSON.parse(JSON.stringify(db));
    }
    class Blob { constructor(parts) { this.text = parts.join(''); } }
    const URL = {
      createObjectURL(blob) { blobValue = blob.text; return 'synthetic:download'; },
      revokeObjectURL() {}
    };
    const document = { getElementById() { return app; }, createElement() { return { click() {
      trace.push({ action: 'export' });
      if (input.options.failExport) throw new Error('Synthetic export failure');
      downloads.push(JSON.parse(blobValue));
    } }; } };
    class FileReader {
      readAsText(file) {
        trace.push({ action: 'read' });
        if (input.options.readThrow) throw new Error('Synthetic synchronous read failure');
        if (input.options.readError) return this.onerror();
        if (input.options.readAbort) return this.onabort();
        this.onload({ target: { result: file.text } });
      }
    }
    ${declarations}
    db = input.current;
    // Instrument calls while retaining the real router's dispatch/catch behavior.
    const actualRouting = handleRouting;
    handleRouting = function(mode) {
      routed++;
      trace.push({ action: 'route' });
      return actualRouting(mode);
    };
    const actualIndex = renderIndexPage;
    renderIndexPage = function() {
      renderCalls++;
      if (input.options.failRender && renderCalls === 1) throw new Error('Synthetic render failure');
      return actualIndex();
    };
    const normalDefaults = ensureDbStructure;
    ensureDbStructure = function() {
      normalDefaults();
      if (input.options.failDefaults) throw new Error('Synthetic defaults failure');
    };
    const file = { name: input.options.fileName || 'synthetic-backup.json', text: input.text };
    const target = { files: [file], value: 'synthetic-selected-file' };
    if (input.options.navigationOnly || input.options.directCategory) {
      try {
        if (input.options.directCategory) renderCategoryPage('C');
        else if (input.options.navigationArgument === 'event') handleRouting({ type: 'hashchange', isTrusted: true });
        else if (input.options.navigationArgument === 'dom-event') handleRouting({ type: 'DOMContentLoaded', propagateErrors: true });
        else if (input.options.navigationArgument === 'truthy') handleRouting('true');
        else handleRouting(input.options.navigationArgument === 'strict' ? true : undefined);
      } catch (error) { routeFailure = { name: error.name, message: error.message }; }
    } else importBackupFile({ target });
    JSON.stringify({ db, persisted, persistCalls, routed, trace, alerts, prompts, downloads,
      uploadedText: file.text, inputValue: target.value, renderedHTML: app.innerHTML, routeFailure,
      isolation: [typeof fetch, typeof firebase, typeof require, typeof process,
        typeof XMLHttpRequest, typeof WebSocket, typeof localStorage] });
  `, { filename: 'isolated-actual-import.js' });
  return JSON.parse(script.runInContext(context, { timeout: 1000 }));
}

module.exports = { runImport };
