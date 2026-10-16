# TASK 008: filter search and property suggestions

Verified baseline main: `38ac40fceee333a704c999b3b628fef83da7bb93`.

## Change and preservation

Filter chips, suggestions, category labels, result names and study types now use
escapeCoreText at rendering time. Suggestion/remove/add/reset controls use fixed
coreAction/bindCoreActions dispatch with escaped JSON arguments. Input and keydown
handlers are DOM-bound. No library value becomes executable JavaScript.

Ordinary object result links use #herb-id/<encodeURIComponent(id)>. Study URLs retain
the existing #study/<raw-id> shape but the entire attribute is escaped. The existing
router has no study branch; clicking such a result falls back to the index. No new
page/route or redirection to a herb was introduced.

Matching, percentages, descending stable sort, six-suggestion cap, property casing,
selection/deduplication, remove/reset and alert behavior are unchanged. There is no
stored-data sanitization, truncation, normalization or migration. The original
getDisplayObjName trims display whitespace; the original full long names remain
stored unchanged. The only application changes are renderSearchPage,
handleSearchPropInput and four fixed cases in bindCoreActions. All other scoped
selection/key/remove/reset functions were reviewed and retained unchanged.

## Node validation

Node.js **v24.12.0**. Exact commands, both exit 0:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs tests/filter-search.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs tests/system-rendering.test.cjs tests/filter-search.test.cjs
```

Each: **73 passed, 0 failed, 0 TODO, 0 skipped/cancelled** (65 baseline + 8 new).
Actual application functions are extracted into a VM with string/Wasm code
generation disabled and a minimal DOM. No service APIs or real storage are exposed.
A persist stub throws if called. Tests assert exact filter arrays, 100/50 and rounded
67/33 percentages, match numerators/denominators, result order, canonical collision
links, safe raw study href, long Unicode text, adversarial fields, near-duplicate
properties, Enter/add/button dispatch, exact removal/reset, suggestion limits,
selected-property exclusion, and empty/no-result/error paths. Full library equality
and zero writes are asserted; the limit test deliberately extends only its synthetic
fixture before checking the application does not change it.

## Isolated browser validation

Environment-provided Playwright; Chrome **155.0.8059.84**. All exit 0 / PASS:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-filter-search.cjs
node tests/browser-system-rendering.cjs
node tests/browser-property-rendering.cjs
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

New filter script uses actual typing, suggestion clicks, Enter, add/remove/reset,
result links and real hashchange navigation. Exact active arrays and complete library
snapshots are checked. Cases include:

- Safe readable adversarial suggestions/categories/chips/results/type labels; no
  injected elements or executable attributes on the filter page.
- Case-insensitive Enter, repeated selection without duplicate filters, similar
  names remaining independent, and exact chip removal.
- Four results ordered 100,100,50,50 with counts 2/2,2/2,1/2,1/2; full long text.
- Actual links for item%20name, item name and a quote/slash/percent/Unicode/script-like
  ID open their original records. Description editor and delete controls receive
  exact original IDs; editor is closed and delete confirmation dismissed.
- Study link remains safely in #study/ and falls back to index without opening a
  herb. This is evidence of an existing missing route, not working study navigation.
- Filter reset, unknown-property alert, empty input and no-result message.

The complete stored library remains JSON-identical throughout. **0 persistence
calls, 0 storage writes, 0 payload executions, 0 injected elements, 0 uncaught page
errors, 0 external requests** in the filter test. Other scripts retain their exact
expected intentional synthetic writes and report zero unexpected writes.

The initial test implementation needed the existing indexNameDisplayMode VM global,
actual editor/delete control conventions, and waits for completed hashchange
rendering. Assertions also account for pre-existing display-name trimming and
fixed application-owned handlers on unrelated object/index pages. The filter
surface itself has no inline event attributes. No application changes were made
to resolve these harness assumptions.

## Isolation evidence and remaining limits

All five scripts strip Firebase SDK/configuration/initialization and assert removal
before browser startup. HTML is fulfilled entirely through intercepted loopback
requests; every external request aborts. Dead outbound proxy, disabled background
networking, blocked service workers, CSP connect-src none and disposable browser
profile/context/storage supplement isolation. Inline script/event execution remains
permitted for XSS testing. Only synthetic records are used. No production website,
Firestore, credentials or real library data are accessed; no dependency installed.

Latest successful temporary evidence directories (not committed):

- Filter: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-WAPm00`
- System: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-3yBjxZ`
- Property: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-0tAX3B`
- Core: `C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-wmiN6N`
- Import: `C:\Users\veija\AppData\Local\Temp\franks-import-browser-8XPXpb`

Developer validation awaits independent QA. Native dialogs are automated. No cloud
persistence, server authorization or asynchronous synchronization integration is
claimed. Existing case-insensitive typed property lookup chooses the first matching
key if names differ only by case; this behavior is preserved. Study detail routing
remains missing. Glossary, formula, general source-library and trash surfaces remain
unsafe/out of scope; the whole application is not XSS-safe.

No global header search, property/detail, system associations, Firebase, import/export,
schema or unrelated surface changes. Merging main automatically publishes GitHub
Pages. Do not merge, auto-merge, deploy or start TASK 009.

**READY FOR INDEPENDENT QA — NOT MERGED.**
