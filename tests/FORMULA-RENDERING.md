# TASK 010: formula rendering security

Verified main baseline: `097f27f7165efaf0e8c852c17d80621242ba6f1a`.

## Scope

Formula archive names, detail headings and descriptions are escaped at rendering
time using escapeCoreText. Existing #formula/<encodeURIComponent(name)> links and
router decoding are unchanged. Creation and deletion controls use fixed coreAction
and bindCoreActions dispatch, preserving original formula keys as JSON arguments.
No library content is evaluated as JavaScript.

Component counts now use array length only; null records, missing components,
string components and array-like objects with hostile length fields display zero.
Normal arrays retain their exact count and Object.entries order is unchanged.
This is a render-only fallback for malformed data, not schema validation, import
acceptance, cleanup or record rewriting. Malformed fixtures deliberately represent
existing in-memory data and are not claims of valid import format.

Application differences are restricted to renderFormulasIndexPage,
renderFormulaDetailPage and two fixed dispatcher cases. promptCreateFormula,
deleteFormula, openEditor/saveDescription, routing and all unrelated application
bytes are unchanged. No dependencies added.

## Node validation

Node.js **v24.12.0**; both exact commands exited 0:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs tests/filter-search.test.cjs tests/glossary-rendering.test.cjs tests/formula-rendering.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs tests/filter-search.test.cjs tests/glossary-rendering.test.cjs tests/formula-rendering.test.cjs
```

Each: **92 passed, 0 failed, 0 TODO, 0 skipped/cancelled** (83 prior + 9 new).
Tests extract actual application functions into a restricted VM/minimal DOM, with
string/Wasm code generation disabled, synthetic library data and mocked persistence.
The actual router and shared editor branches execute. The single-line delete
function is extracted as its actual complete source line, not rewritten.

Coverage includes adversarial names/descriptions, literal &amp;/&#39; strings, long
Unicode text, counts/order/malformed metadata, missing/empty archive/detail states,
exact percent/space formula keys, dispatch, cancelled/blank/existing/new creation,
cancelled/confirmed deletion, editor open/close/save, complete-library snapshots,
exact write counts and inherited reserved-key behavior.

## Isolated Chrome validation

Environment-provided Playwright; Chrome **155.0.8059.84**. All seven exit 0 / PASS:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-formula-rendering.cjs
node tests/browser-glossary-rendering.cjs
node tests/browser-filter-search.cjs
node tests/browser-system-rendering.cjs
node tests/browser-property-rendering.cjs
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

The formula script clicks actual archive links for Formula%20name, Formula name,
and a name containing quotes, apostrophe, slash, percent, Unicode, literal entities
and an HTML event payload. It checks exact routes, full descriptions and original
delete arguments, dismissing each confirmation. Actual confirmations then remove
one synthetic formula only, with one persist/localStorage write. Unrelated formulas,
objects, unknown metadata and references remain exactly unchanged.

Real prompts test cancel, blank, existing-name navigation without overwrite/write,
and a successful new adversarial name with exact {desc:'', components:[]} shape.
Creation saves once and navigates to its exact encoded key. Rendering/navigation/
cancellation make zero writes. Missing formula and empty-description placeholders
are verified. Numeric component counts are 1,0,2,0,0,0,0 in original fixture order.

No formula detail editor opener exists in the baseline or updated UI. No new opener
was added. The browser explicitly invokes the existing openEditor('formula', name)
entry point while on that formula's detail route, verifies original key and complete
text, then uses the actual modal Save button. Only that formula's description
changes, with one additional write. This is compatibility coverage, not proof of
a user-reachable formula edit control.

Formula results: **0 payload executions, 0 injected elements, 0 uncaught page errors,
0 external requests, 0 unexpected writes**. Separate reset scenarios: confirmed
deletion = 1 intentional write; creation plus editor save = 2 intentional writes.
The six prior scripts also pass with their expected synthetic mutations only.
Counts instrument persist entry/localStorage, not cloud service success.

## Isolation and evidence

All seven scripts strip Firebase SDK/configuration/initialization before browser
startup and assert removal. HTML is fulfilled through intercepted loopback requests;
all external requests abort. Dead egress proxy, blocked service workers, disabled
background networking and CSP connect-src none supplement isolation. Inline scripts
and event execution are permitted during XSS tests. Profiles/context/storage are
disposable and all records synthetic. No production GitHub Pages, Firestore, real
user data, credentials or paid services are accessed.

Latest successful local evidence (temporary, not committed):

- Formula: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-nHOyKo`
- Glossary: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-NKrDV1`
- Filter: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-cEJjTb`
- System: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-3DGEAY`
- Property: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-00J0lg`
- Core: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-X8i2vs`
- Import: `C:\Users\veija\AppData\Local\Temp\franks-import-browser-kqnYEb`

## Preserved limitations

Reserved inherited object keys remain a pre-existing limitation: prompting for
constructor on a normal formulas object creates no own formula, performs no write,
and navigates to #formula/constructor because inherited values satisfy the existing
lookup. Similar prototype-key behavior is not redesigned; callers should not infer
new support for those names. No schema/prototype migration occurred.

The description editor is not opened by an existing formula detail control.
Creation and editor-save trimming, Date.now IDs elsewhere, delete-reference cleanup
semantics, and asynchronous synchronization remain unchanged. Native dialogs are
automated. Developer validation awaits independent QA. Server authorization and
cloud persistence/conflicts are not integration-tested. General source-library and
trash rendering remain unsafe; the whole application is not XSS-safe. Missing study
routing and glossary blur-triggered rerender limitations remain outside this task.

Merging main automatically deploys GitHub Pages. Do not merge, auto-merge, deploy
or begin TASK 011.

**READY FOR INDEPENDENT QA — NOT MERGED.**
