# TASK 005: scoped rendering security

Baseline: `62b678e2f792ee304a4993bebdcb5c2f8b8d646a` on main.

## Change and boundaries

`escapeCoreText` encodes `& < > " '` when library values enter HTML text or
quoted attributes. It does not modify database records. Trusted locally generated
fragments remain markup; values inside them are escaped at their generation site.
This is not HTML sanitization or support for user-supplied rich HTML.

`coreAction` stores escaped JSON arguments in data attributes. `bindCoreActions`
uses DOM listeners and a fixed switch of action names; library content is never
evaluated as JavaScript. Dynamic inline handlers are removed from the four scoped
surfaces. Static application-owned handlers (for example index view selectors and
alphabet letters) remain. Arguments containing quotes, apostrophes, angle brackets,
Unicode, and script-like content reach the existing functions as their original
values.

New object links use `#herb-id/<encoded-id>`; that route decodes exactly once.
Legacy `#herb/<raw-id>` routes retain the original literal component behavior.
The decoded-first resolver is removed; neither route guesses between records.
For example `#herb/item%20name` identifies ID `item%20name`, while
`#herb-id/item%20name` identifies ID `item name`, and
`#herb-id/item%2520name` identifies ID `item%20name`.
Canonical missing, malformed-percent, and extra-component values fall back through
normal routing without selecting an object (strict import routing propagates the
error). Unknown valid IDs render the existing not-found UI. This supports slashes,
percent signs, quotes and Unicode without changing stored identity.
The linked property checklist escapes names because it is opened directly from
object detail controls. Its checkbox state and assignment logic are unchanged.

No Firebase configuration, synchronization, import/export, schema, stored records,
relationship mechanics, grouping logic, permissions, or lifecycle changes. The
existing missing-category navigation write remains; preservation assertions use
already-existing categories. Existing dictionary/grouping inherited-key bugs are
outside scope. Existing raw links on unrelated pages are unchanged. Their original
URL limitations remain: raw spaces are normalized by browsers and raw slashes
are interpreted by the old route parser. Newly generated canonical links avoid
those limitations; legacy routes are not retroactively reinterpreted.

## Automated validation

Node.js `v24.12.0`, repository root, no installation:

```sh
node --test tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs
node --permission --allow-fs-read=. --test --test-isolation=none tests/legacy-preservation.test.cjs tests/import-backup.test.cjs tests/core-rendering.test.cjs
```

Both pass: **44 passed, 0 failed, 0 TODO, 0 skipped/cancelled** (34 prior tests plus
10 rendering/navigation tests). Actual source functions are extracted into an isolated VM;
there is no substitute rendering implementation. Synthetic fixtures cover SVG
event payloads, script tags, attribute breakouts, JS-like IDs, quoted categories,
property/subcategory/system names, arbitrary metadata, long descriptions and
Unicode. Generated HTML contains escaped text and encoded links; source data is
deep-compared unchanged. Collision tests execute the real router, property/index/
category renderers and both link representations, rather than a standalone
resolver. Four identity tests replace the former single resolver test. The prior
duplicate-rendering test only updates its two expected hrefs to the new namespace;
the existing import browser script similarly updates the generated link selector.
Browser checks below establish actual DOM behavior.

The existing import harness alone needs a compatibility adjustment: extract the
new rendering/route helpers and add empty `querySelectorAll` to its minimal DOM.
This lets the same import tests exercise the updated actual renderers. No prior
assertions, persistence algorithms, or preservation fixtures were changed.

## Chrome QA

Use existing environment-provided Playwright (no new repository dependency):

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\Digital GM\node_modules\playwright'
node tests/browser-core-rendering.cjs
node tests/browser-import-smoke.cjs
```

Both passed on headless Chrome `155.0.8059.84`. The new security test verifies all
four surfaces, both index views, the assignment checklist, encoded object/category
navigation, safe search selection, view selectors, original editor values, and
rename/delete/create-property cancellation. Ordinary Unicode records and long
descriptions are tested alongside adversarial records. **Zero injected elements,
zero successful payload executions, zero uncaught page errors, zero external page
requests, and unchanged stored data** on tested rendering paths. The security smoke
also exercises actual unchanged property-page links for literal-percent IDs, new
canonical links for both colliding IDs and quotes/slashes/percent/Unicode, search
selection, category/native-system links, direct bookmarks and real hashchange
events. Editor and cancelled deletion controls are checked against each selected
object's exact ID. Malformed/missing routes do not select the empty-ID decoy or
another existing record. Synthetic identity fixture metadata remains unchanged.

Before browser startup the disposable HTML copy removes all SDK script tags,
Firebase configuration values and initialization. A fresh disposable browser
profile/context uses a synthetic loopback origin fulfilled through interception;
every other page request is aborted. A dead loopback proxy, disabled background
networking, blocked service workers, and restrictive network CSP provide extra
isolation. Inline script/event execution remains permitted in CSP, so the test
does not rely on CSP to hide escaping failures. Assertions confirm no Firebase
global, a null cloud connection, and a false cloud-ready flag. Only synthetic
local data/storage is used; the live website and production Firebase are never
loaded.

Property/system destination security remains outside scope: the identity regression
uses the actual legacy property renderer with benign synthetic names solely to
verify its existing links. Adversarial property/system destination renderers are
not claimed secure. The scoped object/category controls are actually
clicked; edit/delete prompts are cancelled to verify argument preservation without
changing records. OS file-picker/save behavior and server authorization are not
covered by this rendering test.

During development the new browser script initially had a syntax typo, then a
timing assertion read the old heading after a hash change. Both were test-tool
issues: fixed quoting and an explicit wait for the destination heading. Final
commands above pass; no application workaround was added for those failures.
During identity correction, the first Node run had 43 pass/1 fail from an old href
assertion; it now expects the required canonical namespace. An initial browser
check expected an old raw-space link to preserve spaces, but browsers normalize
that legacy href. The test now verifies literal-percent legacy links and uses
canonical links for space IDs. No baseline legacy behavior was changed to make
that expectation pass.

Final local browser evidence directories:
`C:\Users\veija\AppData\Local\Temp\franks-rendering-browser-PNu0VY` and
`C:\Users\veija\AppData\Local\Temp\franks-import-browser-8B6Bj0`.
Both contain sanitized disposable HTML and screenshots; no production data.

## Remaining unsafe sinks: recommended next steps

1. `renderPropertyPage`: raw names, summaries/descriptions, related properties,
   study/source values and data-bearing inline actions. This is directly reachable
   from protected object/category links and search suggestions.
2. `renderSystemPage`, `renderSysStudyList`, `renderSysSourceList`: system content,
   study/source fields, IDs and checkbox inline actions. Also directly reachable.
3. `renderSearchPage`, `handleSearchPropInput`: filter results/suggestions and
   data-bearing actions. Global header search is fixed; this separate filter UI is
   not.
4. `renderGlossaryPage`: editable input value attributes and blur handlers with
   botanical names/IDs.
5. `renderFormulasIndexPage`, `renderFormulaDetailPage`,
   `renderSourcesLibraryPage`, `renderTrashPage`: raw record fields, IDs and
   associated actions.

Opening an unprotected destination may still execute stored markup. The whole
application is NOT XSS-safe. Secure these remaining surfaces in separate reviewed
tasks. Missing verified server-side write authorization remains an independent
high-priority risk; no authentication or Firestore-rule change was attempted.

Merge to main automatically publishes through GitHub Pages. This branch must
remain unmerged and undeployed until independent QA and explicit owner approval.
