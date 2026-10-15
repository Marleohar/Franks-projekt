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
    'summarizeImportLibrary', 'downloadBackupFile', 'importBackupFile'].map(name =>
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
    let blobValue;
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
    function handleRouting() { routed++; trace.push({ action: 'route' }); }
    class Blob { constructor(parts) { this.text = parts.join(''); } }
    const URL = {
      createObjectURL(blob) { blobValue = blob.text; return 'synthetic:download'; },
      revokeObjectURL() {}
    };
    const document = { createElement() { return { click() {
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
    const normalDefaults = ensureDbStructure;
    ensureDbStructure = function() {
      normalDefaults();
      if (input.options.failDefaults) throw new Error('Synthetic defaults failure');
    };
    const file = { name: input.options.fileName || 'synthetic-backup.json', text: input.text };
    const target = { files: [file], value: 'synthetic-selected-file' };
    importBackupFile({ target });
    JSON.stringify({ db, persisted, persistCalls, routed, trace, alerts, prompts, downloads,
      uploadedText: file.text, inputValue: target.value,
      isolation: [typeof fetch, typeof firebase, typeof require, typeof process,
        typeof XMLHttpRequest, typeof WebSocket, typeof localStorage] });
  `, { filename: 'isolated-actual-import.js' });
  return JSON.parse(script.runInContext(context, { timeout: 1000 }));
}

module.exports = { runImport };
