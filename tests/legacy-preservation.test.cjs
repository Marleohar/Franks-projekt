'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./support/legacy-harness.cjs');
const { duplicateLibrary, emptyObjectLibrary, firstDescription, secondDescription } = require('./fixtures/legacy-libraries.cjs');

test('characterization: normalized duplicate names discard the second ID', () => {
  const fixture = duplicateLibrary();
  assert.equal(fixture.objects.length, 2);
  const result = createHarness().deduplicate(fixture);
  assert.equal(result.objects.length, 1);
  assert.deepEqual(result.objects.map(object => object.id), ['synthetic-first']);
  assert.equal(result.objects[0].name, '  Sample Leaf ');
});

test('characterization: duplicate description and metadata disappear; taxonomy merges selectively', () => {
  assert.ok(firstDescription.length > 280);
  assert.ok(secondDescription.length > 280);
  const result = createHarness().deduplicate(duplicateLibrary());
  const survivor = result.objects[0];
  assert.equal(survivor.desc, firstDescription);
  assert.notEqual(survivor.desc, secondDescription);
  assert.deepEqual(survivor.nativeSystems, ['system-first']);
  assert.deepEqual(survivor.unknownObjectField, { origin: 'first' });
  assert.equal(Object.hasOwn(survivor, 'secondOnlyMetadata'), false);
  assert.deepEqual(survivor.taxonomies, { language: 'first', extra: 'retained taxonomy' });
  assert.deepEqual(result.unknownLibraryField, duplicateLibrary().unknownLibraryField);
});

test('characterization: false properties from duplicate records become true', () => {
  const fixture = duplicateLibrary();
  assert.equal(fixture.objects[0].props.shared, false);
  assert.equal(fixture.objects[1].props.shared, false);
  assert.equal(fixture.objects[1].props.secondOnly, false);
  const survivor = createHarness().deduplicate(fixture).objects[0];
  assert.deepEqual(survivor.props, { shared: true, secondOnly: true });
});

test('characterization: actual local recovery also invokes destructive deduplication', () => {
  const { db, storageReads } = createHarness().recover(duplicateLibrary());
  assert.deepEqual(storageReads, ['taxonomy_ide_master_db']);
  assert.equal(db.objects.length, 1);
  assert.equal(db.objects[0].id, 'synthetic-first');
  assert.equal(db.objects[0].props.shared, true);
});

test('characterization: zero-object local library ignores every populated collection', () => {
  const fixture = emptyObjectLibrary();
  const { db, storageReads } = createHarness().recover(fixture);
  assert.deepEqual(storageReads, ['taxonomy_ide_master_db']);
  assert.deepEqual(db.objects, []);
  for (const key of ['categories', 'properties', 'studyObjects', 'sources', 'formulas', 'trash']) {
    assert.ok(Object.keys(fixture[key]).length > 0, `${key} fixture must be populated`);
    assert.deepEqual(db[key], Array.isArray(fixture[key]) ? [] : {}, `${key} was not recovered`);
  }
  assert.equal(Object.hasOwn(db.systems, 'Synthetic System'), false);
  assert.deepEqual(db.systemOrder, ['Ospecifierade kategorier']);
  assert.equal(Object.hasOwn(db, 'unknownLibraryField'), false);
  // The recovery function reads storage but does not write the stored snapshot.
});

test('control: distinct normalized names retain long text and unknown fields', () => {
  const fixture = duplicateLibrary();
  fixture.objects[1].name = 'Different Synthetic Leaf';
  const { db } = createHarness().recover(fixture);
  assert.deepEqual(db.objects, fixture.objects);
  assert.deepEqual(db.unknownLibraryField, fixture.unknownLibraryField);
});

test('isolation: extracted code has no service APIs or writable browser storage', () => {
  const isolation = createHarness().isolation();
  assert.deepEqual(isolation.unavailable, Array(9).fill('undefined'));
  assert.deepEqual(isolation.storageMethods, ['getItem']);
  assert.equal(isolation.dynamicCodeBlocked, true);
});

// Acceptance cases for later fixes. Passing characterization is NOT preservation.
test.todo('preservation: retain both IDs even when normalized names match');
test.todo('preservation: retain all descriptions, metadata, and unknown fields without truncation');
test.todo('preservation: never turn false properties into true during recovery');
test.todo('preservation: recover populated collections when objects is empty');
