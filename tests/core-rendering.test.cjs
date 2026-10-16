'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./support/rendering-harness.cjs');
const { renderingLibrary } = require('./fixtures/rendering-library.cjs');

for (const surface of ['index', 'search', 'herb', 'category']) {
  test(`${surface}: actual renderer encodes adversarial text without changing records`, () => {
    const fixture = renderingLibrary();
    const value = surface === 'search' ? 'sök' : surface === 'herb' ? fixture.id : fixture.category;
    const result = render(fixture.library, surface, value);
    assert.deepEqual(result.library, fixture.library);
    assert.doesNotMatch(result.html, /<svg|<script|data-injected="yes|autofocus onfocus="window/);
    assert.match(result.html, /&lt;svg/);
    assert.match(result.html, /Åäö|Åäö|å/);
    if (surface === 'herb' || surface === 'category') {
      assert.match(result.html, /&lt;script&gt;window\.__payloads\+\+&lt;\/script&gt;/);
      assert.ok(result.html.includes('🐉'));
    }
    if (surface !== 'search') assert.ok(result.html.includes(`#herb/${encodeURIComponent(fixture.id)}`) || surface === 'herb');
    if (surface === 'search' || surface === 'herb' || surface === 'category') {
      assert.doesNotMatch(result.html, /onclick="[^"]*window\.__payloads/);
      assert.match(result.html, /data-core-action=/);
    }
  });
}

test('native-system index safely renders system names and object links', () => {
  const fixture = renderingLibrary();
  const result = render(fixture.library, 'index', '', true);
  assert.doesNotMatch(result.html, /<svg/);
  assert.match(result.html, /&lt;svg/);
  assert.ok(result.html.includes(encodeURIComponent(fixture.id)));
  assert.deepEqual(result.library, fixture.library);
});

test('ordinary legacy text and Unicode remain readable', () => {
  const library = { objects: [{ id: 'ordinary', name: 'Ålandsrot 🐉', desc: 'Lång beskrivning '.repeat(40), props: {} }],
    categories: {}, properties: {}, systems: {}, systemOrder: [] };
  const result = render(library, 'herb', 'ordinary');
  assert.ok(result.html.includes(library.objects[0].name));
  assert.ok(result.html.includes(library.objects[0].desc));
  assert.deepEqual(result.library, library);
});

test('actual object route resolver supports encoded IDs and legacy raw percent bookmarks', () => {
  const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
  const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  const fn = source.match(/^function resolveHerbRouteId\(id\) \{[\s\S]*?^\}/m)[0];
  const fixture = renderingLibrary();
  const objects = [{ id: fixture.id }, { id: 'legacy%id' }, { id: 'legacy%20literal' }];
  for (const [route, expected] of [[encodeURIComponent(fixture.id), fixture.id], ['legacy%id', 'legacy%id'], ['legacy%20literal', 'legacy%20literal']]) {
    const context = vm.createContext(Object.create(null), { codeGeneration: { strings: false, wasm: false } });
    context.inputJSON = JSON.stringify({ objects, route });
    assert.equal(new vm.Script(`const input=JSON.parse(inputJSON),db={objects:input.objects}; ${fn}\nresolveHerbRouteId(input.route)`).runInContext(context, { timeout: 1000 }), expected);
  }
});
