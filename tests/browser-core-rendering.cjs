'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { renderingLibrary } = require('./fixtures/rendering-library.cjs');

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
    const page = await context.newPage();
    const errors = [], dialogs = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message(), value: dialog.defaultValue() });
      await dialog.dismiss(); // Editing/deletion tests cancel, never change records.
    });
    await page.goto(origin);
    const fixture = renderingLibrary();
    await page.evaluate(library => {
      window.__payloads = 0;
      db = library;
      window.beforeLibrary = JSON.stringify(db);
      renderIndexPage();
    }, fixture.library);
    async function safe(root = '#wiki-app') {
      const state = await page.locator(root).evaluate(element => ({
        elements: element.querySelectorAll('svg,script,img,iframe,object,embed,[data-injected]').length,
        badAttributes: [...element.querySelectorAll('*')].flatMap(node => [...node.attributes])
          .filter(attribute => /^on/i.test(attribute.name) && attribute.value.includes('__payloads')).map(attribute => attribute.name)
      }));
      assert.equal(state.elements, 0);
      assert.deepEqual(state.badAttributes, []);
      assert.equal(await page.evaluate(() => window.__payloads), 0);
      assert.equal(await page.evaluate(() => JSON.stringify(db) === window.beforeLibrary), true);
    }
    await safe();
    assert.equal(await page.locator('#wiki-app a.wiki-link').first().textContent(), fixture.library.objects[0].name);
    // Link must survive slashes, quotes, percent signs, Unicode and JS-like IDs.
    await page.locator('#wiki-app a.wiki-link').first().click();
    await page.waitForURL(`**/#herb/${encodeURIComponent(fixture.id)}`);
    await page.waitForFunction(name => document.querySelector('h1.wiki-title > span')?.textContent === name, fixture.library.objects[0].name);
    assert.equal(await page.locator('h1.wiki-title > span').textContent(), fixture.library.objects[0].name);
    assert.ok((await page.locator('#wiki-app').textContent()).includes(fixture.long));
    await safe();
    await page.locator('[data-core-action="renameHerb"]').click();
    assert.equal(dialogs.at(-1).value, fixture.library.objects[0].name);
    await page.locator('[data-core-action="delete"]').click();
    assert.equal(dialogs.at(-1).type, 'confirm');
    await page.locator('[data-core-action="botanical"]').click();
    assert.equal(dialogs.at(-1).value, fixture.library.objects[0].taxonomies['Botanical Name']);
    await page.locator('[data-core-action="editor"]').click();
    assert.equal(await page.locator('#popup-editor-input').inputValue(), fixture.long);
    assert.equal(await page.evaluate(() => editorTargetId), fixture.id);
    await page.evaluate(() => closePopup());
    await page.locator('[data-core-action="assign"]').click();
    assert.equal(await page.locator('#assign-props-checklist span').textContent(), fixture.property);
    await safe('#assign-props-checklist');
    await page.evaluate(() => closePopup());
    // Navigate via the category label; related property page is out of scope.
    await page.locator('a.wiki-row-label').click();
    await page.waitForURL(`**/#category/${encodeURIComponent(fixture.category)}`);
    await page.waitForFunction(name => document.querySelector('h1.wiki-title > span')?.textContent === name, fixture.category);
    assert.equal(await page.locator('h1.wiki-title > span').textContent(), fixture.category);
    assert.ok((await page.locator('#wiki-app').textContent()).includes(fixture.long));
    await safe();
    await page.locator('[data-core-action="renameCategory"]').click();
    assert.equal(dialogs.at(-1).value, fixture.category);
    await page.locator('[data-core-action="delete"]').click();
    assert.equal(dialogs.at(-1).type, 'confirm');
    await page.locator('[data-core-action="editor"]').click();
    assert.equal(await page.locator('#popup-editor-input').inputValue(), fixture.long);
    assert.equal(await page.evaluate(() => editorTargetId), fixture.category);
    await page.evaluate(() => closePopup());
    await page.locator('[data-core-action="createProperty"]').click();
    assert.equal(dialogs.at(-1).type, 'prompt');
    await safe();
    // Verify safe property href without entering the still-unprotected page.
    const propertyLink = page.locator(`a[href="#property/${encodeURIComponent(fixture.property)}"]`).first();
    assert.equal(await propertyLink.count(), 1);
    // Search actual header input and click safe object/category results.
    await page.evaluate(() => openHeaderSearch());
    await page.locator('#global-search-input').fill('sök');
    await safe('#global-search-dropdown');
    const titles = await page.locator('#global-search-dropdown b').allTextContents();
    assert.ok(titles.includes(fixture.library.objects[0].name));
    assert.ok(titles.includes(fixture.category));
    await page.locator('#global-search-dropdown .suggest-item').nth(0).click();
    await page.waitForURL(`**/#herb/${encodeURIComponent(fixture.id)}`);
    await safe();
    await page.evaluate(() => openHeaderSearch());
    await page.locator('#global-search-input').fill('sök');
    await page.locator('#global-search-dropdown .suggest-item').nth(2).click();
    await page.waitForURL(`**/#category/${encodeURIComponent(fixture.category)}`);
    await safe();
    await page.evaluate(() => { window.location.hash = '#index'; handleRouting(); });
    await page.locator('select').nth(0).selectOption('native_system');
    await safe();
    assert.ok((await page.locator('#wiki-app').textContent()).includes(fixture.system));
    await page.locator('select').nth(0).selectOption('alpha');
    await safe();
    const ordinary = { objects: [{ id: 'ordinary', name: 'Ålandsrot 🐉', desc: 'Lång beskrivning '.repeat(40), props: {} }],
      categories: {}, properties: {}, systems: {}, systemOrder: [] };
    await page.evaluate(library => {
      db = library; window.beforeLibrary = JSON.stringify(db); renderIndexPage();
    }, ordinary);
    assert.equal(await page.locator('#wiki-app a.wiki-link').first().textContent(), ordinary.objects[0].name);
    await page.locator('#wiki-app a.wiki-link').first().click();
    await page.waitForURL('**/#herb/ordinary');
    await page.waitForFunction(() => document.querySelector('h1.wiki-title > span')?.textContent === 'Ålandsrot 🐉');
    assert.ok((await page.locator('#wiki-app').textContent()).includes(ordinary.objects[0].desc));
    await safe();
    assert.deepEqual(await page.evaluate(() => ({ firebase: typeof firebase, cloud: firestoreDb, ready: isCloudReady })),
      { firebase: 'undefined', cloud: null, ready: false });
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    await page.screenshot({ path: path.join(tempDir, 'safe-core-rendering.png'), fullPage: true });
    console.log(JSON.stringify({ status: 'PASS', browser: await browser.version(), payloadExecutions: await page.evaluate(() => window.__payloads),
      surfaces: ['index (both views)', 'global search', 'object detail', 'category detail', 'property assignment checklist'],
      controls: ['object/category navigation', 'search selection', 'rename cancellation', 'delete cancellation', 'description editor', 'botanical editor', 'property assignment', 'create-property cancellation', 'view selectors'],
      storedDataUnchanged: true, errors, externalRequests, disposableCopy: tempDir }, null, 2));
    await context.close();
  } finally { if (browser) await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
