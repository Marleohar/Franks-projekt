'use strict';

// Optional local QA tool; Playwright is supplied by the environment, not installed
// as a production dependency. Never navigate this script to the deployed site.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const { duplicateLibrary } = require('./fixtures/legacy-libraries.cjs');
const { previousCategoryLibrary, categoryFailureLibrary } = require('./fixtures/routing-libraries.cjs');

async function main() {
  let html = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
  assert.equal((html.match(/const firebaseConfig = \{[\s\S]*?\};/g) || []).length, 1);
  html = html.replace(/<script\b[^>]*\bsrc=[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/const firebaseConfig = \{[\s\S]*?\};/, 'const firebaseConfig = {};')
    .replace(/try \{\s*firebase\.initializeApp\(firebaseConfig\);\s*firestoreDb = firebase\.firestore\(\);\s*\} catch\(e\) \{\}/,
      '// Firebase initialization disabled in disposable browser QA copy.');
  assert.equal(html.includes('firebase.initializeApp('), false);
  assert.equal(/<script\b[^>]*\bsrc=/i.test(html), false);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'franks-import-browser-'));
  fs.writeFileSync(path.join(tempDir, 'index.html'), html);
  // Fulfilled entirely by Playwright interception; no listening server or real
  // HTTP connection is needed, including for this disposable loopback origin.
  const origin = 'http://127.0.0.1:8765';
  let browser;
  try {
    const executablePath = process.env.QA_BROWSER || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
    browser = await chromium.launch({ executablePath, headless: true,
      proxy: { server: 'http://127.0.0.1:9', bypass: '127.0.0.1' },
      args: ['--disable-background-networking', '--disable-component-update', '--no-first-run'] });
    const context = await browser.newContext({ acceptDownloads: true, serviceWorkers: 'block' });
    const externalRequests = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.fulfill({
        status: 200, contentType: 'text/html; charset=utf-8',
        headers: { 'Content-Security-Policy': "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'; object-src 'none'; base-uri 'none'" }, body: html
      });
      externalRequests.push(route.request().url());
      return route.abort();
    });
    await context.addInitScript(() => {
      window.qaWrites = [];
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function(key, value) {
        window.qaWrites.push(key);
        return originalSetItem.call(this, key, value);
      };
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.evaluate(() => {
      window.qaPersistCalls = 0;
      const originalPersist = persist;
      persist = function() { window.qaPersistCalls++; return originalPersist(); };
      window.qaConfirmStates = [];
      const originalConfirm = window.confirm;
      window.confirm = function(message) {
        window.qaConfirmStates.push({ calls: window.qaPersistCalls, writes: window.qaWrites.length });
        return originalConfirm(message);
      };
    });
    const current = duplicateLibrary();
    current.objects = [{ id: 'synthetic-browser-current', name: 'Current synthetic browser record' }];
    await page.evaluate(library => { db = library; ensureDbStructure(); renderIndexPage(); }, current);
    const before = await page.evaluate(() => JSON.stringify(db));
    const dialogs = [];
    let answers = [];
    await page.evaluate(() => {
      window.qaImportFinished = false;
      const originalRead = FileReader.prototype.readAsText;
      FileReader.prototype.readAsText = function(file) {
        this.addEventListener('loadend', () => { window.qaImportFinished = true; });
        return originalRead.call(this, file);
      };
    });
    page.on('dialog', async dialog => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      if (dialog.type() === 'confirm') {
        assert.ok(answers.length, 'Every confirmation must have an explicit test answer');
        if (answers.shift()) await dialog.accept(); else await dialog.dismiss();
      } else await dialog.accept();
    });
    async function select(library, decisions, name = 'synthetic-backup.json') {
      answers = [...decisions];
      await page.evaluate(() => { window.qaImportFinished = false; });
      await page.locator('#import-file-input').setInputFiles({ name, mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(library)) });
      await page.waitForFunction(() => window.qaImportFinished && document.getElementById('import-file-input').value === '');
      assert.equal(answers.length, 0);
    }
    await select({ objects: [{ id: 'synthetic-bad', name: 7 }] }, []);
    assert.match(dialogs.at(-1).message, /objects\[0\]\.name/);
    assert.equal(await page.evaluate(() => JSON.stringify(db)), before);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 0);
    assert.equal(await page.evaluate(() => window.qaWrites.length), 0);
    const incoming = duplicateLibrary();
    const downloadEvent = page.waitForEvent('download');
    await select(incoming, [true, false]);
    const download = await downloadEvent;
    const downloaded = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
    assert.deepEqual(downloaded.objects, current.objects);
    assert.equal(await page.evaluate(() => JSON.stringify(db)), before);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 0);
    assert.equal(await page.evaluate(() => window.qaWrites.length), 0);
    assert.ok(dialogs.some(dialog => /kan inte verifieras/.test(dialog.message)));
    // Same filename selected again, now explicitly approved.
    await select(incoming, [false, true]);
    assert.deepEqual(await page.evaluate(() => db.objects), incoming.objects);
    assert.equal(await page.evaluate(() => window.qaPersistCalls), 1);
    assert.equal(await page.evaluate(() => window.qaWrites.length), 1);
    await page.locator('a[href="#herb/synthetic-first"]').first().click();
    await page.waitForURL('**/#herb/synthetic-first');
    assert.ok((await page.locator('#wiki-app').innerText()).includes('Sample Leaf'));
    assert.ok((await page.evaluate(() => window.qaConfirmStates)).every(state => state.calls === 0 && state.writes === 0));
    // Existing C in BOTH libraries avoids the unrelated auto-create-and-save
    // behavior of visiting a category absent from the current library.
    await page.evaluate(previous => {
      db = previous;
      ensureDbStructure();
      window.location.hash = '#category/C';
      handleRouting();
    }, previousCategoryLibrary());
    await page.waitForURL('**/#category/C');
    await page.waitForFunction(() => document.getElementById('wiki-app').innerText.includes('Previous synthetic category'));
    const categoryBefore = await page.evaluate(() => JSON.stringify(db));
    const writesBeforeFailure = await page.evaluate(() => ({ calls: window.qaPersistCalls, writes: window.qaWrites.length }));
    await select(categoryFailureLibrary(), [false, true], 'synthetic-category-failure.json');
    assert.equal(await page.evaluate(() => JSON.stringify(db)), categoryBefore);
    assert.deepEqual(await page.evaluate(() => ({ calls: window.qaPersistCalls, writes: window.qaWrites.length })), writesBeforeFailure);
    assert.match(dialogs.at(-1).message, /misslyckades/);
    assert.doesNotMatch(dialogs.at(-1).message, /har ersatts/);
    assert.ok((await page.locator('#wiki-app').innerText()).includes('Previous synthetic category'));
    // Normal navigation still falls back for the very same failing category.
    await page.evaluate(incoming => { db = incoming; ensureDbStructure(); }, categoryFailureLibrary());
    await page.evaluate(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    assert.ok((await page.locator('#wiki-app').innerText()).includes('Alfabetisk'));
    assert.deepEqual(await page.evaluate(() => ({ calls: window.qaPersistCalls, writes: window.qaWrites.length })), writesBeforeFailure);
    assert.deepEqual(await page.evaluate(() => ({ firebase: typeof firebase, ready: isCloudReady, db: firestoreDb })), { firebase: 'undefined', ready: false, db: null });
    assert.deepEqual(errors, []);
    assert.deepEqual(externalRequests, []);
    await page.screenshot({ path: path.join(tempDir, 'synthetic-import-result.png'), fullPage: true });
    console.log(JSON.stringify({ status: 'PASS', browser: await browser.version(), executablePath,
      syntheticScenarios: ['numeric-name rejection', 'backup export and cancellation', 'same-file reselection', 'confirmed import', 'index and object rendering', 'actual category-route failure rollback', 'normal hashchange fallback'],
      persistCalls: 1, libraryStorageWrites: 1, uncaughtErrors: errors, externalRequests,
      isolation: 'loopback only; stripped SDK/config/init; CSP connect-src none; blocked egress proxy; new browser context; service workers blocked',
      disposableCopy: tempDir, screenshot: path.join(tempDir, 'synthetic-import-result.png') }, null, 2));
    await context.close();
  } finally {
    if (browser) await browser.close();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
