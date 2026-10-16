'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { propertyLibrary } = require('./fixtures/property-library.cjs');

async function main() {
  let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.equal((html.match(/const firebaseConfig = \{[\s\S]*?\};/g) || []).length, 1);
  html = html.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/const firebaseConfig = \{[\s\S]*?\};/, 'const firebaseConfig = {};')
    .replace(/try \{\s*firebase\.initializeApp\(firebaseConfig\);\s*firestoreDb = firebase\.firestore\(\);\s*\} catch\(e\) \{\}/,
      '// Firebase disabled before disposable security QA startup.');
  assert.equal(html.includes('firebase.initializeApp('), false);
  assert.equal(/<script\b[^>]*\bsrc=/i.test(html), false);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'franks-rendering-browser-'));
  fs.writeFileSync(path.join(tempDir, 'index.html'), html);
  const origin = 'http://127.0.0.1:8765';
  let browser;
  try {
    browser = await chromium.launch({ headless: true,
      executablePath: process.env.QA_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
      proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' },
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    const context = await browser.newContext({ serviceWorkers: 'block' });
    const externalRequests = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.fulfill({
        status: 200, contentType: 'text/html; charset=utf-8', body: html,
        // Inline script/event execution is permitted, so encoding defects cannot
        // pass merely because CSP blocked the adversarial event handlers.
        headers: { 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'" }
      });
      externalRequests.push(route.request().url());
      return route.abort();
    });
    await context.addInitScript(() => {
      window.qaWrites = [];
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) { window.qaWrites.push(key); return original.call(this, key, value); };
    });
    const page = await context.newPage();
    const errors = [], dialogs = [];
    let answers = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message(), value: dialog.defaultValue() });
      if (answers.length) {
        const answer = answers.shift();
        if (answer === false) await dialog.dismiss(); else await dialog.accept(String(answer));
      } else await dialog.dismiss();
    });
    await page.goto(origin);
    const fixture = propertyLibrary();
    const before = JSON.stringify(fixture.library);
    await page.evaluate(() => {
      window.__payloads = 0;
      window.qaPersistCalls = 0;
      const originalPersist = persist;
      persist = function() { window.qaPersistCalls++; return originalPersist(); };
    });
    async function reset() {
      await page.evaluate(data => {
        db = data.library;
        window.location.hash = '#property/' + encodeURIComponent(data.property);
        handleRouting(true);
        window.qaPersistCalls = 0;
        window.qaWrites = [];
      }, fixture);
      await page.waitForFunction(name => document.querySelector('h1.wiki-title > span')?.textContent === name, fixture.property);
    }
    async function safe(expectedIcons = 1) {
      const state = await page.locator('#wiki-app').evaluate(element => ({
        injected: element.querySelectorAll('script,img,iframe,object,embed,[data-payload]').length,
        icons: element.querySelectorAll('svg[viewBox="0 0 24 24"] > path').length,
        svg: element.querySelectorAll('svg').length,
        handlers: [...element.querySelectorAll('*')].flatMap(node => [...node.attributes]).filter(attribute => /^on/i.test(attribute.name)).length
      }));
      assert.equal(state.injected, 0); assert.equal(state.svg, expectedIcons); assert.equal(state.icons, expectedIcons); assert.equal(state.handlers, 0);
      assert.equal(await page.evaluate(() => window.__payloads), 0);
    }
    async function unchanged() {
      assert.equal(await page.evaluate(() => JSON.stringify(db)), before);
      assert.equal(await page.evaluate(() => window.qaPersistCalls), 0);
      assert.equal(await page.evaluate(() => window.qaWrites.length), 0);
    }
    await reset();
    await safe();
    const text = await page.locator('#wiki-app').textContent();
    for (const value of [fixture.property, fixture.category, fixture.system, fixture.related, fixture.description,
      fixture.library.studyObjects[0].name, fixture.library.studyObjects[0].type,
      fixture.library.sources[0].author, fixture.library.sources[0].year, fixture.library.sources[0].title, fixture.pages]) assert.ok(text.includes(value));
    await unchanged();
    for (const action of ['renameProperty', 'delete', 'propertySummary', 'connectHerb', 'relatedProperty', 'addPropertySource']) {
      await page.locator(`[data-core-action="${action}"]`).click();
      await unchanged();
    }
    assert.ok(dialogs.some(dialog => dialog.value === fixture.property));
    assert.ok(dialogs.some(dialog => dialog.value === fixture.library.properties[fixture.property].summary));
    await page.locator('[data-core-action="editor"]').click();
    assert.equal(await page.evaluate(() => editorTargetId), fixture.property);
    assert.equal(await page.locator('#popup-editor-input').inputValue(), fixture.description);
    await page.evaluate(() => closePopup());
    await unchanged();
    const expectedSourceArgs = [fixture.property, fixture.sourceId, fixture.pages];
    assert.deepEqual(JSON.parse(await page.locator('[data-core-action="propertySource"]').getAttribute('data-core-args')), expectedSourceArgs);
    await page.locator('[data-core-action="propertySource"] svg').click();
    assert.equal(await page.evaluate(() => activeEditSourcePropName), fixture.property);
    assert.equal(await page.evaluate(() => activeEditSourceId), fixture.sourceId);
    assert.ok((await page.locator('#edit-source-title-display').innerText()).includes(fixture.library.sources[0].title));
    assert.equal(await page.locator('#edit-source-pages-input').inputValue(), fixture.pages);
    assert.equal(await page.locator('#popup-edit-prop-source [data-payload]').count(), 0);
    await page.locator('#popup-edit-prop-source').getByRole('button', { name: 'Avbryt', exact: true }).click();
    await unchanged();
    // Both simultaneous collision IDs are linked canonically and reach correct controls.
    for (const object of fixture.library.objects.slice(0, 2)) {
      const link = page.locator(`a[href="#herb-id/${encodeURIComponent(object.id)}"]`);
      assert.equal(await link.count(), 1);
      await link.click();
      await page.waitForFunction(name => document.querySelector('h1.wiki-title > span')?.textContent === name, object.name);
      await page.locator('[data-core-action="editor"]').click();
      assert.equal(await page.evaluate(() => editorTargetId), object.id);
      await page.evaluate(() => closePopup());
      assert.deepEqual(JSON.parse(await page.locator('[data-core-action="delete"]').getAttribute('data-core-args')), ['object', object.id]);
      await page.locator('[data-core-action="delete"]').click();
      await unchanged();
      await reset();
    }
    await page.locator(`a[href="#property/${encodeURIComponent(fixture.related)}"]`).click();
    await page.waitForFunction(name => document.querySelector('h1.wiki-title > span')?.textContent === name, fixture.related);
    await unchanged();
    await reset();
    await page.locator(`a[href="#category/${encodeURIComponent(fixture.category)}"]`).first().click();
    await page.waitForFunction(name => document.querySelector('h1.wiki-title > span')?.textContent === name, fixture.category);
    await unchanged();
    await reset();
    // Successful modal page update: only the selected tag's pages should change.
    await page.locator('[data-core-action="propertySource"] svg').click();
    const newPages = `Updated pages ${fixture.text}`;
    await page.locator('#edit-source-pages-input').fill(newPages);
    await page.locator('#popup-edit-prop-source').getByRole('button', { name: 'Spara', exact: true }).click();
    const expected = structuredClone(fixture.library); expected.sources[0].tags[0].pages = newPages;
    assert.deepEqual(await page.evaluate(() => db), expected);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 1);
    assert.equal(await page.evaluate(() => window.qaWrites.length), 1);
    await safe();
    await reset();
    await page.locator('[data-core-action="propertySource"] svg').click();
    await page.locator('#popup-edit-prop-source').getByRole('button', { name: 'Ta bort koppling', exact: true }).click();
    const removed = structuredClone(fixture.library); removed.sources[0].tags.shift();
    assert.deepEqual(await page.evaluate(() => db), removed);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 1);
    await safe(0);
    // Existing add-source prompt selects a source by title and preserves source identity.
    await reset();
    answers = [fixture.library.sources[0].title, 'Synthetic selected-source pages'];
    await page.locator('[data-core-action="addPropertySource"]').click();
    const added = structuredClone(fixture.library);
    added.sources[0].tags.push({ type: 'property', id: fixture.property, pages: 'Synthetic selected-source pages' });
    assert.deepEqual(await page.evaluate(() => db), added);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 1);
    assert.equal(answers.length, 0);
    await safe();
    // Existing two-way linking and herb connection are exercised against exact copies.
    await reset();
    await page.evaluate(data => { db.properties[data.property].related = []; db.properties[data.related].related = []; }, fixture);
    answers = ['1'];
    await page.locator('[data-core-action="relatedProperty"]').click();
    assert.deepEqual(await page.evaluate(() => db), fixture.library);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 1);
    await safe();
    await reset();
    answers = ['3'];
    await page.locator('[data-core-action="connectHerb"]').click();
    const connected = structuredClone(fixture.library); connected.objects[2].props[fixture.property] = true;
    assert.deepEqual(await page.evaluate(() => db), connected);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 1);
    await safe();
    await reset();
    await safe(); await unchanged();
    assert.deepEqual(await page.evaluate(() => ({ firebase: typeof firebase, cloud: firestoreDb, ready: isCloudReady })), { firebase: 'undefined', cloud: null, ready: false });
    assert.deepEqual(errors, []); assert.deepEqual(externalRequests, []);
    await page.screenshot({ path: path.join(tempDir, 'safe-property-rendering.png'), fullPage: true });
    console.log(JSON.stringify({ status: 'PASS', browser: await browser.version(), payloadExecutions: await page.evaluate(() => window.__payloads),
      trustedIcons: 1, unexpectedWrites: 0, cancelledActionsUnchanged: true,
      operations: ['all property actions cancelled safely', 'trusted icon opens source modal', 'source pages save', 'source association removal', 'existing source selection', 'two-way related property linking', 'herb connection', 'canonical collision links', 'related/category navigation'],
      errors, externalRequests, disposableCopy: tempDir }, null, 2));
    await context.close();
  } finally { if (browser) await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
