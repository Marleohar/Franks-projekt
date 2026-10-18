# TASK 019 — Formula component display and description editing

**READY FOR INDEPENDENT QA — NOT MERGED.**

Verified unchanged main: `6e3e70bab9d7a3149a97d1d0f1a1d428d4236587`.
Implementation/test commit: `7c4f0d2cc379edcd6c27998ee6ab278194ebda52`.
Branch: `task-019-formula-display`.
The following report-only commit supplies this document. The exact final PR HEAD is recorded in the PR body and delivery, avoiding a self-referential document hash. Independent QA must pin that final HEAD.

## Historical comparison and baseline evidence

TASK017-AUDIT.md was read before implementation. The working formula profile at `7184273ccc46e300bed0c557c39f4fa55e299bd5` was inspected directly from Git: component rows resolve c.objId against object IDs and show role, quantity/unit and a formula description editor. That historical implementation also includes unsafe interpolated handlers, editing/removal controls and calculations using `(c.qty || 1)`. Those parts were not copied. The audit identifies `414aef2630801f00428e7c6aa19069bc7ec2b298` as the persistent simplification that removed the display/editor entry.

A fresh isolated Chromium reproduction against exact current main confirms nine stored component rows remain in the graph while the formula detail view renders neither their contents nor a visible description action. Reading that profile leaves the full graph identical with **0 persist / 0 localStorage / 0 mocked-cloud writes**.

Evidence under `C:\dev\Franks projekt\Ort-Wiki\task-019\evidence`:

- `formula-baseline.json`: immutable baseline, complete before/after graphs, zero counters and missing-feature findings.
- `formula-baseline.txt`: REPRODUCED, zero page errors/external requests.
- `formula-baseline-missing-ui.png`: original hidden-component profile.
- Reproduction driver: sibling `qa-preparation/reproduce-baseline.cjs`, which reads main from Git objects and disables Firebase before startup.

## Restored behavior

Formula profiles now display an escaped, read-only component list: exact object-ID-resolved profile link/name, role, quantity and unit. Duplicate visible names remain distinct by ID; literal percent IDs are encoded exactly once. Number 0 and string `0.00` retain their displayed values. Role/unit text is not mapped, calculated or converted.

Missing references display an unavailable label without a link or graph repair. Missing IDs and primitive/array/incomplete rows display safe missing-reference/field placeholders. Empty arrays have an empty-state message; absent/non-array legacy component collections have an unsupported-data message. No records/fields are discarded or rewritten. Objects with nested-formula-looking metadata remain uninterpreted; no nested formula traversal occurs. Unencodable legacy object IDs remain unavailable rather than breaking rendering.

The visible **Redigera beskrivning / Edit description** button opens the existing textarea for the exact own formula key. Formula-only drafts capture the library/map/record, route, component array/row identities and a full structured snapshot. Before any mutation, Save checks these against current state and preflights the description slot. Changed/replaced/deleted/stale contexts and non-writable slots reject without a save. This is deliberately conservative: another in-place library change also invalidates an open formula draft.

A real approved change updates only desc and calls **persist(true) once**, bypassing unrelated initialization/normalization. The formula record, component array/rows and unknown metadata remain intact. Missing desc is added only on explicit real change. Unchanged input preserves original whitespace, missing fields and even unsupported legacy non-text description values rather than silently converting them. Changed text retains the existing trim-on-save convention.

Cancel, backdrop cancellation, Escape, unchanged Save, repeated Save and retained callbacks write nothing. Save callbacks are bound to a particular draft; an old callback cannot consume a later draft. Detached/stale profile actions reject. The existing modal focus framework is reused, adding textarea to its focusable selector. Focus enters the textarea, stays inside the modal, and returns to the initiating/newly rendered button. Other profile editors retain their existing save branches; an actual herb edit after closing the formula editor is tested.

No component creation, role/quantity/unit editing, removal, calculations, conversions, nested interpretation, general source/study editing or category/relationship change was added. No schema migration is required.

## Explicit existing-test change

The old browser-formula-rendering assertion intentionally characterized the missing UI by requiring no editor action, then invoking openEditor programmatically. It now requires one visible formulaEditor button and clicks it. Its exact key, existing text, Save, graph, creation/deletion, security and write-count assertions remain intact. Its persist spy now forwards arguments so it observes the real preserveStructure flag.

The Node harness adds dependencies for the actual display, snapshot and modal helpers, mutable db for stale-library probes and minimal DOM fixtures. Existing assertions remain. The controlled translation inventory adds nine paired Swedish/English keys.

## Actual validation

**451 Node tests PASS, 0 failures, 0 skipped**: all 414 previous tests plus 37 new formula cases. `node --test tests/*.test.cjs`; raw output `evidence/node.txt`.

**All 16 Chromium suites PASS**: category-links, core-rendering, direct-link, filter-search, formula-profile (new), formula-rendering, glossary-rendering, herb-assignment, import-smoke, localization, property-keys, property-rename, property-rendering, sources-trash, study-routing and system-rendering. Each was executed separately; raw logs are `evidence/browser-*.txt`.

TASK016 direct linking retains **119 checks / 24 stale cases**; property-key coverage retains **101 checks**. TASK018 non-destructive rename retains **76 checks**. TASK015 explicit empty-category membership and protected missing-category routes pass. Existing formula creation/deletion and exact routing/security assertions pass.

### New real-Chromium graph and counter evidence

`formula-profile-snapshots.json` contains **57 complete before/expected/actual comparisons**, independently counted from its records:

| persist / localStorage / mocked cloud | Checks |
|---|---:|
| 0 / 0 / 0 | 45 |
| 1 / 1 / 1 | 11 |
| 1 / 1 / 0 | 1 real reload |

The eleven successful operations comprise eight ordinary description edits, one sparse-description creation, one shared herb-editor regression and one real JSON import. These are logical saves, not eleven distinct formulas. **23 serialized local/cloud payload observations** also match the complete expected graphs.

Coverage includes zero/one/many rows; exact duplicate-name IDs; hostile names/roles/units; 0/string quantities; missing references; malformed/legacy rows and collections; unknown nested metadata; absent and legacy description data; Cancel/Escape/backdrop/unchanged input; stale library/map/formula/deletion/description/nested metadata/component identities/route; frozen and nonextensible record rejection; retained controls and old Save callbacks; real backup download, import and reload. Stale snapshots are taken after the concurrent synthetic change, ensuring that newer data is preserved rather than reverted.

Reload counters live in Node outside the browser page. The established beforeunload save is observed as 1 persist, 1 local write and 0 deferred cloud writes after document destruction. It is not a second description save. Export/import/reload preserves all component shapes, unknown fields and literal own __proto__ formula identity; no prototype mutation occurs.

Swedish and English were exercised at **1280, 375 and 320 px**, with mouse, native keyboard activation and emulated touch. Tab remains inside the modal; background focus attempts are redirected; Escape cancels; useful focus is restored after rerender. No horizontal overflow or stored-handler execution occurs. Six screenshots are `formula-profile-{sv,en}-{1280,375,320}.png`; narrow English was visually inspected. Long hostile formula titles still squeeze the inherited Delete label into a narrow column; the restored editor/list remain usable and no unrelated header redesign was included.

Final focused browser results report zero page errors and zero external requests. Full graph comparisons preserve TASK015 categoryLinks, herb/study property values, source/Trash records, taxonomies, IDs, record order and unknown metadata.

`git diff --check` PASS. Screenshot-writing suites did not leave tracked screenshot changes. `validation-manifest.json` records actual parsed suite results, counters and the implementation SHA.

## Changed files

- index.html
- tests/formula-rendering.test.cjs
- tests/browser-formula-rendering.cjs
- tests/browser-formula-profile.cjs
- tests/fixtures/formula-profile-library.cjs
- tests/ui-localization-inventory.json
- TASK019-QA.md

## Isolation, reproduction and independent review

Development: `C:\dev\Franks projekt\Ort-Wiki\task-019\development`.
Evidence/temp: sibling `evidence`, with TEMP/TMP set to `evidence\tmp` before browser startup.
QA preparation: sibling `qa-preparation`; independent QA should create its own disposable checkout and evidence directory, pinning final PR HEAD.

```powershell
$env:TEMP='C:\dev\Franks projekt\Ort-Wiki\task-019\evidence\tmp'
$env:TMP=$env:TEMP
$env:TASK_EVIDENCE='C:\dev\Franks projekt\Ort-Wiki\task-019\evidence'
$env:PLAYWRIGHT_MODULE='C:\dev\Digital GM\node_modules\playwright'
node --test tests/*.test.cjs
Get-ChildItem tests/browser-*.cjs | ForEach-Object { node $_.FullName }
git diff --check
git status -sb
```

Independent QA must substitute its own evidence/temp destinations to preserve developer evidence. Digital GM is only an external module dependency; it was never the cwd/output directory. StudyWiki and unrelated repositories were not altered. Browsers use disposable contexts with blocked external requests, disabled service workers and production Firebase SDK/configuration/initialization removed before startup. No production libraries or services were used.

Limitations: headless Chromium with simulated touch/viewports, not physical-device testing; mocked cloud calls do not establish live cloud durability or distributed transaction behavior. Preservation targets JSON-compatible library records; no new serializer policy was introduced. This is developer validation, not independent approval. Broader formula editing and unrelated recovery tasks remain deferred.

**READY FOR INDEPENDENT QA — NOT MERGED.**
