'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { runImport } = require('./support/import-harness.cjs');
const { duplicateLibrary, emptyObjectLibrary } = require('./fixtures/legacy-libraries.cjs');

function currentLibrary() {
  const current = duplicateLibrary();
  current.objects = [{ id: 'synthetic-current', name: 'Current synthetic record', desc: 'Retain until confirmed' }];
  return current;
}
function unchanged(result, current) {
  assert.deepEqual(result.db, current);
  assert.equal(result.persistCalls, 0);
  assert.equal(result.persisted, null);
  assert.equal(result.routed, 0);
}

test('valid legacy backup uses replace semantics, preserving duplicates, IDs, long text and unknown fields', () => {
  const incoming = duplicateLibrary();
  const result = runImport(currentLibrary(), JSON.stringify(incoming));
  assert.deepEqual(result.db.objects, incoming.objects);
  assert.deepEqual(result.db.unknownLibraryField, incoming.unknownLibraryField);
  assert.equal(result.db.objects.some(o => o.id === 'synthetic-current'), false);
  assert.equal(result.persistCalls, 1);
  assert.deepEqual(result.persisted, result.db);
  assert.equal(result.routed, 1);
  assert.match(result.alerts[0], /Molnsparning är inte bekräftad/);
});

test('minimal legacy library with omitted optional collections remains accepted', () => {
  const result = runImport(currentLibrary(), JSON.stringify({ objects: [], unknown: { keep: 'synthetic' } }));
  assert.deepEqual(result.db.objects, []);
  assert.deepEqual(result.db.unknown, { keep: 'synthetic' });
  assert.equal(result.persistCalls, 1);
});

test('valid zero-object backup retains every populated collection and existing default additions', () => {
  const incoming = emptyObjectLibrary();
  const result = runImport(currentLibrary(), JSON.stringify(incoming));
  for (const key of Object.keys(incoming)) {
    if (key !== 'systems' && key !== 'systemOrder') assert.deepEqual(result.db[key], incoming[key]);
  }
  assert.deepEqual(result.db.systems['Synthetic System'], incoming.systems['Synthetic System']);
  assert.deepEqual(result.db.systemOrder, [...incoming.systemOrder, 'Ospecifierade kategorier']);
  assert.equal(result.persistCalls, 1);
});

test('malformed JSON rejects clearly without confirmation, replacement or writes', () => {
  const current = currentLibrary();
  const result = runImport(current, '{ not JSON');
  unchanged(result, current);
  assert.deepEqual(result.prompts, []);
  assert.match(result.alerts[0], /Ogiltig JSON/);
});

test('invalid top-level structures reject without writes', () => {
  const current = currentLibrary();
  for (const invalid of [null, [], 1, 'synthetic', {}, { objects: {} }, { objects: null }]) {
    const result = runImport(current, JSON.stringify(invalid));
    unchanged(result, current);
    assert.deepEqual(result.prompts, []);
    assert.match(result.alerts[0], /Ogiltigt bibliotek/);
  }
});

test('invalid known collection types and record entries reject without writes', () => {
  const current = currentLibrary();
  const invalidFields = [
    ...['objects', 'studyObjects', 'sources', 'trash'].flatMap(key => [[key, {}], [key, null], [key, [null]], [key, ['synthetic']]]),
    ...['categories', 'properties', 'systems', 'formulas'].flatMap(key => [[key, []], [key, null], [key, { invalid: null }], [key, { invalid: 1 }]]),
    ['systemOrder', {}], ['systemOrder', null], ['systemOrder', [1]],
  ];
  for (const [key, value] of invalidFields) {
    const result = runImport(current, JSON.stringify({ objects: [], [key]: value }));
    unchanged(result, current);
    assert.deepEqual(result.prompts, []);
    assert.match(result.alerts[0], /Ogiltigt bibliotek/);
  }
});

test('preview identifies replacement, filename, counts, collections, backup and synchronization warning', () => {
  const result = runImport(currentLibrary(), JSON.stringify(emptyObjectLibrary()), {
    fileName: '<synthetic & backup>.json', answers: [false, false]
  });
  const preview = result.prompts[1];
  for (const text of ['<synthetic & backup>.json', 'ERSÄTTER', 'slås inte ihop', 'Objekt nu: 1; i filen: 0',
    'kategorier: 1', 'egenskaper: 1', 'studieobjekt: 1', 'källor: 1', 'Osparade', 'osynkroniserade',
    'Spara säkerhetskopian', 'kan inte verifieras']) assert.ok(preview.includes(text), text);
});

test('cancelling final confirmation preserves state and performs no persistence', () => {
  const current = currentLibrary();
  const result = runImport(current, JSON.stringify(duplicateLibrary()), { answers: [false, false] });
  unchanged(result, current);
  assert.deepEqual(result.downloads, []);
});

test('both confirmation stages precede replacement and the original persist entry point', () => {
  const current = currentLibrary();
  const result = runImport(current, JSON.stringify(duplicateLibrary()));
  assert.deepEqual(result.trace.map(step => step.action), ['read', 'confirm', 'confirm', 'persist', 'route']);
  for (const step of result.trace.filter(step => step.action === 'confirm')) assert.deepEqual(step.db, current);
});

test('existing backup function exports current library before confirmation; upload is untouched', () => {
  const current = currentLibrary();
  const text = JSON.stringify(duplicateLibrary());
  const result = runImport(current, text, { answers: [true, false] });
  unchanged(result, current);
  assert.deepEqual(result.downloads, [current]);
  assert.deepEqual(result.trace.map(step => step.action), ['read', 'confirm', 'export', 'confirm']);
  assert.equal(result.uploadedText, text);
  assert.equal(result.inputValue, '');
});

test('export startup failure stops import without replacement or persistence', () => {
  const current = currentLibrary();
  const result = runImport(current, JSON.stringify(duplicateLibrary()), { answers: [true], failExport: true });
  unchanged(result, current);
  assert.match(result.alerts[0], /Exporten kunde inte startas/);
});

test('synchronous defaults failure restores previous in-memory state before persistence', () => {
  const current = currentLibrary();
  const result = runImport(current, JSON.stringify(duplicateLibrary()), { failDefaults: true });
  unchanged(result, current);
  assert.match(result.alerts[0], /återställts i minnet/);
});

test('synchronous persist failure restores memory without claiming storage rollback or cloud success', () => {
  const current = currentLibrary();
  const result = runImport(current, JSON.stringify(duplicateLibrary()), { failPersist: true });
  assert.deepEqual(result.db, current);
  assert.equal(result.persistCalls, 1);
  assert.equal(result.routed, 0);
  assert.match(result.alerts[0], /påbörjade sparningar kan inte garanteras återställda/);
});

test('file read errors and aborts leave library unchanged', () => {
  const current = currentLibrary();
  for (const options of [{ readError: true }, { readAbort: true }, { readThrow: true }]) {
    const result = runImport(current, JSON.stringify(duplicateLibrary()), options);
    unchanged(result, current);
    assert.deepEqual(result.prompts, []);
    assert.match(result.alerts[0], /inte ändrats/);
  }
});

test('isolation excludes production APIs, node access and real browser storage', () => {
  const result = runImport(currentLibrary(), JSON.stringify(duplicateLibrary()));
  assert.deepEqual(result.isolation, Array(7).fill('undefined'));
});
