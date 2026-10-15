'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { createHarness } = require('./support/legacy-harness.cjs');
const { duplicateLibrary, emptyObjectLibrary, firstDescription, secondDescription } = require('./fixtures/legacy-libraries.cjs');

test('preservation: retain both IDs and original names even when normalized names match', () => {
  const fixture = duplicateLibrary();
  const result = createHarness().deduplicate(fixture);
  assert.deepEqual(result.objects.map(object => object.id), ['synthetic-first', 'synthetic-second']);
  assert.deepEqual(result.objects.map(object => object.name), ['  Sample Leaf ', 'sample LEAF']);
  assert.deepEqual(result, fixture);
});

test('preservation: retain all descriptions, metadata, and unknown fields without truncation', () => {
  assert.ok(firstDescription.length > 280);
  assert.ok(secondDescription.length > 280);
  const fixture = duplicateLibrary();
  assert.deepEqual(createHarness().deduplicate(fixture), fixture);
  const { db } = createHarness().recover(fixture);
  assert.deepEqual(db.objects, fixture.objects);
  assert.deepEqual(db.unknownLibraryField, fixture.unknownLibraryField);
});

test('preservation: never turn false properties into true during recovery', () => {
  const fixture = duplicateLibrary();
  for (const result of [createHarness().deduplicate(fixture), createHarness().recover(fixture).db]) {
    assert.deepEqual(result.objects[0].props, { shared: false });
    assert.deepEqual(result.objects[1].props, { shared: false, secondOnly: false });
  }
});

test('preservation: recover populated collections when objects is empty', () => {
  const fixture = emptyObjectLibrary();
  const { db, storageReads } = createHarness().recover(fixture);
  assert.deepEqual(storageReads, ['taxonomy_ide_master_db']);
  for (const key of Object.keys(fixture)) {
    if (key === 'systems' || key === 'systemOrder') continue;
    assert.deepEqual(db[key], fixture[key], `${key} must survive intact`);
  }
  for (const [name, system] of Object.entries(fixture.systems)) {
    assert.deepEqual(db.systems[name], system);
  }
  // Existing ensureDbStructure behavior appends its fallback system; unchanged.
  assert.deepEqual(db.systemOrder, [...fixture.systemOrder, 'Ospecifierade kategorier']);
  assert.deepEqual(db.systems['Ospecifierade kategorier'], {
    desc: 'Kategorier som saknar skola.', categories: []
  });
});

test('preservation: repeated recovery never progressively changes or removes records', () => {
  for (const fixture of [duplicateLibrary(), emptyObjectLibrary()]) {
    const harness = createHarness();
    const first = harness.recover(fixture).db;
    let recovered = first;
    for (let iteration = 0; iteration < 5; iteration++) {
      recovered = harness.recover(recovered).db;
      assert.deepEqual(recovered, first);
    }
  }
});

test('control: distinct normalized names retain long text and unknown fields', () => {
  const fixture = duplicateLibrary();
  fixture.objects[1].name = 'Different Synthetic Leaf';
  const { db } = createHarness().recover(fixture);
  assert.deepEqual(db.objects, fixture.objects);
  assert.deepEqual(db.unknownLibraryField, fixture.unknownLibraryField);
});

test('preservation: identical names also remain separate records', () => {
  const fixture = duplicateLibrary();
  fixture.objects[1].name = fixture.objects[0].name;
  assert.deepEqual(createHarness().recover(fixture).db.objects, fixture.objects);
});

test('control: malformed non-array objects do not replace valid recovered state', () => {
  const harness = createHarness();
  const first = harness.recover(duplicateLibrary()).db;
  assert.deepEqual(harness.recover({ objects: {}, unknownLibraryField: 'invalid' }).db, first);
});

test('isolation: extracted code has no service APIs or writable browser storage', () => {
  const isolation = createHarness().isolation();
  assert.deepEqual(isolation.unavailable, Array(9).fill('undefined'));
  assert.deepEqual(isolation.storageMethods, ['getItem']);
  assert.equal(isolation.dynamicCodeBlocked, true);
});
