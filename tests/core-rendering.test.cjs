'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { render } = require('./support/rendering-harness.cjs');
const { renderingLibrary } = require('./fixtures/rendering-library.cjs');
const { identityLibrary } = require('./fixtures/identity-library.cjs');

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
    if (surface !== 'search') assert.ok(result.html.includes(`#herb-id/${encodeURIComponent(fixture.id)}`) || surface === 'herb');
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

test('actual router distinguishes literal legacy IDs and canonical decode-once IDs', () => {
  const library = identityLibrary();
  const cases = [
    ['#herb/item%20name', 'Literal percent record'],
    ['#herb-id/item%20name', 'Space record'],
    ['#herb-id/item%2520name', 'Literal percent record'],
    ['#herb-id/item%252520name', 'Double encoded literal record'],
    ['#herb/%bad', 'Raw malformed percent record'],
    [`#herb-id/${encodeURIComponent(library.objects[3].id)}`, 'Special character record'],
  ];
  for (const [route, name] of cases) {
    const result = render(library, 'route', route);
    assert.ok(result.html.includes(`<span>${name}</span>`), route);
    assert.deepEqual(result.library, library);
  }
});

test('actual property renderer keeps raw legacy links resolving to original objects', () => {
  const library = identityLibrary();
  const result = render(library, 'property', 'P');
  const link = result.html.match(/href="([^"]+)"[^>]*>Literal percent record<\/a>/);
  assert.equal(link[1], '#herb/item%20name');
  const destination = render(library, 'route', link[1]);
  assert.ok(destination.html.includes('<span>Literal percent record</span>'));
  assert.deepEqual(destination.library, library);
});

test('protected index/category links and search generate canonical IDs without guessing', () => {
  const library = identityLibrary();
  for (const [surface, value, native] of [['index', '', false], ['index', '', true], ['category', 'C', false]]) {
    const result = render(library, surface, value, native);
    for (const object of library.objects.slice(0, 4)) {
      const route = `#herb-id/${encodeURIComponent(object.id)}`;
      assert.ok(result.html.includes(`href="${route}"`), `${surface}: ${route}`);
      assert.ok(render(library, 'route', route).html.includes(`<span>${object.name}</span>`));
    }
    assert.deepEqual(result.library, library);
  }
  const search = render(library, 'search', 'record');
  assert.ok(search.html.includes('#herb-id/item%2520name'));
  assert.ok(search.html.includes('#herb-id/item%20name'));
  assert.deepEqual(search.library, library);
});

test('missing, malformed and extra canonical components never guess an existing ID', () => {
  const library = identityLibrary();
  for (const route of ['#herb-id', '#herb-id/', '#herb-id/%bad', '#herb-id/item%20name/extra', '#herb-id/%E0%A4%A']) {
    const result = render(library, 'route', route);
    assert.match(result.html, /<span>indexTitle<\/span>/, route);
    assert.deepEqual(result.library, library);
  }
  const result = render(library, 'route', '#herb-id/not-an-object');
  assert.match(result.html, /<h2>noDesc<\/h2>/);
  assert.deepEqual(result.library, library);
});
