# TASK 006: property detail security

Baseline main: `e8149e82047b7181877c1b2256b8f34468d41b5e`.

## Scope

Property detail now reuses `escapeCoreText`, `coreAction`, and `bindCoreActions`.
Every library-supplied text interpolation is encoded: property name/summary/
description, category/system, herbs, related-property names/categories, study
names/types, and source author/year/title/page references. Long text and Unicode
remain complete. The application-owned SVG edit icon remains trusted markup;
the wrapping DOM listener carries escaped JSON arguments, not executable text.
Herb links use `#herb-id/<encoded-id>`. The router and legacy `#herb/` behavior
are unchanged.

Six fixed dispatcher cases connect existing rename/summary/connect/related/source
actions. Delete and description editing reuse existing dispatcher cases. All
underlying mutation, relationship and persistence functions remain unchanged.

The existing source-pages functions referenced three missing DOM IDs on the
baseline. This task adds their minimal static modal markup so the explicitly
required source editing actions work. Title display uses the existing `innerText`
assignment and pages use the existing input `.value`. Save/remove/cancel buttons
call fixed application functions; no library data enters their handlers. There
are no new length limits, sanitization, normalization, schema changes, or record
migrations. Existing save-input trimming and existing duplicate-tag behavior are
preserved; rendering does not rewrite data.

## Node validation

Node.js `v24.12.0`, no dependencies/install:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs tests/property-rendering.test.cjs
```

Both passed: **47 pass, 0 fail, 0 TODO, 0 skipped/cancelled**. The new three tests
execute actual source rendering/dispatcher functions, checking adversarial text
in all protected fields, numeric legacy years, complete descriptions, canonical
collision links, JSON-value equivalence, original action arguments, relationships,
source tags/pages, and zero render-time persistence. The single trusted SVG is
distinguished from injected SVG. Node uses a minimal DOM; the browser provides
the real parsing/event checks below.

TASK 005's property-link test and core browser assertions now expect canonical
links because property detail is newly protected. Their routing and preservation
assertions remain. All TASK 002–004 test code/fixtures and the import browser test
remain unchanged.

## Isolated browser validation

Environment-provided Playwright, headless Chrome `155.0.8059.84`:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-property-rendering.cjs
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

All three exited 0 and reported PASS. No packages installed. The dedicated property
test removes Firebase SDK tags, configuration values and initialization before
startup, asserts removal, then serves the disposable copy entirely through
loopback-origin request interception. All external requests are aborted; CSP
blocks networking but permits inline scripts/events. A dead egress proxy, fresh
browser profile/context, blocked service workers and disabled background network
features provide additional isolation. Assertions confirm no Firebase global,
null cloud connection and cloud-ready false. No production site/data is used.

Property scenarios exercise real functions and clicks:

- Complete adversarial text display with one trusted SVG, no injected nodes or
  executable attributes, and no rendering writes.
- Rename/delete/summary/connect/related/add-source cancellation; description modal
  values and exact target property preserved; JSON-equivalent library afterward.
- Click the trusted SVG: exact property/source/page arguments and safe modal text.
- Canonical links distinguish `item%20name` and `item name`; actual editor/delete
  controls receive correct IDs. Delete dialogs are cancelled.
- Related-property and category links open correct protected destinations.
- Save pages: exactly one selected tag's pages changes and one local save occurs.
- Remove source association: only matching property tags disappear, source identity
  and unrelated system reference survive, with one local save.
- Add source by its existing title through the actual prompt: exact source identity
  retained and expected property tag appended; no other data changes.
- Recreate a two-way relation from both empty arrays and connect an unlinked herb;
  each action is checked against an exact expected library, with one save.

All changes occur only on disposable synthetic copies. Final reset checks zero
render/cancel writes. **Zero successful payload executions, injected SVG/nodes,
uncaught page errors, external page requests, or unexpected persistence calls.**
The only SVG allowed is the exact trusted viewBox/path icon used by the application.
Inline execution is permitted, so the test does not rely on CSP to suppress XSS.

Local evidence directories for the successful run:
`C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-g7TYCC` (property),
`C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-cqq4OX` (core), and
`C:\Users\veija\AppData\Local\Temp\franks-import-browser-tRvp3e` (import).
Sanitized HTML/screenshots contain only synthetic content and are not committed.
An initial property-browser run failed an expected-library comparison because the
fixture lacked the existing fallback-system defaults added by persist. The fixture
now includes those established defaults; application defaults were not changed.

## Limits and remaining risks

This is developer-run browser QA, pending independent review. Native OS prompts
are automated. Actual cloud writes, authorization and asynchronous conflict/rollback
behavior are not integration-tested. Existing rename/delete relationship cleanup
limitations and source duplicate-tag semantics are preserved, not redesigned.

Still unsafe and recommended next: `renderSystemPage`, `renderSysStudyList`,
`renderSysSourceList`; then `renderSearchPage`/`handleSearchPropInput`,
`renderGlossaryPage`; then formula/source-library/trash renderers. Their links may
still reach unsafe sinks; the whole application is not XSS-safe. Missing verified
server-side write authorization remains a separate high-priority risk. No Firebase,
security rules, synchronization, schema, authentication or import changes.

Merging main automatically deploys GitHub Pages. Stop for independent QA; do not
merge, deploy, enable auto-merge, or start TASK 007.
